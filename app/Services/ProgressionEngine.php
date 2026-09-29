<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\Internship;
use App\Models\ReportCard;
use App\Models\SchoolClass;
use App\Models\SkillAssessment;
use App\Models\Student;

/**
 * Suggests an end-of-level progression decision for a student, driven
 * entirely by the formation's own configured `FormationLevel` rules — no
 * hardcoded thresholds. See ReportCardCalculator::decisionFor() for the
 * (deliberately untouched, separate) per-term bulletin decision.
 */
class ProgressionEngine
{
    /**
     * @return array{action: string, reasons: array<int, string>, target_class: ?SchoolClass}
     */
    public function suggest(Student $student, SchoolClass $class): array
    {
        $level = $class->formationLevel;

        if (! $level) {
            return ['action' => 'undetermined', 'reasons' => ['Aucune règle de passage configurée pour cette classe.'], 'target_class' => null];
        }

        $reasons = [];
        $passed = true;

        $average = $this->annualAverage($student, $class);
        if ($level->min_average !== null) {
            if ($average === null || $average < (float) $level->min_average) {
                $passed = false;
                $reasons[] = sprintf('Moyenne annuelle insuffisante (%s / %s requis)', $average ?? 'n/a', $level->min_average);
            } else {
                $reasons[] = sprintf('Moyenne annuelle : %s / %s requis — validée', $average, $level->min_average);
            }
        }

        if ($level->max_unjustified_absences !== null) {
            $absences = $this->annualUnjustifiedAbsences($student, $class);
            if ($absences > $level->max_unjustified_absences) {
                $passed = false;
                $reasons[] = sprintf('Trop d\'absences injustifiées (%d, max %d)', $absences, $level->max_unjustified_absences);
            } else {
                $reasons[] = sprintf('Assiduité : %d absence(s) injustifiée(s) (max %d) — validée', $absences, $level->max_unjustified_absences);
            }
        }

        foreach ($level->requiredSubjects as $subject) {
            $subjectAverage = $this->subjectAnnualAverage($student, $class, $subject->id);
            $threshold = $level->min_average !== null ? (float) $level->min_average : 10.0;

            if ($subjectAverage === null || $subjectAverage < $threshold) {
                $passed = false;
                $reasons[] = sprintf('Matière obligatoire non validée : %s (%s / %s requis)', $subject->name, $subjectAverage ?? 'non notée', $threshold);
            } else {
                $reasons[] = sprintf('Matière obligatoire validée : %s (%s)', $subject->name, $subjectAverage);
            }
        }

        foreach ($level->requiredSkills as $skill) {
            $acquired = SkillAssessment::where('student_id', $student->id)
                ->where('skill_id', $skill->id)
                ->orderByDesc('assessed_at')
                ->value('level');

            if ($acquired === null || $acquired < 3) {
                $passed = false;
                $reasons[] = sprintf('Compétence obligatoire non acquise : %s', $skill->name);
            } else {
                $reasons[] = sprintf('Compétence obligatoire acquise : %s (%s)', $skill->name, SkillAssessment::LEVELS[$acquired]);
            }
        }

        if ($level->internship_required) {
            $hasInternship = Internship::where('student_id', $student->id)->where('status', 'termine')->exists();
            if (! $hasInternship) {
                $passed = false;
                $reasons[] = 'Stage obligatoire non validé.';
            } else {
                $reasons[] = 'Stage obligatoire validé.';
            }
        }

        if ($level->final_exam_required) {
            $hasFinalExamGrade = Grade::where('student_id', $student->id)
                ->where('is_absent', false)
                ->whereNotNull('score')
                ->whereHas('exam', fn ($q) => $q
                    ->where('school_class_id', $class->id)
                    ->whereIn('type', config('eeht.exam_category_composition')))
                ->exists();

            if (! $hasFinalExamGrade) {
                $passed = false;
                $reasons[] = 'Examen final obligatoire non passé.';
            } else {
                $reasons[] = 'Examen final obligatoire passé.';
            }
        }

        if ($passed) {
            if ($level->is_final_level) {
                return ['action' => 'graduate', 'reasons' => $reasons, 'target_class' => null];
            }

            return ['action' => 'promote', 'reasons' => $reasons, 'target_class' => $class->nextClassAuto()];
        }

        return [
            'action' => $level->is_final_level ? 'fail_final' : 'stay',
            'reasons' => $reasons,
            'target_class' => null,
        ];
    }

    /** Mean of the two terms' overall averages, same convention as ReportCardController::generate()'s annual_average. */
    private function annualAverage(Student $student, SchoolClass $class): ?float
    {
        $averages = ReportCard::where('student_id', $student->id)
            ->where('academic_year_id', $class->academic_year_id)
            ->pluck('average')
            ->filter(fn ($v) => $v !== null)
            ->map(fn ($v) => (float) $v);

        return $averages->isNotEmpty() ? round($averages->avg(), 2) : null;
    }

    private function annualUnjustifiedAbsences(Student $student, SchoolClass $class): int
    {
        return (int) ReportCard::where('student_id', $student->id)
            ->where('academic_year_id', $class->academic_year_id)
            ->sum('unjustified_absence_count');
    }

    /** Mean of the two terms' moy20 for one subject, via ReportCardCalculator's coefficient-weighted computation. */
    private function subjectAnnualAverage(Student $student, SchoolClass $class, int $subjectId): ?float
    {
        $calculator = app(ReportCardCalculator::class);
        $values = [];

        foreach (config('eeht.terms') as $term) {
            $detail = $calculator->computeDetailedForStudent($student, $class->id, $class->academic_year_id, $term);
            $row = collect($detail['subjects'])->firstWhere('subject_id', $subjectId);

            if ($row && $row['moy20'] !== null) {
                $values[] = $row['moy20'];
            }
        }

        return count($values) > 0 ? round(array_sum($values) / count($values), 2) : null;
    }
}
