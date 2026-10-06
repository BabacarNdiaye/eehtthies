<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Council;
use App\Models\Student;
use App\Models\User;
use App\Support\Exportable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/**
 * Journal d'audit d'un conseil (E08) : toute action portant ce conseil en propriété, avec l'auteur, l'élève concerné et
 * les valeurs avant / après. Filtres par auteur, action et élève ; export CSV. Rétention : le journal n'est pas purgé
 * (aucun nettoyage planifié), ce qui satisfait la conservation de 10 ans (ENF-05).
 */
class CouncilAuditController extends Controller
{
    use Exportable;

    private function query(Council $council, Request $request): Builder
    {
        return Activity::query()
            ->where('log_name', 'conseils')
            ->where('properties->council_id', $council->id)
            ->when($request->integer('causer_id'), fn (Builder $query, int $id) => $query->where('causer_id', $id)->where('causer_type', User::class))
            ->when($request->integer('student_id'), fn (Builder $query, int $id) => $query->where('properties->student_id', $id))
            ->when(trim((string) $request->query('action')) !== '', fn (Builder $query) => $query->where('description', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], trim((string) $request->query('action'))).'%'))
            ->with('causer')
            ->orderByDesc('id');
    }

    /** @return array<string, mixed> */
    private function present(Activity $activity, array $students): array
    {
        $properties = $activity->properties ?? collect();
        $changes = $activity->attribute_changes ?? collect();

        return [
            'id' => $activity->id,
            'at' => $activity->created_at?->toIso8601String(),
            'user' => $activity->causer?->name,
            'action' => $activity->description,
            'student' => $students[$properties['student_id'] ?? 0] ?? null,
            'old' => $properties['old'] ?? ($changes['old'] ?? null),
            'new' => $properties['new'] ?? ($changes['attributes'] ?? null),
        ];
    }

    private function studentNames(Council $council): array
    {
        return Student::whereIn('id', $council->students()->pluck('student_id'))->get(['id', 'first_name', 'last_name'])
            ->mapWithKeys(fn (Student $student) => [$student->id => $student->full_name])->all();
    }

    public function index(Request $request, Council $council): Response
    {
        Gate::authorize('viewAudit', $council);
        $council->load(['schoolClass:id,name']);
        $students = $this->studentNames($council);

        $entries = $this->query($council, $request)->paginate(30)->withQueryString()
            ->through(fn (Activity $activity) => $this->present($activity, $students));

        $causers = Activity::where('log_name', 'conseils')->where('properties->council_id', $council->id)
            ->where('causer_type', User::class)->distinct()->pluck('causer_id');

        return Inertia::render('Admin/Councils/Audit', [
            'council' => ['id' => $council->id, 'class' => $council->schoolClass?->name, 'term' => $council->term],
            'entries' => $entries,
            'filters' => [
                'causer_id' => $request->integer('causer_id') ?: null,
                'student_id' => $request->integer('student_id') ?: null,
                'action' => (string) $request->query('action', ''),
            ],
            'users' => User::whereIn('id', $causers)->orderBy('name')->get(['id', 'name']),
            'students' => collect($students)->map(fn (string $name, int $id) => ['id' => $id, 'name' => $name])->values(),
        ]);
    }

    public function exportCsv(Request $request, Council $council)
    {
        Gate::authorize('viewAudit', $council);
        $students = $this->studentNames($council);
        $flat = fn ($value) => $value === null ? '' : (is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE));

        $rows = $this->query($council, $request)->cursor()->map(function (Activity $activity) use ($students, $flat) {
            $entry = $this->present($activity, $students);

            return [
                'at' => $activity->created_at?->format('d/m/Y H:i:s'),
                'user' => $entry['user'],
                'action' => $entry['action'],
                'student' => $entry['student'],
                'old' => $flat($entry['old']),
                'new' => $flat($entry['new']),
            ];
        });

        return $this->csvResponse("journal-conseil-{$council->id}.csv", [
            ['key' => 'at', 'label' => 'Date et heure'],
            ['key' => 'user', 'label' => 'Utilisateur'],
            ['key' => 'action', 'label' => 'Action'],
            ['key' => 'student', 'label' => 'Élève'],
            ['key' => 'old', 'label' => 'Ancienne valeur'],
            ['key' => 'new', 'label' => 'Nouvelle valeur'],
        ], $rows);
    }
}
