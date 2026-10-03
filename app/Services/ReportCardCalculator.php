<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Support\Collection;

class ReportCardCalculator
{
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

    public function decisionFor(?float $average): string
    {
        if ($average === null) {
            return 'non_defini';
        }

        return $average >= 10 ? 'admis' : 'redouble';
    }

    /**
     * Moyenne pondérée (par coefficient d'examen) des notes d'un ensemble d'examens pour un élève, ramenée
     * sur 20.
     */
    private function categoryAverage(Collection $exams, Collection $gradesByExamId): ?float
    {
        $weightedSum = 0;
        $weightTotal = 0;

        foreach ($exams as $exam) {
            $grade = $gradesByExamId->get($exam->id);
            if (! $grade) {
                continue;
            }

            $scoreOn20 = ((float) $grade->score / (float) $exam->max_score) * 20;
            $weightedSum += $scoreOn20 * (float) $exam->coefficient;
            $weightTotal += (float) $exam->coefficient;
        }

        return $weightTotal > 0 ? round($weightedSum / $weightTotal, 2) : null;
    }

    /**
     * Lignes matière par matière (Devoir / Composition / Moy20 / Coef / MoyX / appréciation) pour un élève, à
     * partir des examens de la classe (groupés par matière) et des notes concernées.
     *
     * @return array<int, array{subject_id:int, subject:string, coefficient:float, devoir:?float, composition:?float, moy20:?float, moyx:?float, appreciation:?string}>
     */
    private function computeSubjectRows(Student $student, Collection $examsBySubject, Collection $allGrades): array
    {
        $devoirTypes = config('eeht.exam_category_devoir');
        $compositionTypes = config('eeht.exam_category_composition');
        $studentGrades = $allGrades->where('student_id', $student->id)->keyBy('exam_id');

        $rows = [];

        foreach ($examsBySubject as $subjectId => $subjectExams) {
            $subject = $subjectExams->first()->subject;
            $devoirExams = $subjectExams->whereIn('type', $devoirTypes);
            $compositionExams = $subjectExams->whereIn('type', $compositionTypes);

            $devoir = $this->categoryAverage($devoirExams, $studentGrades);
            $composition = $this->categoryAverage($compositionExams, $studentGrades);

            $parts = array_values(array_filter([$devoir, $composition], fn ($v) => $v !== null));
            $moy20 = count($parts) > 0 ? round(array_sum($parts) / count($parts), 2) : null;

            $rows[] = [
                'subject_id' => $subjectId,
                'subject' => $subject->name,
                'coefficient' => (float) $subject->coefficient,
                'devoir' => $devoir,
                'composition' => $composition,
                'moy20' => $moy20,
                'moyx' => $moy20 !== null ? round($moy20 * (float) $subject->coefficient, 2) : null,
                'appreciation' => $this->appreciationFor($moy20),
            ];
        }

        return $rows;
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

    private function classExamsAndGrades(int $schoolClassId, int $academicYearId, string $term, ?Collection $studentIds = null): array
    {
        $exams = Exam::where('school_class_id', $schoolClassId)
            ->where('academic_year_id', $academicYearId)
            ->where('term', $term)
            ->where('is_published', true)
            ->with('subject')
            ->get();

        $gradesQuery = Grade::whereIn('exam_id', $exams->pluck('id'))
            ->where('is_absent', false)
            ->whereNotNull('score');

        if ($studentIds !== null) {
            $gradesQuery->whereIn('student_id', $studentIds);
        }

        return [$exams->groupBy('subject_id'), $gradesQuery->get()];
    }

    /**
     * Détail complet du bulletin d'un élève : lignes par matière (avec le rang dans la classe pour chaque
     * matière) + moyenne générale.
     *
     * @return array{subjects: array, overall: float|null}
     */
    public function computeDetailedForStudent(Student $student, int $schoolClassId, int $academicYearId, string $term): array
    {
        [$examsBySubject, $allGrades] = $this->classExamsAndGrades($schoolClassId, $academicYearId, $term);

        // Les camarades servant au classement sont déduits de ceux qui ont réellement une note pour ces
        // examens — et non de l'effectif *actuel* de la classe (qui exclurait silencieusement l'élève ciblé,
        // et tout camarade, dès qu'il a été promu ou transféré vers un autre school_class_id, ou que son
        // statut n'est plus « actif »). Les notes et examens sont un historique lié au school_class_id au
        // moment de la création et ne bougent jamais — utiliser l'effectif actuel ici était la cause d'un
        // vrai bug où le bulletin de l'année précédente d'un élève promu s'affichait avec toutes les matières
        // vides.
        $classmateIds = $allGrades->pluck('student_id')->unique()->values();
        if (! $classmateIds->contains($student->id)) {
            $classmateIds->push($student->id);
        }
        $classStudents = Student::whereIn('id', $classmateIds)->get(['id']);

        $rowsByStudent = $classStudents->mapWithKeys(
            fn (Student $classmate) => [$classmate->id => $this->computeSubjectRows($classmate, $examsBySubject, $allGrades)]
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
     * bulletins. Sans classe ou sans note publiée, les listes sont vides et la moyenne est nulle.
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
            ->with('subject')
            ->get();

        $grades = Grade::whereIn('exam_id', $exams->pluck('id'))
            ->where('student_id', $student->id)
            ->where('is_absent', false)
            ->whereNotNull('score')
            ->get();

        $rows = $this->computeSubjectRows($student, $exams->groupBy('subject_id'), $grades);

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
        [$examsBySubject, $allGrades] = $this->classExamsAndGrades($schoolClass->id, $academicYearId, $term, $students->pluck('id'));

        $results = $students->map(function (Student $student) use ($examsBySubject, $allGrades) {
            $rows = $this->computeSubjectRows($student, $examsBySubject, $allGrades);

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
