<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\TimetableEntry;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Calcul des bulletins. Les règles :
 *
 *  1. Toutes les matières de la classe figurent au bulletin : on part de la liste des matières, pas des notes,
 *     pour qu'une matière sans note ne disparaisse pas (voir classSubjects()).
 *  2. Une note manquante dépend du statut de l'élève à l'épreuve (Grade::$status) :
 *       - présent, note saisie                      → la note compte ;
 *       - absence non justifiée                     → 0, qui compte dans la moyenne ;
 *       - absence justifiée                         → l'épreuve est ignorée : la moyenne se fait sur les notes qu'il a ;
 *       - pas de note du tout, sans justification   → 0 (donc moyenne de la matière à 0 si c'est le cas partout).
 *     Une matière dont toutes les épreuves sont justifiées est « non évaluée » et sort de la moyenne générale,
 *     plutôt que de pénaliser l'élève par un 0 ; il en va de même d'une matière sans aucune épreuve publiée
 *     (il n'y a eu aucune absence possible : personne n'a rien à se reprocher). Les épreuves de rattrapage sont
 *     facultatives : elles ne comptent que pour qui y a une vraie note, jamais comme un 0.
 *  3. Moyenne d'une matière : moyenne des devoirs et note de composition à égalité, soit
 *     (devoirs + composition) ÷ 2, chaque catégorie pondérée par le coefficient de ses épreuves.
 *     Moyenne du semestre : Σ(moyenne matière × coefficient) ÷ Σ(coefficients des matières évaluées).
 *  4. Passage en classe supérieure : moyenne annuelle = (semestre 1 + semestre 2) ÷ 2 (voir annualAverage()),
 *     comparée au seuil du niveau de la classe, 10/20 par défaut (voir passAverageFor()).
 */
class ReportCardCalculator
{
    /** Seuil de passage (sur 20) quand le niveau de la classe n'en fixe pas : « 10/20 en général ». */
    public const DEFAULT_PASS_AVERAGE = 10.0;

    /** État d'une ligne de matière au bulletin. */
    public const ROW_EVALUATED = 'evaluated';

    public const ROW_JUSTIFIED = 'absence_justifiee';

    public const ROW_NO_EVALUATION = 'no_evaluation';

    /**
     * Appréciation à l'échelle sénégalaise pour la MOY/20 d'une matière.
     */
    public function appreciationFor(?float $moy20): ?string
    {
        if ($moy20 === null) {
            return null;
        }

        foreach (config('eeht.appreciation_scale') as $threshold => $label) {
            if ($moy20 >= $threshold) {
                return $label;
            }
        }

        return null;
    }

    /**
     * Mention du conseil de classe suggérée automatiquement à partir de la moyenne générale. Le « blâme »
     * n'est jamais suggéré automatiquement — il reflète la conduite, pas les notes.
     */
    public function mentionFor(?float $average): ?string
    {
        if ($average === null) {
            return null;
        }

        foreach (config('eeht.mention_scale') as $threshold => $mention) {
            if ($average >= $threshold) {
                return $mention;
            }
        }

        return $average < 10 ? 'avertissement' : null;
    }

    public function decisionFor(?float $average, float $threshold = self::DEFAULT_PASS_AVERAGE): string
    {
        if ($average === null) {
            return 'non_defini';
        }

        return $average >= $threshold ? 'admis' : 'redouble';
    }

    /** Seuil de passage de la classe : celui de son niveau de formation s'il en fixe un, sinon 10/20. */
    public function passAverageFor(SchoolClass $schoolClass): float
    {
        $minimum = $schoolClass->formationLevel?->min_average;

        return $minimum !== null ? (float) $minimum : self::DEFAULT_PASS_AVERAGE;
    }

    /**
     * Moyenne annuelle : moyenne des moyennes de semestre, (semestre 1 + semestre 2) ÷ 2. Un semestre sans moyenne
     * (rien n'a pu y être évalué) n'entre pas dans la division : on ne divise pas par un semestre qui n'existe pas.
     *
     * @param  array<int, float|null>  $termAverages
     */
    public function annualAverage(array $termAverages): ?float
    {
        $values = array_values(array_filter($termAverages, fn ($value) => $value !== null));

        return count($values) > 0 ? round(array_sum($values) / count($values), 2) : null;
    }

    /**
     * Les matières d'une classe : celles de sa formation, celles de son emploi du temps et celles de ses épreuves
     * (la classe n'a pas de liste de matières qui lui soit propre). Le bulletin part de cette liste, et non des
     * notes, pour qu'une matière sans note ne disparaisse pas.
     *
     * @return Collection<int, Subject> triées par nom, sans tenir compte des accents ni de la casse
     */
    private function classSubjects(int $schoolClassId): Collection
    {
        $formationId = SchoolClass::whereKey($schoolClassId)->value('formation_id');

        $ids = collect($formationId ? Subject::where('formation_id', $formationId)->pluck('id') : [])
            ->merge(TimetableEntry::where('school_class_id', $schoolClassId)->distinct()->pluck('subject_id'))
            ->merge(Exam::where('school_class_id', $schoolClassId)->distinct()->pluck('subject_id'))
            ->unique()
            ->values();

        return Subject::whereIn('id', $ids)->get()
            ->sortBy(fn (Subject $subject) => Str::lower(Str::ascii($subject->name)))
            ->values();
    }

    /**
     * Moyenne pondérée (par coefficient d'épreuve) des notes d'une catégorie d'épreuves pour un élève, ramenée sur
     * 20, ou null quand rien n'y compte pour lui (aucune épreuve, ou toutes justifiées).
     *
     * @param  Collection<int, Exam>  $exams
     * @param  Collection<int, Grade>  $gradesByExamId  les notes de l'élève, indexées par épreuve
     */
    private function categoryAverage(Collection $exams, Collection $gradesByExamId): ?float
    {
        $weightedSum = 0.0;
        $weightTotal = 0.0;

        foreach ($exams as $exam) {
            $grade = $gradesByExamId->get($exam->id);
            $status = $grade?->resolvedStatus() ?? Grade::PRESENT;

            // Absence justifiée : l'épreuve n'existe pas pour lui.
            if ($status === Grade::ABSENT_JUSTIFIED) {
                continue;
            }

            $score = $grade && $status === Grade::PRESENT && $grade->score !== null ? (float) $grade->score : null;

            // Un rattrapage n'est pas dû par tout le monde : sans vraie note, il n'existe pas pour l'élève.
            if ($score === null && $exam->session === 'rattrapage') {
                continue;
            }

            // Pas de note (ligne vide ou jamais saisie) ou absence non justifiée : 0, qui compte.
            $max = (float) $exam->max_score;
            $scoreOn20 = $score !== null && $max > 0 ? ($score / $max) * 20 : 0.0;

            $weightedSum += $scoreOn20 * (float) $exam->coefficient;
            $weightTotal += (float) $exam->coefficient;
        }

        return $weightTotal > 0 ? round($weightedSum / $weightTotal, 2) : null;
    }

    /**
     * Lignes matière par matière (Devoir / Composition / Moy20 / Coef / MoyX / appréciation) pour un élève : une
     * ligne pour chaque matière de la classe, avec ses épreuves publiées de la période et les notes de l'élève.
     * Une matière où rien ne compte pour lui a une moyenne nulle et un état qui dit pourquoi (`status`).
     *
     * @param  Collection<int, Subject>  $subjects
     * @param  Collection<int, Collection<int, Exam>>  $examsBySubject
     * @param  Collection<int, Grade>  $allGrades
     * @return array<int, array{subject_id:int, subject:string, coefficient:float, devoir:?float, composition:?float, moy20:?float, moyx:?float, appreciation:?string, evaluated:bool, status:string}>
     */
    private function computeSubjectRows(Student $student, Collection $subjects, Collection $examsBySubject, Collection $allGrades): array
    {
        $devoirTypes = config('eeht.exam_category_devoir');
        $compositionTypes = config('eeht.exam_category_composition');
        $studentGrades = $allGrades->where('student_id', $student->id)->keyBy('exam_id');

        $rows = [];

        foreach ($subjects as $subject) {
            $subjectExams = $examsBySubject->get($subject->id, collect());

            $devoir = $this->categoryAverage($subjectExams->whereIn('type', $devoirTypes), $studentGrades);
            $composition = $this->categoryAverage($subjectExams->whereIn('type', $compositionTypes), $studentGrades);

            $parts = array_values(array_filter([$devoir, $composition], fn ($v) => $v !== null));
            $moy20 = count($parts) > 0 ? round(array_sum($parts) / count($parts), 2) : null;
            $coefficient = (float) $subject->coefficient;

            $rows[] = [
                'subject_id' => $subject->id,
                'subject' => $subject->name,
                'coefficient' => $coefficient,
                'devoir' => $devoir,
                'composition' => $composition,
                'moy20' => $moy20,
                'moyx' => $moy20 !== null ? round($moy20 * $coefficient, 2) : null,
                'appreciation' => $this->appreciationFor($moy20),
                'evaluated' => $moy20 !== null,
                'status' => $moy20 !== null ? self::ROW_EVALUATED : $this->unevaluatedStatus($subjectExams),
            ];
        }

        return $rows;
    }

    /**
     * Pourquoi une matière n'a pas de moyenne : aucune épreuve due cette période (rien n'a été publié, ou seulement
     * des rattrapages), ou des épreuves dues mais toutes justifiées pour cet élève.
     *
     * @param  Collection<int, Exam>  $subjectExams
     */
    private function unevaluatedStatus(Collection $subjectExams): string
    {
        $due = $subjectExams->contains(fn (Exam $exam) => $exam->session !== 'rattrapage');

        return $due ? self::ROW_JUSTIFIED : self::ROW_NO_EVALUATION;
    }

    private function overallAverage(array $subjectRows): ?float
    {
        $weightedSum = 0;
        $weightTotal = 0;

        foreach ($subjectRows as $row) {
            if ($row['moy20'] !== null) {
                $weightedSum += $row['moy20'] * $row['coefficient'];
                $weightTotal += $row['coefficient'];
            }
        }

        return $weightTotal > 0 ? round($weightedSum / $weightTotal, 2) : null;
    }

    /**
     * Ce qu'il faut pour calculer une période : les matières de la classe, ses épreuves publiées groupées par matière
     * et les notes de ces épreuves (toutes, absences comprises : c'est le statut qui compte).
     *
     * @return array{0: Collection<int, Subject>, 1: Collection<int, Collection<int, Exam>>, 2: Collection<int, Grade>}
     */
    private function classContext(int $schoolClassId, int $academicYearId, string $term, ?Collection $studentIds = null): array
    {
        $exams = Exam::where('school_class_id', $schoolClassId)
            ->where('academic_year_id', $academicYearId)
            ->where('term', $term)
            ->where('is_published', true)
            ->get();

        $grades = Grade::whereIn('exam_id', $exams->pluck('id'))
            ->when($studentIds !== null, fn ($query) => $query->whereIn('student_id', $studentIds))
            ->get();

        return [$this->classSubjects($schoolClassId), $exams->groupBy('subject_id'), $grades];
    }

    /**
     * Détail complet du bulletin d'un élève : une ligne par matière de la classe (avec le rang dans la classe pour
     * chaque matière évaluée) + moyenne générale.
     *
     * @return array{subjects: array, overall: float|null}
     */
    public function computeDetailedForStudent(Student $student, int $schoolClassId, int $academicYearId, string $term): array
    {
        [$subjects, $examsBySubject, $allGrades] = $this->classContext($schoolClassId, $academicYearId, $term);

        // Les camarades du classement sont les élèves actifs de la classe (sans note ils comptent 0 : ils sont
        // classés derniers) et tous ceux qui ont une ligne de notes à ces épreuves — pas seulement l'effectif
        // *actuel*, qui exclurait silencieusement l'élève ciblé, et tout camarade, dès qu'il a été promu ou
        // transféré vers un autre school_class_id, ou que son statut n'est plus « actif ». Les notes et épreuves
        // sont un historique lié au school_class_id au moment de la création et ne bougent jamais : utiliser
        // l'effectif actuel seul était la cause d'un vrai bug où le bulletin de l'année précédente d'un élève
        // promu s'affichait avec toutes les matières vides.
        $classmateIds = Student::where('school_class_id', $schoolClassId)->where('status', 'actif')->pluck('id')
            ->merge($allGrades->pluck('student_id'))
            ->push($student->id)
            ->unique()
            ->values();
        $classStudents = Student::whereIn('id', $classmateIds)->get(['id']);

        $rowsByStudent = $classStudents->mapWithKeys(
            fn (Student $classmate) => [$classmate->id => $this->computeSubjectRows($classmate, $subjects, $examsBySubject, $allGrades)]
        );

        $targetRows = $rowsByStudent->get($student->id, []);

        foreach ($targetRows as &$row) {
            $ranking = $rowsByStudent
                ->map(fn ($rows) => collect($rows)->firstWhere('subject_id', $row['subject_id'])['moy20'] ?? null)
                ->filter(fn ($v) => $v !== null)
                ->sortDesc();

            $position = 0;
            $rank = null;
            foreach ($ranking as $studentId => $value) {
                $position++;
                if ($studentId === $student->id) {
                    $rank = $position;
                    break;
                }
            }

            $row['rank'] = $rank;
            $row['class_size'] = $ranking->count();
        }
        unset($row);

        return [
            'subjects' => $targetRows,
            'overall' => $this->overallAverage($targetRows),
        ];
    }

    /**
     * Alias rétrocompatible pour les appelants qui n'ont besoin que des moyennes par matière (et non de tout
     * le détail devoir/composition/rang).
     */
    public function computeForStudent(Student $student, int $schoolClassId, int $academicYearId, string $term): array
    {
        return $this->computeDetailedForStudent($student, $schoolClassId, $academicYearId, $term);
    }

    /**
     * Synthèse de l'accueil de l'espace élève/parent : moyennes par matière et moyenne générale sur toutes les
     * épreuves PUBLIÉES de la classe actuelle de l'élève (toutes périodes), avec les mêmes formules que les
     * bulletins. Sans classe, les listes sont vides et la moyenne est nulle ; une matière sans épreuve publiée
     * figure avec une moyenne nulle.
     *
     * @return array{subjects: array, overall: float|null}
     */
    public function summaryForStudent(Student $student): array
    {
        if (! $student->school_class_id) {
            return ['subjects' => [], 'overall' => null];
        }

        $exams = Exam::where('school_class_id', $student->school_class_id)
            ->where('is_published', true)
            ->get();

        $grades = Grade::whereIn('exam_id', $exams->pluck('id'))
            ->where('student_id', $student->id)
            ->get();

        $rows = $this->computeSubjectRows($student, $this->classSubjects($student->school_class_id), $exams->groupBy('subject_id'), $grades);

        return ['subjects' => $rows, 'overall' => $this->overallAverage($rows)];
    }

    /**
     * Totaux de présence (retards / absences / absences injustifiées) d'un élève sur la fenêtre de dates
     * approximative de la période donnée.
     */
    public function attendanceStatsForTerm(Student $student, AcademicYear $academicYear, string $term): array
    {
        $terms = config('eeht.terms');
        $index = array_search($term, $terms, true);

        if ($index === false || ! $academicYear->start_date || ! $academicYear->end_date) {
            return ['retard' => 0, 'absence' => 0, 'unjustified' => 0];
        }

        $totalDays = max(1, $academicYear->start_date->diffInDays($academicYear->end_date));
        $segment = intdiv($totalDays, count($terms));
        $from = $academicYear->start_date->copy()->addDays($segment * $index);
        $to = $index === count($terms) - 1
            ? $academicYear->end_date->copy()
            : $academicYear->start_date->copy()->addDays($segment * ($index + 1));

        $attendances = Attendance::where('student_id', $student->id)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->get();

        return [
            'retard' => $attendances->where('status', 'retard')->count(),
            'absence' => $attendances->whereIn('status', ['absent', 'absence_justifiee'])->count(),
            'unjustified' => $attendances->where('status', 'absent')->count(),
        ];
    }

    public function previousTermAverage(Student $student, int $academicYearId, string $term): ?float
    {
        $terms = config('eeht.terms');
        $index = array_search($term, $terms, true);

        if ($index === false || $index === 0) {
            return null;
        }

        $previous = ReportCard::where('student_id', $student->id)
            ->where('academic_year_id', $academicYearId)
            ->where('term', $terms[$index - 1])
            ->first();

        return $previous?->average !== null ? (float) $previous->average : null;
    }

    public function isFinalTerm(string $term): bool
    {
        $terms = config('eeht.terms');

        return $term === end($terms);
    }

    /**
     * Calcule les moyennes (+ rang dans la classe + moyenne de la classe) de chaque élève actif d'une classe
     * pour une période, afin de générer d'un coup un lot complet de bulletins.
     *
     * @return array<int, array{student: Student, average: float|null, rank: int|null, class_size: int, class_average: float|null}>
     */
    public function computeForClass(SchoolClass $schoolClass, int $academicYearId, string $term): array
    {
        $students = $schoolClass->students()->where('status', 'actif')->get();
        [$subjects, $examsBySubject, $allGrades] = $this->classContext($schoolClass->id, $academicYearId, $term, $students->pluck('id'));

        $results = $students->map(function (Student $student) use ($subjects, $examsBySubject, $allGrades) {
            $rows = $this->computeSubjectRows($student, $subjects, $examsBySubject, $allGrades);

            return [
                'student' => $student,
                'average' => $this->overallAverage($rows),
            ];
        });

        $ranked = $results->sortByDesc(fn ($r) => $r['average'] ?? -1)->values();
        $classSize = $ranked->count();
        $averages = $ranked->pluck('average')->filter(fn ($v) => $v !== null);
        $classAverage = $averages->isNotEmpty() ? round($averages->avg(), 2) : null;

        return $ranked->map(function ($r, $index) use ($classSize, $classAverage) {
            $r['rank'] = $r['average'] !== null ? $index + 1 : null;
            $r['class_size'] = $classSize;
            $r['class_average'] = $classAverage;

            return $r;
        })->all();
    }
}
