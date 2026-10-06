<?php

namespace App\Services\Council;

use App\Models\AcademicYear;
use App\Models\Council;
use App\Models\CouncilDecision;
use App\Models\CouncilFollowUp;
use App\Models\CouncilStudent;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Tableau de bord des conseils de classe (E11, DIR-01 à DIR-05). Les chiffres académiques viennent de la photo figée de
 * chaque conseil tenu (en séance ou après) : ils ne bougent plus quand une note change ensuite.
 */
class CouncilDashboard
{
    /** Conseils dont la séance a eu lieu (ou a commencé). */
    public const HELD = [Council::IN_SESSION, Council::DRAFTING_MINUTES, Council::PENDING_VALIDATION, Council::CLOSED];

    /** @return array{academic_year_id: int|null, formation_id: int|null, school_class_id: int|null, term: string} */
    public function filters(Request $request): array
    {
        return [
            'academic_year_id' => $request->has('academic_year_id')
                ? ($request->integer('academic_year_id') ?: null)
                : AcademicYear::where('is_current', true)->value('id'),
            'formation_id' => $request->integer('formation_id') ?: null,
            'school_class_id' => $request->integer('school_class_id') ?: null,
            'term' => in_array($request->query('term'), config('eeht.council_terms'), true) ? (string) $request->query('term') : '',
        ];
    }

    public function councils(array $filters): Builder
    {
        return Council::query()
            ->when($filters['academic_year_id'], fn (Builder $query, int $id) => $query->where('academic_year_id', $id))
            ->when($filters['school_class_id'], fn (Builder $query, int $id) => $query->where('school_class_id', $id))
            ->when($filters['formation_id'], fn (Builder $query, int $id) => $query->whereHas('schoolClass', fn (Builder $class) => $class->where('formation_id', $id)))
            ->when($filters['term'] !== '', fn (Builder $query) => $query->where('term', $filters['term']));
    }

    /** @return array<string, mixed> */
    public function build(array $filters): array
    {
        $councils = $this->councils($filters)->with(['schoolClass:id,name,formation_id', 'schoolClass.formation:id,name', 'academicYear:id,label'])->get();
        $held = $councils->whereIn('status', self::HELD);
        $rows = CouncilStudent::whereIn('council_id', $held->pluck('id'))->where('has_left_class', false)
            ->get(['id', 'council_id', 'general_average', 'alert_level', 'unjustified_absence_hours', 'review_status']);
        $byCouncil = $rows->groupBy('council_id');

        $statuses = $councils->countBy('status');

        return [
            // DIR-01
            'statuses' => [
                'programmed' => ($statuses[Council::DRAFT] ?? 0) + ($statuses[Council::SCHEDULED] ?? 0),
                'held' => ($statuses[Council::IN_SESSION] ?? 0) + ($statuses[Council::DRAFTING_MINUTES] ?? 0),
                'to_validate' => $statuses[Council::PENDING_VALIDATION] ?? 0,
                'closed' => $statuses[Council::CLOSED] ?? 0,
            ],
            // DIR-02
            'indicators' => $this->indicators($rows),
            // DIR-03
            'decisions' => $this->decisions($held->pluck('id')),
            'byClass' => $held->map(fn (Council $council) => ['label' => ($council->schoolClass?->name ?? 'Classe').' · '.$council->term] + $this->indicators($byCouncil->get($council->id, collect())))
                ->sortBy('label')->values()->all(),
            'byFormation' => $held->groupBy(fn (Council $council) => $council->schoolClass?->formation?->name ?? 'Sans formation')
                ->map(function (Collection $group, string $label) use ($byCouncil) {
                    $levels = $group->flatMap(fn (Council $council) => $byCouncil->get($council->id, collect()))->countBy('alert_level');

                    return ['label' => $label, 'green' => $levels['green'] ?? 0, 'orange' => $levels['orange'] ?? 0, 'red' => $levels['red'] ?? 0];
                })->sortBy('label')->values()->all(),
            'byTerm' => $held->groupBy('term')
                ->map(fn (Collection $group, string $term) => ['label' => $term] + $this->indicators($group->flatMap(fn (Council $council) => $byCouncil->get($council->id, collect()))))
                ->sortBy('label')->values()->all(),
            // DIR-05
            'followUps' => $this->followUps($councils->pluck('id')),
            'councils' => $councils->sortBy(fn (Council $council) => ($council->schoolClass?->name ?? '').' '.$council->term)->values()
                ->map(fn (Council $council) => $this->councilRow($council, $byCouncil->get($council->id, collect())))->all(),
        ];
    }

    /** @return array{examined: int, evaluated: int, average: float|int|null, pass_rate: float|int|null, red: int, orange: int, unjustified_hours: float|int} */
    public function indicators(Collection $rows): array
    {
        $evaluated = $rows->whereNotNull('general_average');
        $passed = $evaluated->filter(fn ($row) => (float) $row->general_average >= 10)->count();

        return [
            'examined' => $rows->where('review_status', 'reviewed')->count(),
            'evaluated' => $evaluated->count(),
            'average' => $evaluated->isEmpty() ? null : self::number(round($evaluated->avg(fn ($row) => (float) $row->general_average), 2)),
            'pass_rate' => $evaluated->isEmpty() ? null : self::number(round($passed * 100 / $evaluated->count(), 1)),
            'red' => $rows->where('alert_level', 'red')->count(),
            'orange' => $rows->where('alert_level', 'orange')->count(),
            'unjustified_hours' => self::number(round($rows->sum(fn ($row) => (float) $row->unjustified_absence_hours), 1)),
        ];
    }

    /** @return list<array{label: string, category: string, color: string, count: int}> décisions en vigueur (hors rectifiées) */
    private function decisions(Collection $councilIds): array
    {
        return CouncilDecision::query()
            ->join('council_students', 'council_students.id', '=', 'council_decisions.council_student_id')
            ->join('decision_types', 'decision_types.id', '=', 'council_decisions.decision_type_id')
            ->whereIn('council_students.council_id', $councilIds)
            ->where('council_decisions.status', '!=', CouncilDecision::RECTIFIED)
            ->groupBy('decision_types.id', 'decision_types.label', 'decision_types.category', 'decision_types.color', 'decision_types.sort_order')
            ->orderBy('decision_types.sort_order')
            ->selectRaw('decision_types.label as label, decision_types.category as category, decision_types.color as color, count(*) as aggregate')
            ->get()
            ->map(fn ($row) => ['label' => $row->label, 'category' => $row->category, 'color' => $row->color, 'count' => (int) $row->aggregate])
            ->values()->all();
    }

    /** @return array{total: int, done: int, open: int, overdue: int, abandoned: int, rate: float|int|null, statuses: array<string, int>} DIR-05 */
    private function followUps(Collection $councilIds): array
    {
        $actions = CouncilFollowUp::whereIn('council_id', $councilIds)->get(['id', 'status', 'due_date']);
        $counts = $actions->countBy('status');
        $done = $counts['done'] ?? 0;
        $abandoned = $counts['abandoned'] ?? 0;
        $counted = $actions->count() - $abandoned;

        return [
            'total' => $actions->count(),
            'done' => $done,
            'open' => $actions->filter(fn (CouncilFollowUp $action) => $action->isOpen())->count(),
            'overdue' => $actions->filter(fn (CouncilFollowUp $action) => $action->isOverdue())->count(),
            'abandoned' => $abandoned,
            // Réalisées ÷ actions décidées, hors abandonnées.
            'rate' => $counted > 0 ? self::number(round($done * 100 / $counted, 1)) : null,
            'statuses' => collect(CouncilFollowUp::STATUSES)->mapWithKeys(fn (string $label, string $key) => [$key => $counts[$key] ?? 0])->all(),
        ];
    }

    /** @return array<string, mixed> une ligne du tableau et de l'export */
    private function councilRow(Council $council, Collection $rows): array
    {
        $decisions = CouncilDecision::whereIn('council_student_id', $rows->pluck('id'))->where('status', '!=', CouncilDecision::RECTIFIED)->count();
        $actions = CouncilFollowUp::where('council_id', $council->id)->get(['status']);

        return [
            'id' => $council->id,
            'class' => $council->schoolClass?->name,
            'formation' => $council->schoolClass?->formation?->name,
            'term' => $council->term,
            'year' => $council->academicYear?->label,
            'status' => $council->status,
            'status_label' => $council->status_label,
            'scheduled_at' => $council->scheduled_at?->toIso8601String(),
            'decisions' => $decisions,
            'follow_ups' => $actions->count(),
            'follow_ups_done' => $actions->where('status', 'done')->count(),
        ] + $this->indicators($rows);
    }

    /** 50.0 → 50 : un nombre rond reste un entier une fois en JSON. */
    private static function number(float $value): float|int
    {
        return floor($value) === $value ? (int) $value : $value;
    }
}
