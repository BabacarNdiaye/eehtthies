<?php

namespace App\Http\Controllers\Council;

use App\Http\Controllers\CallController;
use App\Http\Controllers\Controller;
use App\Models\Council;
use App\Models\CouncilMeeting;
use App\Models\CouncilMeetingSignal;
use App\Services\Council\CouncilMeetingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Visioconférence du conseil (pendant la séance). Ouvrir et terminer : qui conduit la séance ; rejoindre : les membres
 * avec un compte. Tout le reste passe en JSON, interrogé chaque seconde par la page (pas de WebSocket sur le mutualisé).
 */
class MeetingController extends Controller
{
    public function __construct(private readonly CouncilMeetingService $meetings) {}

    private function authorizeJoin(Request $request, Council $council): void
    {
        abort_unless($this->meetings->canJoin($request->user(), $council), 403);
    }

    public function show(Request $request, Council $council): Response
    {
        $this->authorizeJoin($request, $council);
        $council->load('schoolClass:id,name');
        $meeting = $this->meetings->openFor($council);

        return Inertia::render('Council/Meeting', [
            'council' => ['id' => $council->id, 'class' => $council->schoolClass?->name, 'term' => $council->term, 'status' => $council->status],
            'meeting' => $meeting ? ['id' => $meeting->id, 'type' => $meeting->type] : null,
            'canJoin' => true,
            'canConduct' => Gate::allows('conduct', $council) && $council->status === Council::IN_SESSION,
            'maxParticipants' => CouncilMeetingService::MAX_PARTICIPANTS,
            'iceServers' => CallController::iceServers(),
            'me' => ['id' => $request->user()->id, 'name' => $request->user()->name],
            'voteUrl' => route('council.vote.show', $council),
            'backUrl' => Gate::allows('viewAny', Council::class) ? route('admin.councils.show', $council) : route('teacher.councils.show', $council),
        ]);
    }

    public function start(Request $request, Council $council): JsonResponse
    {
        Gate::authorize('conduct', $council);
        $data = $request->validate(['type' => ['required', Rule::in(array_keys(CouncilMeeting::TYPES))]]);

        $this->meetings->start($council, $request->user(), $data['type']);

        return response()->json($this->meetings->poll($council->fresh(), $request->user(), 0), 201);
    }

    public function join(Request $request, Council $council): JsonResponse
    {
        $this->authorizeJoin($request, $council);
        $this->meetings->join($council, $request->user());

        return response()->json($this->meetings->poll($council->fresh(), $request->user(), 0));
    }

    public function poll(Request $request, Council $council): JsonResponse
    {
        $this->authorizeJoin($request, $council);
        $data = $request->validate(['after' => ['nullable', 'integer', 'min:0'], 'mic' => ['nullable', 'boolean'], 'cam' => ['nullable', 'boolean']]);

        return response()->json($this->meetings->poll($council, $request->user(), (int) ($data['after'] ?? 0),
            array_key_exists('mic', $data) ? (bool) $data['mic'] : null, array_key_exists('cam', $data) ? (bool) $data['cam'] : null));
    }

    public function signal(Request $request, Council $council): JsonResponse
    {
        $this->authorizeJoin($request, $council);
        $data = $request->validate([
            'to' => ['required', 'integer'],
            'type' => ['required', Rule::in(CouncilMeetingSignal::TYPES)],
            'payload' => ['required', 'string', 'max:30000'],
        ]);

        $this->meetings->signal($council, $request->user(), $data['to'], $data['type'], $data['payload']);

        return response()->json(['ok' => true]);
    }

    public function leave(Request $request, Council $council): JsonResponse
    {
        $this->authorizeJoin($request, $council);
        $this->meetings->leave($council, $request->user());

        return response()->json(['ok' => true]);
    }

    public function end(Request $request, Council $council): JsonResponse
    {
        Gate::authorize('conduct', $council);

        return response()->json(['ended' => $this->meetings->end($council, $request->user())]);
    }
}
