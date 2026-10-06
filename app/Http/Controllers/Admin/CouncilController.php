<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\CouncilException;
use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureUserIsStaff;
use App\Models\AcademicYear;
use App\Models\Council;
use App\Models\CouncilAppeal;
use App\Models\CouncilFamilyNotice;
use App\Models\CouncilFollowUp;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Models\CouncilVote;
use App\Models\DecisionType;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\Council\ClassSummary;
use App\Services\Council\CouncilDocuments;
use App\Services\Council\CouncilPresenter;
use App\Services\Council\CouncilRoster;
use App\Services\Council\CouncilWorkflow;
use App\Services\Council\FamilyCouncilService;
use App\Services\Council\PreCouncilService;
use App\Services\Council\RectificationService;
use App\Services\Council\VoteService;
use App\Support\CouncilSettings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Conseils de classe côté personnel : liste (E01), création en trois étapes (E02), détail (E03) et les transitions
 * d'avant séance. Les droits passent par CouncilPolicy, les règles d'état par CouncilWorkflow.
 */
class CouncilController extends Controller
{
    /** Cartes de la liste (E01) : regroupement des six états. */
    private const GROUPS = [
        'upcoming' => [Council::DRAFT, Council::SCHEDULED],
        'ongoing' => [Council::IN_SESSION, Council::DRAFTING_MINUTES],
        'pending' => [Council::PENDING_VALIDATION],
        'closed' => [Council::CLOSED],
    ];

    public function __construct(private readonly CouncilWorkflow $workflow, private readonly CouncilRoster $roster) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Council::class);

        $currentYear = AcademicYear::where('is_current', true)->value('id');
        $filters = [
            'year' => $request->has('year') ? ($request->integer('year') ?: null) : $currentYear,
            'term' => in_array($request->query('term'), config('eeht.council_terms'), true) ? $request->query('term') : '',
            'formation_id' => $request->integer('formation_id') ?: null,
            'school_class_id' => $request->integer('school_class_id') ?: null,
            'status' => array_key_exists((string) $request->query('status'), Council::STATUSES) ? $request->query('status') : '',
            'group' => array_key_exists((string) $request->query('group'), self::GROUPS) ? $request->query('group') : '',
        ];

        $base = Council::query()
            ->when($filters['year'], fn (Builder $query, int $year) => $query->where('academic_year_id', $year))
            ->when($filters['term'] !== '', fn (Builder $query) => $query->where('term', $filters['term']))
            ->when($filters['school_class_id'], fn (Builder $query, int $id) => $query->where('school_class_id', $id))
            ->when($filters['formation_id'], fn (Builder $query, int $id) => $query->whereHas('schoolClass', fn (Builder $class) => $class->where('formation_id', $id)));

        $counts = collect(self::GROUPS)->map(fn (array $statuses) => (clone $base)->whereIn('status', $statuses)->count());

        $councils = (clone $base)
            ->when($filters['status'] !== '', fn (Builder $query) => $query->where('status', $filters['status']))
            ->when($filters['group'] !== '', fn (Builder $query) => $query->whereIn('status', self::GROUPS[$filters['group']]))
            ->with(['schoolClass.formation:id,name', 'academicYear:id,label', 'president:id,name'])
            ->withCount([
                'students as students_count' => fn (Builder $query) => $query->where('has_left_class', false),
                'students as red_count' => fn (Builder $query) => $query->where('alert_level', 'red')->where('has_left_class', false),
                'students as orange_count' => fn (Builder $query) => $query->where('alert_level', 'orange')->where('has_left_class', false),
            ])
            ->orderByRaw('scheduled_at IS NULL')
            ->orderByDesc('scheduled_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Council $council) => [
                'id' => $council->id,
                'class' => $council->schoolClass?->name,
                'formation' => $council->schoolClass?->formation?->name,
                'term' => $council->term,
                'year' => $council->academicYear?->label,
                'scheduled_at' => $council->scheduled_at?->toIso8601String(),
                'president' => $council->president?->name,
                'status' => $council->status,
                'status_label' => $council->status_label,
                'is_end_of_year' => $council->is_end_of_year,
                'students_count' => $council->students_count,
                'red_count' => $council->red_count,
                'orange_count' => $council->orange_count,
            ]);

        return Inertia::render('Admin/Councils/Index', [
            'councils' => $councils,
            'counts' => $counts,
            'filters' => $filters,
            'years' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'terms' => config('eeht.council_terms'),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'classes' => SchoolClass::when($filters['year'], fn (Builder $query, int $year) => $query->where('academic_year_id', $year))->orderBy('name')->get(['id', 'name', 'formation_id']),
            'statuses' => Council::STATUSES,
            'canCreate' => Gate::allows('create', Council::class),
        ]);
    }

    // --- Création et modification (E02) --------------------------------------------------------------------------------

    /** Le personnel de l'école (ni élève, ni parent, ni enseignant seul) : présidents et secrétaires possibles. */
    private function staffUsers()
    {
        return User::whereHas('roles', fn (Builder $query) => $query->whereNotIn('name', ['eleve', 'parent', 'enseignant']))
            ->orderBy('name')->get(['id', 'name']);
    }

    private function formResponse(?Council $council, Request $request): Response
    {
        $currentYear = AcademicYear::where('is_current', true)->value('id');

        return Inertia::render('Admin/Councils/Form', [
            'council' => $council ? [
                'id' => $council->id,
                'status' => $council->status,
                'academic_year_id' => $council->academic_year_id,
                'school_class_id' => $council->school_class_id,
                'term' => $council->term,
                'is_end_of_year' => $council->is_end_of_year,
                'scheduled_at' => $council->scheduled_at?->format('Y-m-d\TH:i'),
                'room' => $council->room,
                'agenda' => $council->agenda,
                'preconseil_deadline' => $council->preconseil_deadline?->format('Y-m-d\TH:i'),
                'president_id' => $council->president_id,
                'main_teacher_id' => $council->main_teacher_id,
                'secretary_id' => $council->secretary_id,
                'members' => $council->members()->whereNotIn('function', ['president', 'main_teacher', 'secretary'])->get()
                    ->map(fn (CouncilMember $member) => [
                        'user_id' => $member->user_id,
                        'teacher_id' => $member->teacher_id,
                        'external_name' => $member->external_name,
                        'external_role' => $member->external_role,
                        'function' => $member->function,
                        'can_vote' => $member->can_vote,
                        'name' => $member->display_name,
                    ])->values(),
            ] : null,
            'defaults' => [
                'academic_year_id' => $currentYear,
                'school_class_id' => $request->integer('school_class_id') ?: null,
                'term' => config('eeht.terms')[0] ?? '',
            ],
            'years' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'terms' => config('eeht.council_terms'),
            'classes' => SchoolClass::with('formation:id,name')->orderBy('name')->get(['id', 'name', 'formation_id', 'academic_year_id'])
                ->map(fn (SchoolClass $class) => ['id' => $class->id, 'name' => $class->name, 'formation' => $class->formation?->name, 'academic_year_id' => $class->academic_year_id]),
            'staff' => $this->staffUsers(),
            'teachers' => Teacher::whereNotNull('user_id')->where('status', 'actif')->orderBy('last_name')->orderBy('first_name')->get(['id', 'user_id', 'first_name', 'last_name'])
                ->map(fn (Teacher $teacher) => ['id' => $teacher->id, 'user_id' => $teacher->user_id, 'name' => $teacher->full_name]),
            'functions' => collect(CouncilMember::FUNCTIONS)->except(['president', 'main_teacher', 'secretary'])->all(),
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Council::class);

        return $this->formResponse(null, $request);
    }

    /** Membres proposés et effectif d'une classe, pour l'étape « Membres » de l'assistant (CRE-03, CRE-04). */
    public function proposal(Request $request): JsonResponse
    {
        Gate::authorize('create', Council::class);

        $class = SchoolClass::findOrFail($request->integer('school_class_id'));

        return response()->json([
            'members' => $this->roster->proposeMembers($class),
            'students_count' => Student::where('school_class_id', $class->id)->where('status', 'actif')->count(),
            'class_teacher_user_ids' => $this->roster->teachersOf($class)->pluck('user_id')->filter()->values(),
        ]);
    }

    /** @return array{0: array<string, mixed>, 1: list<array<string, mixed>>, 2: string} */
    private function validated(Request $request): array
    {
        $member = collect(CouncilMember::FUNCTIONS)->except(['president', 'main_teacher', 'secretary'])->keys()->all();

        $data = $request->validate([
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'term' => ['required', Rule::in(config('eeht.council_terms'))],
            'is_end_of_year' => ['boolean'],
            'scheduled_at' => ['nullable', 'date'],
            'room' => ['nullable', 'string', 'max:120'],
            'agenda' => ['nullable', 'string', 'max:3000'],
            'preconseil_deadline' => ['nullable', 'date'],
            'president_id' => ['nullable', 'integer', 'exists:users,id'],
            'main_teacher_id' => ['nullable', 'integer', Rule::exists('teachers', 'user_id')],
            'secretary_id' => ['nullable', 'integer', 'exists:users,id'],
            'members' => ['nullable', 'array', 'max:60'],
            'members.*.user_id' => ['nullable', 'integer', 'exists:users,id'],
            'members.*.teacher_id' => ['nullable', 'integer', 'exists:teachers,id'],
            'members.*.external_name' => ['nullable', 'string', 'max:120'],
            'members.*.external_role' => ['nullable', 'string', 'max:120'],
            'members.*.function' => ['required', Rule::in($member)],
            'members.*.can_vote' => ['boolean'],
            'action' => ['nullable', Rule::in(['draft', 'schedule'])],
        ], [
            'main_teacher_id.exists' => 'Le professeur principal doit être un enseignant disposant d’un compte.',
        ]);

        $classYear = SchoolClass::whereKey($data['school_class_id'])->value('academic_year_id');
        if ($classYear !== null && (int) $classYear !== (int) $data['academic_year_id']) {
            throw ValidationException::withMessages(['school_class_id' => "Cette classe n'appartient pas à l'année choisie."]);
        }

        foreach ($data['members'] ?? [] as $index => $row) {
            if (empty($row['user_id']) && empty($row['teacher_id']) && trim((string) ($row['external_name'] ?? '')) === '') {
                throw ValidationException::withMessages(["members.{$index}.external_name" => 'Indiquez le nom de ce membre.']);
            }
        }

        $frame = collect($data)->only([
            'academic_year_id', 'school_class_id', 'term', 'scheduled_at', 'room', 'agenda', 'preconseil_deadline',
            'president_id', 'main_teacher_id', 'secretary_id',
        ])->all() + ['is_end_of_year' => (bool) ($data['is_end_of_year'] ?? false) || $data['term'] === config('eeht.final_term')];

        return [$frame, $data['members'] ?? [], $data['action'] ?? 'draft'];
    }

    public function store(Request $request)
    {
        Gate::authorize('create', Council::class);
        [$frame, $members, $action] = $this->validated($request);

        $council = $this->workflow->create($frame, $members, $request->user());

        if ($action === 'schedule') {
            try {
                $this->workflow->schedule($council, $request->user());
            } catch (CouncilException $exception) {
                return redirect()->route('admin.councils.show', $council)->with('error', 'Conseil enregistré en brouillon. '.$exception->getMessage());
            }

            return redirect()->route('admin.councils.show', $council)->with('success', 'Conseil programmé : la photo des données est prise.');
        }

        return redirect()->route('admin.councils.show', $council)->with('success', 'Conseil enregistré en brouillon.');
    }

    public function edit(Request $request, Council $council): Response
    {
        Gate::authorize('update', $council);

        return $this->formResponse($council, $request);
    }

    public function update(Request $request, Council $council)
    {
        Gate::authorize('update', $council);
        [$frame, $members, $action] = $this->validated($request);

        $this->workflow->update($council, $frame, $members, $request->user());

        if ($action === 'schedule' && $council->status === Council::DRAFT) {
            $this->workflow->schedule($council->fresh(), $request->user());
        }

        return redirect()->route('admin.councils.show', $council)->with('success', 'Conseil enregistré.');
    }

    public function destroy(Request $request, Council $council)
    {
        Gate::authorize('delete', $council);

        $label = $council->load('schoolClass', 'academicYear')->label();
        CouncilWorkflow::log($council, $request->user(), "Conseil supprimé (brouillon) : {$label}");
        $council->delete();

        return redirect()->route('admin.councils.index')->with('success', 'Conseil supprimé.');
    }

    // --- Détail (E03) ---------------------------------------------------------------------------------------------------

    public function show(Request $request, Council $council): Response
    {
        Gate::authorize('view', $council);
        $user = $request->user();
        $council->load(['schoolClass.formation:id,name', 'academicYear:id,label', 'president:id,name', 'mainTeacher:id,name', 'secretary:id,name']);
        $internal = Gate::allows('viewInternal', $council);

        $students = $council->students()->with(['student:id,first_name,last_name,matricule', 'recommendation:id,label', 'decisions.type:id,label,category'])->get()
            ->sortBy(fn (CouncilStudent $row) => mb_strtolower(($row->student?->last_name ?? '').' '.($row->student?->first_name ?? '')))
            ->values()
            ->map(fn (CouncilStudent $row) => [
                'id' => $row->id,
                'student_id' => $row->student_id,
                'name' => $row->student?->full_name,
                'matricule' => $row->student?->matricule,
                'average' => $row->general_average,
                'rank' => $row->rank,
                'class_size' => $row->class_size,
                'alert_level' => $row->alert_level,
                'alert_reasons' => $internal ? ($row->alert_reasons ?? []) : [],
                'review_status' => $row->review_status,
                'has_left_class' => $row->has_left_class,
                'has_summary' => filled($row->main_teacher_summary),
                'recommendation' => $row->recommendation?->label,
                'decisions' => $row->decisions->map(fn ($decision) => [
                    'id' => $decision->id,
                    'decision_type_id' => $decision->decision_type_id,
                    'label' => $decision->type?->label,
                    'category' => $decision->type?->category,
                    'reason' => $decision->reason,
                    'status' => $decision->status,
                ])->values(),
                'general_appreciation' => $row->general_appreciation,
            ]);

        return Inertia::render('Admin/Councils/Show', [
            'council' => [
                'id' => $council->id,
                'label' => $council->label(),
                'class' => $council->schoolClass?->name,
                'formation' => $council->schoolClass?->formation?->name,
                'term' => $council->term,
                'year' => $council->academicYear?->label,
                'is_end_of_year' => $council->is_end_of_year,
                'scheduled_at' => $council->scheduled_at?->toIso8601String(),
                'room' => $council->room,
                'agenda' => $council->agenda,
                'status' => $council->status,
                'status_label' => $council->status_label,
                'president' => $council->president?->name,
                'main_teacher' => $council->mainTeacher?->name,
                'secretary' => $council->secretary?->name,
                'preconseil_deadline' => $council->preconseil_deadline?->toIso8601String(),
                'snapshot_taken_at' => $council->snapshot_taken_at?->toIso8601String(),
                'started_at' => $council->started_at?->toIso8601String(),
                'ended_at' => $council->ended_at?->toIso8601String(),
                'closed_at' => $council->closed_at?->toIso8601String(),
                'sitting' => $council->sitting ? ['id' => $council->sitting->id, 'label' => $council->sitting->label()] : null,
            ],
            'students' => $students,
            'members' => $council->members()->with(['user:id,name', 'teacher:id,first_name,last_name'])->get()
                ->sortBy(fn (CouncilMember $member) => array_search($member->function, array_keys(CouncilMember::FUNCTIONS), true))
                ->values()
                ->map(fn (CouncilMember $member) => [
                    'id' => $member->id,
                    'name' => $member->display_name,
                    'function' => $member->function,
                    'function_label' => CouncilMember::FUNCTIONS[$member->function] ?? $member->function,
                    'external_role' => $member->external_role,
                    'attendance' => $member->attendance,
                    'arrived_at' => $member->arrived_at?->toIso8601String(),
                    'can_vote' => $member->can_vote,
                    'has_account' => $member->user_id !== null,
                ]),
            'summary' => ClassSummary::for($council),
            'attendances' => CouncilMember::ATTENDANCES,
            'preCouncil' => app(PreCouncilService::class)->progress($council),
            'gradesChanged' => in_array($council->status, [Council::SCHEDULED, Council::IN_SESSION], true) ? app(CouncilDocuments::class)->gradesChangedSinceSnapshot($council) : 0,
            'followUpsCount' => CouncilFollowUp::where('council_id', $council->id)->count(),
            'decisionTypes' => $council->isClosed() ? app(CouncilPresenter::class)->decisionTypes($council) : [],
            'categories' => DecisionType::CATEGORIES,
            'appeals' => CouncilAppeal::with('decision.type:id,label', 'decision.councilStudent.student:id,first_name,last_name')->where('council_id', $council->id)->latest('id')->get()
                ->map(fn (CouncilAppeal $appeal) => [
                    'id' => $appeal->id,
                    'student' => $appeal->decision?->councilStudent?->student?->full_name,
                    'decision' => $appeal->decision?->type?->label,
                    'filed_at' => $appeal->filed_at->toDateString(),
                    'filed_by_name' => $appeal->filed_by_name,
                    'reason' => $appeal->reason,
                    'deadline' => $appeal->deadline->toDateString(),
                    'outcome' => $appeal->outcome,
                    'outcome_label' => CouncilAppeal::OUTCOMES[$appeal->outcome] ?? $appeal->outcome,
                ]),
            'appealDeadline' => $council->isClosed() ? app(RectificationService::class)->appealDeadline($council)->toDateString() : null,
            'terms' => config('eeht.council_terms'),
            // DIR-07 : familles prévenues, envoi manuel, liens WhatsApp prêts à envoyer (secrétariat).
            'familyNotices' => $council->isClosed() ? [
                'enabled' => CouncilSettings::familyNotify(),
                'sent' => CouncilFamilyNotice::where('council_id', $council->id)->count(),
                'total' => $students->where('has_left_class', false)->count(),
                'can_send' => $user->can('notifyFamilies', $council),
                'whatsapp' => $user->can('export', $council) ? app(FamilyCouncilService::class)->whatsapp($council) : [],
            ] : null,
            // VOT-05 : décompte pour tous ; détail nominatif pour la Direction seulement, et seulement en vote nominatif.
            'votes' => CouncilVote::with(['ballots.member.user:id,name', 'ballots.member.teacher:id,first_name,last_name'])
                ->where('council_id', $council->id)->whereNotNull('closed_at')->orderBy('id')->get()
                ->map(fn (CouncilVote $vote) => app(VoteService::class)->present($vote) + [
                    'detail' => $vote->secrecy === 'nominal' && $user->can('validateDirection', $council)
                        ? $vote->ballots->map(fn ($ballot) => ['name' => $ballot->member?->display_name, 'choice' => CouncilVote::CHOICES[$ballot->choice] ?? '—'])->values()
                        : null,
                ])->values(),
            'can' => collect(['update', 'delete', 'schedule', 'conduct', 'writeSynthesis', 'viewInternal', 'export', 'viewAudit', 'validateDirection'])
                ->mapWithKeys(fn (string $ability) => [$ability => $user->can($ability, $council)])
                ->all() + [
                    'create' => $user->can('create', Council::class),
                    'appeal' => EnsureUserIsStaff::isStaff($user) && ($user->can('modifier_conseils') || $user->can('valider_conseils_direction')),
                    'internship' => EnsureUserIsStaff::isStaff($user) && $user->can('voir_insertion'),
                ],
        ]);
    }

    // --- Transitions d'avant séance -------------------------------------------------------------------------------------

    public function schedule(Request $request, Council $council)
    {
        Gate::authorize('schedule', $council);
        $this->workflow->schedule($council, $request->user());

        return back()->with('success', 'Conseil programmé : la photo des données est prise.');
    }

    public function unschedule(Request $request, Council $council)
    {
        Gate::authorize('schedule', $council);
        $this->workflow->unschedule($council, $request->user());

        return back()->with('success', 'Programmation annulée : le conseil repasse en brouillon.');
    }

    public function refreshSnapshot(Request $request, Council $council)
    {
        Gate::authorize('schedule', $council);
        $this->workflow->refreshSnapshot($council, $request->user());

        return back()->with('success', 'Photo des données rafraîchie.');
    }

    public function attendance(Request $request, Council $council, CouncilMember $member)
    {
        Gate::authorize('conduct', $council);
        $data = $request->validate(['attendance' => ['required', Rule::in(array_keys(CouncilMember::ATTENDANCES))]]);

        $this->workflow->recordAttendance($council, $member, $data['attendance'], $request->user());

        return $request->expectsJson() && ! $request->header('X-Inertia')
            ? response()->json(['attendance' => $member->fresh()->attendance])
            : back();
    }

    public function start(Request $request, Council $council)
    {
        Gate::authorize('conduct', $council);
        $this->workflow->start($council, $request->user());

        return redirect()->route('council.session.show', $council)->with('success', 'Séance ouverte : la photo des données est figée.');
    }
}
