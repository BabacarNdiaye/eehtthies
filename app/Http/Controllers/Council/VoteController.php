<?php

namespace App\Http\Controllers\Council;

use App\Http\Controllers\Controller;
use App\Models\Council;
use App\Models\CouncilStudent;
use App\Models\CouncilVote;
use App\Models\CouncilVoteBallot;
use App\Models\DecisionType;
use App\Services\Council\VoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Votes du conseil (VOT-01 à VOT-05). Le président (CouncilPolicy::conduct) ouvre et clôt depuis le mode conseil ; les
 * membres votants présents votent depuis leur téléphone, sur une page qui interroge l'état toutes les 3 secondes. Tant
 * qu'un vote sur appareil est ouvert, personne ne voit le décompte : seulement le nombre de bulletins reçus.
 */
class VoteController extends Controller
{
    public function __construct(private readonly VoteService $votes) {}

    public function show(Request $request, Council $council): Response
    {
        Gate::authorize('view', $council);
        $council->load('schoolClass:id,name');

        return Inertia::render('Council/Vote', [
            'council' => ['id' => $council->id, 'class' => $council->schoolClass?->name, 'term' => $council->term, 'status' => $council->status],
            'state' => $this->stateFor($request, $council),
            'choices' => CouncilVote::CHOICES,
            'backUrl' => Gate::allows('viewAny', Council::class) ? route('admin.councils.show', $council) : route('teacher.councils.show', $council),
        ]);
    }

    public function state(Request $request, Council $council): JsonResponse
    {
        Gate::authorize('view', $council);

        return response()->json($this->stateFor($request, $council->fresh()));
    }

    public function store(Request $request, Council $council): JsonResponse
    {
        Gate::authorize('conduct', $council);
        $data = $request->validate([
            'council_student_id' => ['required', 'integer', Rule::exists('council_students', 'id')->where('council_id', $council->id)],
            'decision_type_id' => ['required', 'integer', 'exists:decision_types,id'],
            'mode' => ['required', Rule::in(array_keys(CouncilVote::MODES))],
        ]);

        $vote = $this->votes->open($council, CouncilStudent::findOrFail($data['council_student_id']), DecisionType::findOrFail($data['decision_type_id']), $data['mode'], $request->user());

        return response()->json(['vote' => $this->votes->present($vote)], 201);
    }

    public function ballot(Request $request, Council $council, CouncilVote $vote): JsonResponse
    {
        Gate::authorize('view', $council);
        abort_unless($vote->council_id === $council->id, 404);
        $data = $request->validate(['choice' => ['required', Rule::in(array_keys(CouncilVote::CHOICES))]]);

        $this->votes->cast($vote, $request->user(), $data['choice']);

        return response()->json($this->stateFor($request, $council->fresh()));
    }

    public function close(Request $request, Council $council, CouncilVote $vote): JsonResponse
    {
        Gate::authorize('conduct', $council);
        abort_unless($vote->council_id === $council->id, 404);
        $data = $request->validate([
            'votes_for' => ['nullable', 'integer', 'min:0', 'max:999'],
            'votes_against' => ['nullable', 'integer', 'min:0', 'max:999'],
            'abstentions' => ['nullable', 'integer', 'min:0', 'max:999'],
            'casting_choice' => ['nullable', Rule::in(['for', 'against'])],
        ]);

        $vote = $this->votes->close($vote, $request->user(), $data);

        return response()->json(['vote' => $this->votes->present($vote)]);
    }

    /**
     * État vu par la personne connectée : le vote en cours (ce qu'elle peut faire), le dernier résultat ; pour le
     * président, le vote en cours avec le nombre de bulletins reçus.
     *
     * @return array<string, mixed>
     */
    private function stateFor(Request $request, Council $council): array
    {
        $user = $request->user();
        $open = $this->votes->openVote($council);
        $member = $this->votes->memberFor($council, $user);
        $last = CouncilVote::with('type:id,label', 'councilStudent.student:id,first_name,last_name')
            ->where('council_id', $council->id)->whereNotNull('closed_at')->latest('id')->first();
        $conduct = Gate::allows('conduct', $council);

        $vote = null;
        if ($open) {
            $open->loadMissing('type:id,label', 'councilStudent.student:id,first_name,last_name');
            $vote = [
                'id' => $open->id,
                'student' => $open->councilStudent?->student?->full_name,
                'decision' => $open->type?->label,
                'mode' => $open->mode,
                'mode_label' => CouncilVote::MODES[$open->mode] ?? $open->mode,
                'secrecy' => $open->secrecy,
                'can_vote' => $open->mode === 'device' && $member !== null,
                'has_voted' => $member !== null && CouncilVoteBallot::where('council_vote_id', $open->id)->where('council_member_id', $member->id)->exists(),
                'ballots' => $open->ballots()->count(),
                'voters_present' => $open->voters_present,
            ];
        }

        return [
            'status' => $council->status,
            'is_voter' => $member !== null,
            'vote' => $vote,
            'last' => $last ? [
                'id' => $last->id,
                'student' => $last->councilStudent?->student?->full_name,
                'decision' => $last->type?->label,
                'result' => $last->result,
                'result_label' => CouncilVote::RESULTS[$last->result] ?? $last->result,
                'tie_broken' => $last->tie_broken,
            ] : null,
            'manage' => $conduct && $open ? $this->votes->present($open) : null,
        ];
    }
}
