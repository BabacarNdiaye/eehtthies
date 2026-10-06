<?php

namespace App\Http\Controllers\Council;

use App\Http\Controllers\CallController;
use App\Http\Controllers\Controller;
use App\Models\AppreciationTemplate;
use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Models\CouncilVote;
use App\Models\DecisionType;
use App\Services\Council\ClassSummary;
use App\Services\Council\CouncilMeetingService;
use App\Services\Council\CouncilPresenter;
use App\Services\Council\CouncilSession;
use App\Services\Council\CouncilSittingService;
use App\Services\Council\VoteService;
use App\Support\CouncilSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Mode conseil (E05) et vue projetée (E06), hors de /admin : un président enseignant y accède comme un membre du
 * personnel. Lecture : membres du conseil et personnel habilité (CouncilPolicy::view) ; écriture : CouncilPolicy::conduct.
 * Les écritures sont en JSON (enregistrement automatique, file hors ligne) ; la projection interroge l'état toutes les 3 s.
 */
class SessionController extends Controller
{
    public function __construct(private readonly CouncilSession $session, private readonly CouncilPresenter $presenter, private readonly VoteService $votes) {}

    public function show(Request $request, Council $council): Response
    {
        Gate::authorize('view', $council);
        $council->load(['schoolClass:id,name', 'academicYear:id,label']);

        $internal = Gate::allows('viewInternal', $council);
        $discipline = Gate::allows('viewDiscipline', $council);

        $students = $council->students()->with(['student:id,first_name,last_name,matricule', 'decisions'])->get()
            ->sortBy(fn (CouncilStudent $row) => mb_strtolower(($row->student?->last_name ?? '').' '.($row->student?->first_name ?? '')))
            ->values()
            ->map(fn (CouncilStudent $row) => $this->presenter->full($row, $internal, $discipline));

        return Inertia::render('Council/Session', [
            'council' => [
                'id' => $council->id,
                'class' => $council->schoolClass?->name,
                'term' => $council->term,
                'year' => $council->academicYear?->label,
                'is_end_of_year' => $council->is_end_of_year,
                'status' => $council->status,
                'status_label' => $council->status_label,
                'started_at' => $council->started_at?->toIso8601String(),
                'session_notes' => $council->session_notes,
                'focus_council_student_id' => $council->focus_council_student_id,
            ],
            'summary' => ClassSummary::for($council),
            'members' => $council->members()->get()->map(fn (CouncilMember $member) => [
                'id' => $member->id,
                'name' => $member->display_name,
                'function_label' => CouncilMember::FUNCTIONS[$member->function] ?? $member->function,
                'attendance' => $member->attendance,
            ]),
            'students' => $students,
            'decisionTypes' => $this->presenter->decisionTypes($council),
            'categories' => DecisionType::CATEGORIES,
            'bank' => AppreciationTemplate::bank(),
            'levels' => AppreciationTemplate::LEVELS,
            'themes' => AppreciationTemplate::THEMES,
            // V3 : votes du conseil (le plus récent en dernier) et règles en vigueur.
            'votes' => CouncilVote::where('council_id', $council->id)->orderBy('id')->get()->map(fn (CouncilVote $vote) => $this->votes->present($vote))->values(),
            'voteRules' => [
                'quorum' => $this->votes->quorum($council),
                'mode' => CouncilSettings::voteMode(),
                'majority' => CouncilVote::MAJORITIES[CouncilSettings::voteMajority()],
                'casting' => CouncilSettings::voteCasting(),
                'secrecy' => CouncilVote::SECRECIES[CouncilSettings::voteSecrecy()],
                'modes' => CouncilVote::MODES,
            ],
            // Séance commune : les classes de la séance, pour passer de l'une à l'autre sans quitter l'écran.
            'sitting' => $council->sitting ? [
                'id' => $council->sitting->id,
                'label' => $council->sitting->label(),
                'councils' => app(CouncilSittingService::class)->councils($council->sitting),
            ] : null,
            // Visioconférence affichée en bandeau sur l'écran de séance (projetable avec les fiches).
            'visio' => [
                'meeting' => ($open = app(CouncilMeetingService::class)->openFor($council)) ? ['id' => $open->id, 'type' => $open->type] : null,
                'iceServers' => CallController::iceServers(),
                'me' => ['id' => $request->user()->id, 'name' => $request->user()->name],
                'maxParticipants' => CouncilMeetingService::MAX_PARTICIPANTS,
                'canJoin' => app(CouncilMeetingService::class)->canJoin($request->user(), $council),
            ],
            'can' => [
                'conduct' => Gate::allows('conduct', $council) && $council->status === Council::IN_SESSION,
                'viewInternal' => $internal,
                'viewDiscipline' => $discipline,
            ],
            'backUrl' => Gate::allows('viewAny', Council::class) ? route('admin.councils.show', $council) : route('teacher.councils.show', $council),
        ]);
    }

    public function save(Request $request, Council $council, CouncilStudent $councilStudent): JsonResponse
    {
        abort_unless($councilStudent->council_id === $council->id, 404);
        Gate::authorize('conduct', $council);

        $data = $request->validate([
            'general_appreciation' => ['nullable', 'string', 'max:3000'],
            'review_status' => ['required', Rule::in(array_keys(CouncilStudent::REVIEW_STATUSES))],
            'decisions' => ['nullable', 'array', 'max:12'],
            'decisions.*.decision_type_id' => ['required', 'integer'],
            'decisions.*.reason' => ['nullable', 'string', 'max:1000'],
            'revision' => ['required', 'integer'],
        ]);

        // ENF-08 : verrou optimiste. Quelqu'un a enregistré cet élève entre-temps : on renvoie la version en base.
        if ((int) $data['revision'] !== $councilStudent->revision) {
            return response()->json([
                'message' => 'Cet élève a été modifié entre-temps depuis un autre poste : la version enregistrée est rechargée.',
                'code' => 'STALE',
                'current' => $this->presenter->full($councilStudent->load(['student', 'decisions']), Gate::allows('viewInternal', $council), Gate::allows('viewDiscipline', $council)),
            ], 409);
        }

        $row = $this->session->saveStudent($council, $councilStudent, $data, $request->user());

        return response()->json(['revision' => $row->revision, 'saved_at' => now()->toIso8601String()]);
    }

    public function focus(Request $request, Council $council): JsonResponse
    {
        Gate::authorize('conduct', $council);
        $data = $request->validate(['council_student_id' => ['nullable', 'integer']]);

        return response()->json(['version' => $this->session->focus($council, $data['council_student_id'] ?? null)]);
    }

    public function notes(Request $request, Council $council): JsonResponse
    {
        Gate::authorize('conduct', $council);
        $data = $request->validate(['session_notes' => ['nullable', 'string', 'max:5000']]);

        $this->session->saveNotes($council, $data['session_notes'] ?? null);

        return response()->json(['saved_at' => now()->toIso8601String()]);
    }

    public function end(Request $request, Council $council)
    {
        Gate::authorize('conduct', $council);
        $this->session->endDeliberation($council, $request->user());

        return Gate::allows('viewAny', Council::class)
            ? redirect()->route('admin.councils.show', $council)->with('success', 'Délibération terminée : le procès-verbal est en rédaction.')
            : redirect()->route('teacher.councils.show', $council)->with('success', 'Délibération terminée : le procès-verbal est en rédaction.');
    }

    // --- Vue projetée (E06) ---------------------------------------------------------------------------------------------

    public function projection(Council $council): Response
    {
        Gate::authorize('view', $council);
        $council->load(['schoolClass:id,name']);

        return Inertia::render('Council/Projection', [
            'council' => ['id' => $council->id, 'class' => $council->schoolClass?->name, 'term' => $council->term],
            'state' => $this->stateOf($council),
        ]);
    }

    /** Sondage de la projection : réponse minuscule tant que rien n'a changé. */
    public function state(Request $request, Council $council): JsonResponse
    {
        Gate::authorize('view', $council);

        $since = $request->integer('since', -1);
        $version = (int) Council::whereKey($council->id)->value('focus_version');

        if ($since === $version) {
            return response()->json(['version' => $version, 'changed' => false]);
        }

        return response()->json($this->stateOf($council->fresh()));
    }

    /** @return array<string, mixed> */
    private function stateOf(Council $council): array
    {
        $row = $council->focus_council_student_id
            ? CouncilStudent::with(['student:id,first_name,last_name', 'decisions.type:id,label'])->find($council->focus_council_student_id)
            : null;
        $summary = ClassSummary::for($council);

        return [
            'version' => $council->focus_version,
            'changed' => true,
            'status' => $council->status,
            'student' => $row ? $this->presenter->projection($row) : null,
            'summary' => ['count' => $summary['count'], 'average' => $summary['average'], 'pass_rate' => $summary['pass_rate'], 'min' => $summary['min'], 'max' => $summary['max']],
        ];
    }
}
