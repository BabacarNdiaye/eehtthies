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
     * Senegalese-scale appreciation for a single subject's MOY/20.
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
     * Conseil de classe mention auto-suggested from the overall average.
     * "blame" is never auto-suggested — it reflects conduct, not grades.
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
     * Weighted (by exam coefficient) average of a set of exams' grades for one student, normalised to /20.
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
     * Subject-by-subject rows (Devoir / Composition / Moy20 / Coef / MoyX / appreciation)
     * for one student, given the class's exams (grouped by subject) and the relevant grades.
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
     * Full detail for one student's bulletin: subject rows (with class rank per subject) + overall average.
     *
     * @return array{subjects: array, overall: float|null}
     */
    public function computeDetailedForStudent(Student $student, int $schoolClassId, int $academicYearId, string $term): array
    {
        [$examsBySubject, $allGrades] = $this->classExamsAndGrades($schoolClassId, $academicYearId, $term);

        // Classmates for ranking are derived from who actually has a grade for
        // these exams — not from the class's *current* live roster (which would
        // silently exclude the target student, and any classmate, once they've
        // since been promoted/transferred to another school_class_id, or their
        // status is no longer "actif"). Grades and exams are a historical
        // record tied to school_class_id at creation time and never move —
        // using the live roster here was the cause of a real bug where a
        // promoted student's previous-year bulletin re-rendered with every
        // subject blank.
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
     * Backward-compatible alias used by callers that only need the subject
     * averages (not the full devoir/composition/rank breakdown).
     */
    public function computeForStudent(Student $student, int $schoolClassId, int $academicYearId, string $term): array
    {
        return $this->computeDetailedForStudent($student, $schoolClassId, $academicYearId, $term);
    }

    /**
     * Attendance counts (retard / absence / unjustified absence) for a student
     * within the approximate date window of the given term.
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
     * Compute averages (+ class rank + class average) for every active student
     * in a class/term, used to generate a full batch of report cards at once.
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
