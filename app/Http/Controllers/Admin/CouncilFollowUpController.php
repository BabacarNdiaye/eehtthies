<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureUserIsStaff;
use App\Models\Council;
use App\Models\CouncilFollowUp;
use App\Models\SchoolClass;
use App\Models\User;
use App\Services\Council\CouncilDocuments;
use App\Services\Council\FollowUpService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Actions de suivi (E09 : toutes les classes, E10 : « Mes actions »). Le même contrôleur sert l'espace enseignant pour
 * « Mes actions » (pages et adresses distinctes, mêmes règles : FollowUpService).
 */
class CouncilFollowUpController extends Controller
{
    public function __construct(private readonly FollowUpService $followUps) {}

    /** @return array<string, mixed> */
    public static function present(CouncilFollowUp $followUp, ?User $viewer = null): array
    {
        return [
            'id' => $followUp->id,
            'student' => $followUp->student?->full_name,
            'class' => $followUp->council?->schoolClass?->name,
            'council_id' => $followUp->council_id,
            'term' => $followUp->council?->term,
            'kind' => $followUp->kind,
            'problem' => $followUp->problem,
            'action' => $followUp->action,
            'owner_id' => $followUp->owner_id,
            'owner' => $followUp->owner?->name,
            'due_date' => $followUp->due_date?->toDateString(),
            'status' => $followUp->status,
            'status_label' => CouncilFollowUp::STATUSES[$followUp->status] ?? $followUp->status,
            'comment' => $followUp->comment,
            'overdue' => $followUp->isOverdue(),
            'interview_at' => $followUp->interview_at?->format('Y-m-d\TH:i'),
            'interview_report' => $followUp->interview_report,
            'can_manage' => $viewer ? app(FollowUpService::class)->canManage($viewer, $followUp) : false,
        ];
    }

    private function filtered(Request $request): Builder
    {
        return CouncilFollowUp::with(['student:id,first_name,last_name', 'owner:id,name', 'council.schoolClass:id,name'])
            ->when($request->integer('council_id'), fn (Builder $query, int $id) => $query->where('council_id', $id))
            ->when($request->integer('school_class_id'), fn (Builder $query, int $id) => $query->whereHas('council', fn (Builder $council) => $council->where('school_class_id', $id)))
            ->when($request->integer('owner_id'), fn (Builder $query, int $id) => $query->where('owner_id', $id))
            ->when(array_key_exists((string) $request->query('status'), CouncilFollowUp::STATUSES), fn (Builder $query) => $query->where('status', $request->query('status')))
            ->when($request->boolean('overdue'), fn (Builder $query) => $query->whereIn('status', CouncilFollowUp::OPEN)->whereDate('due_date', '<', now()->toDateString()))
            ->orderByRaw('due_date IS NULL')->orderBy('due_date')->orderBy('id');
    }

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Council::class);
        $user = $request->user();

        return Inertia::render('Admin/FollowUps/Index', [
            'mode' => 'all',
            'followUps' => $this->filtered($request)->paginate(25)->withQueryString()->through(fn (CouncilFollowUp $followUp) => self::present($followUp, $user)),
            'filters' => [
                'council_id' => $request->integer('council_id') ?: null,
                'school_class_id' => $request->integer('school_class_id') ?: null,
                'owner_id' => $request->integer('owner_id') ?: null,
                'status' => (string) $request->query('status', ''),
                'overdue' => $request->boolean('overdue'),
            ],
            // Lien « Actions de suivi » d'un conseil : le filtre est rappelé au-dessus de la liste.
            'councilLabel' => $request->integer('council_id') ? Council::with(['schoolClass:id,name', 'academicYear:id,label'])->find($request->integer('council_id'))?->label() : null,
            'classes' => SchoolClass::whereIn('id', Council::distinct()->pluck('school_class_id'))->orderBy('name')->get(['id', 'name']),
            'owners' => User::whereIn('id', CouncilFollowUp::whereNotNull('owner_id')->distinct()->pluck('owner_id'))->orderBy('name')->get(['id', 'name']),
            'statuses' => CouncilFollowUp::STATUSES,
            'canReassign' => $user->can('modifier_conseils'),
            'staff' => $user->can('modifier_conseils') ? User::whereHas('roles', fn (Builder $q) => $q->whereNotIn('name', ['eleve', 'parent']))->orderBy('name')->get(['id', 'name']) : [],
        ]);
    }

    /** E10 : les actions dont je suis responsable (tout le personnel, sans permission particulière). */
    public function mine(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Admin/FollowUps/Index', [
            'mode' => 'mine',
            'followUps' => CouncilFollowUp::with(['student:id,first_name,last_name', 'owner:id,name', 'council.schoolClass:id,name'])
                ->where('owner_id', $user->id)
                ->orderByRaw("CASE WHEN status IN ('todo','in_progress') THEN 0 ELSE 1 END")
                ->orderByRaw('due_date IS NULL')->orderBy('due_date')
                ->paginate(25)->through(fn (CouncilFollowUp $followUp) => self::present($followUp, $user)),
            'filters' => ['council_id' => null, 'school_class_id' => null, 'owner_id' => null, 'status' => '', 'overdue' => false],
            'classes' => [],
            'owners' => [],
            'statuses' => CouncilFollowUp::STATUSES,
            'canReassign' => false,
            'staff' => [],
        ]);
    }

    /** « Mes actions » dans l'espace enseignant (E10), utilisable au téléphone. */
    public function teacherIndex(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Portal/Teacher/FollowUps', [
            'followUps' => CouncilFollowUp::with(['student:id,first_name,last_name', 'owner:id,name', 'council.schoolClass:id,name'])
                ->where('owner_id', $user->id)
                ->orderByRaw("CASE WHEN status IN ('todo','in_progress') THEN 0 ELSE 1 END")
                ->orderByRaw('due_date IS NULL')->orderBy('due_date')
                ->get()->map(fn (CouncilFollowUp $followUp) => self::present($followUp, $user))->values(),
            'statuses' => CouncilFollowUp::STATUSES,
        ]);
    }

    /** @return array<string, mixed> */
    public static function rules(): array
    {
        return [
            'action' => ['nullable', 'string', 'max:2000'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(array_keys(CouncilFollowUp::STATUSES))],
            'comment' => ['nullable', 'string', 'max:2000'],
            'interview_at' => ['nullable', 'date'],
            'interview_report' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function update(Request $request, CouncilFollowUp $followUp)
    {
        abort_unless($this->followUps->canManage($request->user(), $followUp), 403);
        $data = $request->validate(self::rules());

        // Changer de statut demande un mot d'explication (E10).
        if ($data['status'] !== $followUp->status && blank($data['comment'] ?? null)) {
            return back()->withErrors(['comment' => 'Ajoutez un commentaire pour expliquer le changement de statut.']);
        }

        $this->followUps->update($followUp, $data, $request->user());

        return back()->with('success', 'Action de suivi enregistrée.');
    }

    /** SUI-04 : convocation de la famille à l'entretien, pour le responsable ou la pédagogie. */
    public function interviewPdf(Request $request, CouncilFollowUp $followUp, CouncilDocuments $documents)
    {
        $user = $request->user();
        abort_unless($followUp->owner_id === $user->id || (EnsureUserIsStaff::isStaff($user) && $user->can('voir_conseils')), 403);

        return $documents->interview($followUp)->stream("convocation-entretien-{$followUp->id}.pdf");
    }
}
