<?php

namespace App\Services\Council;

use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilFollowUp;
use App\Models\CouncilInternshipEvaluation;
use App\Models\CouncilStudent;
use App\Models\DecisionType;

/**
 * Ce qui sort d'un élève du conseil, selon le contexte (ENF-02). Trois présentations distinctes, jamais une seule filtrée
 * après coup :
 *  - full()       : poste du président et membres habilités ; observations internes et détail disciplinaire selon les
 *                   droits passés en paramètre ;
 *  - projection() : écran de la salle, en LISTE BLANCHE : nom, résultats, assiduité en chiffres, appréciation générale,
 *                   décisions ; jamais d'observation interne, de motif d'alerte, de synthèse ni de sanction ;
 *  - (V3) family() : élève et parents, après clôture.
 */
class CouncilPresenter
{
    public function __construct(
        private readonly PreCouncilService $preCouncil,
        private readonly FollowUpService $followUps,
    ) {}

    /** @return array<string, mixed> */
    public function full(CouncilStudent $row, bool $internal, bool $discipline): array
    {
        $snapshot = $row->snapshot ?? [];
        $sanctions = $snapshot['discipline'] ?? ['count' => 0, 'max_level' => null, 'records' => []];

        return [
            'id' => $row->id,
            'student_id' => $row->student_id,
            'name' => $row->student?->full_name,
            'matricule' => $row->student?->matricule,
            'average' => $row->general_average,
            'rank' => $row->rank,
            'class_size' => $row->class_size,
            'previous_average' => $row->previous_average,
            'progression' => $row->progression,
            'failed_subjects_count' => $row->failed_subjects_count,
            'alert_level' => $row->alert_level,
            'alert_reasons' => $internal ? ($row->alert_reasons ?? []) : [],
            'review_status' => $row->review_status,
            'has_left_class' => $row->has_left_class,
            'general_appreciation' => $row->general_appreciation,
            'main_teacher_summary' => $internal ? $row->main_teacher_summary : null,
            'recommendation_id' => $internal ? $row->main_teacher_recommendation_id : null,
            'subjects' => $snapshot['subjects'] ?? [],
            'groups' => $snapshot['groups'] ?? [],
            'attendance' => $snapshot['attendance'] ?? null,
            'discipline' => $discipline
                ? $sanctions
                : ['count' => $sanctions['count'] ?? 0, 'max_level' => null, 'records' => []],
            'internship' => $snapshot['internship'] ?? null,
            'internship_evaluation' => CouncilInternshipEvaluation::with('criterion:id,label')->where('council_student_id', $row->id)->get()
                ->filter(fn (CouncilInternshipEvaluation $evaluation) => $evaluation->rating !== null)
                ->map(fn (CouncilInternshipEvaluation $evaluation) => [
                    'criterion' => $evaluation->criterion?->label,
                    'rating' => CouncilInternshipEvaluation::RATINGS[$evaluation->rating] ?? $evaluation->rating,
                    'comment' => $evaluation->comment,
                ])->values(),
            'observations' => $this->preCouncil->forStudent($row, $internal),
            'previous_follow_ups' => $this->followUps->previousFor($row->council, $row->student_id)->map(fn (CouncilFollowUp $followUp) => [
                'problem' => $followUp->problem,
                'owner' => $followUp->owner?->name,
                'due_date' => $followUp->due_date?->toDateString(),
                'status_label' => CouncilFollowUp::STATUSES[$followUp->status] ?? $followUp->status,
                'status' => $followUp->status,
            ])->values(),
            'decisions' => $row->decisions->where('status', '!=', CouncilDecision::RECTIFIED)->map(fn (CouncilDecision $decision) => [
                'decision_type_id' => $decision->decision_type_id,
                'reason' => $decision->reason,
            ])->values(),
            'revision' => $row->revision,
        ];
    }

    /** @return array<string, mixed> écran projeté : liste blanche, rien d'interne */
    public function projection(CouncilStudent $row): array
    {
        $snapshot = $row->snapshot ?? [];
        $attendance = $snapshot['attendance'] ?? [];

        return [
            'name' => $row->student?->full_name,
            'average' => $row->general_average,
            'rank' => $row->rank,
            'class_size' => $row->class_size,
            'progression' => $row->progression,
            'groups' => collect($snapshot['groups'] ?? [])->map(fn (array $group) => ['label' => $group['label'], 'average' => $group['average'], 'qualitative' => (bool) ($group['qualitative'] ?? false)])->values(),
            'subjects' => collect($snapshot['subjects'] ?? [])->map(fn (array $subject) => ['name' => $subject['name'], 'moy20' => $subject['moy20']])->values(),
            'attendance' => [
                'unjustified_hours' => $attendance['unjustified_hours'] ?? 0,
                'justified_hours' => $attendance['justified_hours'] ?? 0,
                'late_count' => $attendance['late_count'] ?? 0,
            ],
            'general_appreciation' => $row->general_appreciation,
            // Appréciations publiables des enseignants seulement (jamais l'observation interne ni la recommandation).
            'appreciations' => collect($this->preCouncil->forStudent($row, false))
                ->filter(fn (array $observation) => filled($observation['appreciation']))
                ->map(fn (array $observation) => ['subject' => $observation['subject'], 'appreciation' => $observation['appreciation']])->values(),
            'decisions' => $row->decisions->where('status', '!=', CouncilDecision::RECTIFIED)->map(fn (CouncilDecision $decision) => $decision->type?->label)->filter()->values(),
        ];
    }

    /**
     * Décisions proposées en séance : actives, l'orientation et les types de fin d'année seulement au conseil de fin
     * d'année (RG-10).
     *
     * @return list<array<string, mixed>>
     */
    public function decisionTypes(Council $council): array
    {
        return DecisionType::active()->ordered()->get()
            ->filter(fn (DecisionType $type) => $council->is_end_of_year || (! $type->is_end_of_year_only && $type->category !== DecisionType::ORIENTATION))
            ->map(fn (DecisionType $type) => [
                'id' => $type->id,
                'label' => $type->label,
                'category' => $type->category,
                'color' => $type->color,
                'requires_reason' => $type->requires_reason,
                'requires_vote' => $type->requires_vote,
                'incompatible_ids' => $type->incompatibleIds(),
            ])
            ->values()
            ->all();
    }
}
