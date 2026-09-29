<?php

namespace App\Http\Controllers;

use App\Models\Call;
use App\Models\CallSignal;
use App\Models\Conversation;
use App\Models\User;
use App\Services\Messenger;
use App\Services\SafePush;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Appels audio/vidéo en ligne d'EEHT Connect. Le son et l'image circulent
 * directement entre les deux navigateurs (WebRTC) ; ce contrôleur ne gère que
 * la sonnerie, l'état de l'appel et l'échange des messages de mise en
 * relation (offre, réponse, candidats ICE), relevés par interrogation
 * régulière — compatible avec un hébergement mutualisé sans WebSocket.
 */
class CallController extends Controller
{
    public function __construct(private readonly Messenger $messenger) {}

    /** Serveurs STUN/TURN transmis au navigateur. */
    public static function iceServers(): array
    {
        $servers = [['urls' => ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']]];

        if ($turn = config('services.turn.url')) {
            $servers[] = [
                'urls' => array_map('trim', explode(',', $turn)),
                'username' => config('services.turn.username'),
                'credential' => config('services.turn.credential'),
            ];
        }

        return $servers;
    }

    private function present(Call $call, int $viewerId): array
    {
        $call->loadMissing('caller', 'callee');
        $other = $call->caller_id === $viewerId ? $call->callee : $call->caller;

        return [
            'id' => $call->id,
            'conversation_id' => $call->conversation_id,
            'type' => $call->type,
            'status' => $call->status,
            'direction' => $call->caller_id === $viewerId ? 'outgoing' : 'incoming',
            'other' => $other ? [
                'id' => $other->id,
                'name' => $other->name,
                'avatar' => $this->messenger->avatarUrl($other->load(Messenger::USER_RELATIONS)),
            ] : null,
            'answered_at' => $call->answered_at?->toIso8601String(),
            'created_at' => $call->created_at->toIso8601String(),
        ];
    }

    private function callOrFail(Call $call, User $user): Call
    {
        abort_unless($call->involves($user->id), 403, 'Vous ne participez pas à cet appel.');

        return $this->expireIfStale($call);
    }

    /** Un appel qui sonne depuis trop longtemps devient « manqué ». */
    private function expireIfStale(Call $call): Call
    {
        if ($call->ringExpired()) {
            $this->finish($call, 'missed');
        }

        return $call;
    }

    private function finish(Call $call, string $status): void
    {
        $updated = Call::whereKey($call->id)->whereIn('status', Call::OPEN_STATUSES)
            ->update(['status' => $status, 'ended_at' => now(), 'updated_at' => now()]);

        $call->refresh();
        if (! $updated) {
            return; // déjà terminé par l'autre partie
        }

        CallSignal::where('call_id', $call->id)->delete();

        $label = $call->type === 'video' ? '🎥 Appel vidéo' : '📞 Appel vocal';
        $body = match ($status) {
            'ended' => $call->answered_at
                ? $label.' — '.$this->duration($call->answered_at->diffInSeconds($call->ended_at))
                : $label.' manqué',
            'declined' => $label.' refusé',
            default => $label.' manqué',
        };

        // Un appel manqué est notifié ; un appel terminé est seulement journalisé.
        $this->messenger->sendSystem(
            $call->conversation,
            $body,
            ['type' => 'call', 'call_id' => $call->id, 'status' => $status, 'call_type' => $call->type],
            push: $status !== 'ended' || ! $call->answered_at,
        );
    }

    private function duration(float $seconds): string
    {
        $seconds = (int) round($seconds);
        $m = intdiv($seconds, 60);
        $s = $seconds % 60;

        return $m > 0 ? "{$m} min ".str_pad((string) $s, 2, '0', STR_PAD_LEFT).' s' : "{$s} s";
    }

    private function busy(int $userId): bool
    {
        return Call::whereIn('status', Call::OPEN_STATUSES)
            ->where(fn ($q) => $q->where('caller_id', $userId)->orWhere('callee_id', $userId))
            ->get()
            ->reject(fn (Call $c) => $this->expireIfStale($c)->status === 'missed')
            ->isNotEmpty();
    }

    public function start(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $request->user();
        $data = $request->validate(['type' => ['required', Rule::in(Call::TYPES)]]);

        abort_unless($conversation->isDirect(), 422, 'Les appels se font dans une conversation privée.');
        abort_unless($conversation->participants()->where('user_id', $me->id)->exists(), 403, 'Vous ne faites pas partie de cette conversation.');

        $calleeId = $conversation->participants()->where('user_id', '!=', $me->id)->value('user_id');
        abort_unless($calleeId, 422, 'Votre interlocuteur n’est plus disponible.');

        abort_if($this->busy($me->id), 409, 'Vous êtes déjà en communication.');
        abort_if($this->busy($calleeId), 409, 'Votre interlocuteur est déjà en communication.');

        $call = Call::create([
            'conversation_id' => $conversation->id,
            'caller_id' => $me->id,
            'callee_id' => $calleeId,
            'type' => $data['type'],
            'status' => 'ringing',
        ]);

        SafePush::send(
            User::find($calleeId),
            ($data['type'] === 'video' ? '🎥 ' : '📞 ').$me->name.' vous appelle',
            'Appuyez pour répondre dans EEHT Connect.',
            "/connect?conversation={$conversation->id}&call={$call->id}",
        );

        return response()->json(['call' => $this->present($call, $me->id)]);
    }

    /** Appel entrant qui sonne pour l'utilisateur (interrogé régulièrement). */
    public function incoming(Request $request): JsonResponse
    {
        $me = $request->user();

        $call = Call::where('callee_id', $me->id)->where('status', 'ringing')->latest('id')->first();
        if ($call) {
            $this->expireIfStale($call);
        }

        return response()->json([
            'call' => $call && $call->status === 'ringing' ? $this->present($call, $me->id) : null,
        ]);
    }

    /** État de l'appel + messages de mise en relation destinés à l'utilisateur. */
    public function show(Request $request, Call $call): JsonResponse
    {
        $me = $request->user();
        $call = $this->callOrFail($call, $me);

        $signals = CallSignal::where('call_id', $call->id)
            ->where('to_user_id', $me->id)
            ->where('id', '>', $request->integer('after'))
            ->orderBy('id')
            ->limit(200)
            ->get(['id', 'type', 'payload']);

        return response()->json([
            'call' => $this->present($call, $me->id),
            'signals' => $signals,
        ]);
    }

    public function answer(Request $request, Call $call): JsonResponse
    {
        $me = $request->user();
        $call = $this->callOrFail($call, $me);
        abort_unless($call->callee_id === $me->id, 403, 'Seule la personne appelée peut décrocher.');
        abort_unless($call->status === 'ringing', 409, 'Cet appel n’est plus disponible.');

        Call::whereKey($call->id)->where('status', 'ringing')->update(['status' => 'active', 'answered_at' => now(), 'updated_at' => now()]);

        return response()->json(['call' => $this->present($call->refresh(), $me->id)]);
    }

    public function decline(Request $request, Call $call): JsonResponse
    {
        $me = $request->user();
        $call = $this->callOrFail($call, $me);
        abort_unless($call->callee_id === $me->id, 403);

        if ($call->status === 'ringing') {
            $this->finish($call, 'declined');
        }

        return response()->json(['call' => $this->present($call->refresh(), $me->id)]);
    }

    public function hangup(Request $request, Call $call): JsonResponse
    {
        $me = $request->user();
        $call = $this->callOrFail($call, $me);

        if ($call->isOpen()) {
            // Raccrocher avant que l'autre décroche = appel annulé (manqué pour lui).
            $this->finish($call, $call->status === 'ringing' ? 'cancelled' : 'ended');
        }

        return response()->json(['call' => $this->present($call->refresh(), $me->id)]);
    }

    public function signal(Request $request, Call $call): JsonResponse
    {
        $me = $request->user();
        $call = $this->callOrFail($call, $me);
        abort_unless($call->isOpen(), 409, 'Cet appel est terminé.');

        $data = $request->validate([
            'type' => ['required', Rule::in(['offer', 'answer', 'candidate'])],
            'payload' => ['required', 'string', 'max:30000'],
        ]);

        DB::table('call_signals')->insert([
            'call_id' => $call->id,
            'to_user_id' => $call->otherParty($me->id),
            'type' => $data['type'],
            'payload' => $data['payload'],
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }
}
