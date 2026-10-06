<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\ConversationParticipant;
use App\Models\MessageReaction;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\Ai\AssistantUnavailable;
use App\Services\Ai\ConnectAssistant;
use App\Services\ClassGroupSync;
use App\Services\Messenger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * EEHT Connect — messagerie interne unique, partagée par tous les profils
 * (élèves, enseignants, parents, personnel). La page est une application
 * React qui dialogue avec les points d'accès JSON ci-dessous.
 */
class ConnectController extends Controller
{
    /** Types de pièces jointes acceptés (documents, images, notes vocales). */
    private const ATTACHMENT_MIMES = 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif,webp,webm,ogg,oga,mp3,m4a,wav';

    public function __construct(
        private readonly Messenger $messenger,
        private readonly ClassGroupSync $classGroups,
        private readonly ConnectAssistant $assistant,
    ) {}

    private function me(Request $request): User
    {
        return $request->user()->load(Messenger::USER_RELATIONS);
    }

    private function participantOrFail(Conversation $conversation, User $user): ConversationParticipant
    {
        $participant = $conversation->participants()->where('user_id', $user->id)->first();
        abort_unless($participant, 403, 'Vous ne faites pas partie de cette conversation.');

        return $participant;
    }

    private function canCreateGroups(User $user): bool
    {
        return (bool) $user->teacher || $this->messenger->isStaffUser($user);
    }

    /** Qui peut écrire à qui : les parents échangent avec les enseignants et le personnel ; seul le personnel écrit aux parents. */
    private function canContact(User $me, User $target): bool
    {
        if ($me->id === $target->id || ! $target->is_active) {
            return false;
        }

        $meIsParent = $me->roles->contains('name', 'parent') && ! $me->teacher && ! $me->student;
        $targetIsParent = $target->roles->contains('name', 'parent') && ! $target->teacher && ! $target->student;

        if ($meIsParent) {
            return (bool) $target->teacher || $this->messenger->isStaffUser($target);
        }
        if ($targetIsParent) {
            return $this->messenger->isStaffUser($me);
        }

        return true;
    }

    /** @return array{prefix: string, home: string, password: ?string, calendar: ?string} */
    private function spaceLinks(User $user): array
    {
        $prefix = match (true) {
            $user->student !== null && $user->hasRole('eleve') => 'student',
            $user->teacher !== null && $user->hasRole('enseignant') => 'teacher',
            $user->hasRole('parent') => 'parent',
            default => 'admin',
        };

        $url = fn (string $name) => Route::has($name) ? route($name) : null;

        return [
            'prefix' => $prefix,
            'home' => $url("{$prefix}.dashboard") ?? route('home'),
            'password' => $url("{$prefix}.password"),
            'calendar' => $url("{$prefix}.timetable") ?? $url('admin.timetable.index') ?? $url('events.index'),
        ];
    }

    public function index(Request $request): Response
    {
        $me = $this->me($request);

        return Inertia::render('Connect/Index', [
            'me' => $this->messenger->profile($me),
            'canCreateGroups' => $this->canCreateGroups($me),
            'links' => $this->spaceLinks($me),
            'calls' => [
                'iceServers' => CallController::iceServers(),
            ],
            'ai' => [
                'enabled' => $this->assistant->enabled(),
                'languages' => ConnectAssistant::LANGUAGES,
            ],
            'initial' => [
                'conversation' => $request->integer('conversation') ?: null,
                'class' => $request->integer('class') ?: null,
                'user' => $request->integer('user') ?: null,
                'call' => $request->integer('call') ?: null,
                'answer' => $request->boolean('answer'),
                'section' => $request->string('section')->value() ?: null,
            ],
        ]);
    }

    // -----------------------------------------------------------------
    // Conversations
    // -----------------------------------------------------------------

    private function summaries(User $me, $conversations): array
    {
        $unread = $this->messenger->unreadCounts($me->id);
        $mentions = $this->messenger->unreadMentionCounts($me->id);
        // « écrit… » dans la liste : une seule lecture du cache pour toutes les conversations.
        $typing = $conversations->isEmpty() ? [] : Cache::many($conversations->map(fn ($c) => $this->typingKey($c))->all());

        return $conversations->map(function (Conversation $c) use ($me, $unread, $mentions, $typing) {
            $mine = $c->participants->firstWhere('user_id', $me->id);
            $last = $c->latestMessage;
            $other = $c->isDirect() ? $c->participants->firstWhere('user_id', '!=', $me->id)?->user : null;

            return [
                'id' => $c->id,
                'type' => $c->type,
                'is_class' => $c->isClassGroup(),
                'name' => $c->isDirect() ? ($other?->name ?? 'Utilisateur supprimé') : $c->name,
                'avatar' => $other ? $this->messenger->avatarUrl($other) : $c->avatarUrl(),
                'other' => $other ? $this->messenger->presentUser($other) : null,
                'members_count' => $c->participants->count(),
                'is_favorite' => (bool) $mine?->is_favorite,
                'muted' => (bool) $mine?->isMuted(),
                'muted_until' => $mine?->isMuted() ? $mine->muted_until->toIso8601String() : null,
                'unread' => $unread[$c->id] ?? 0,
                'mentions' => $mentions[$c->id] ?? 0,
                'typing' => $this->activeTypists($typing[$this->typingKey($c)] ?? null, $me),
                'last' => $last ? [
                    'body' => $last->isRetracted() ? '🚫 Message supprimé' : ($last->body ?? ($last->attachment_name ? '📎 '.$last->attachment_name : '')),
                    'sender_name' => $last->user_id === $me->id ? 'Vous' : ($last->user?->name ?? ($last->isSystem() ? 'EEHT Connect' : null)),
                    'created_at' => $last->created_at->toIso8601String(),
                ] : null,
                'last_message_at' => ($c->last_message_at ?? $c->created_at)->toIso8601String(),
            ];
        })->sortByDesc('last_message_at')->values()->all();
    }

    private function conversationQuery(User $me)
    {
        return Conversation::forUser($me->id)->with([
            'participants.user' => fn ($q) => $q->with(Messenger::USER_RELATIONS),
            'latestMessage.user:id,name',
        ]);
    }

    public function conversations(Request $request): JsonResponse
    {
        $me = $this->me($request);
        $this->classGroups->syncForUser($me);

        return response()->json(['conversations' => $this->summaries($me, $this->conversationQuery($me)->get())]);
    }

    public function conversationForClass(Request $request, int $schoolClass): JsonResponse
    {
        $me = $this->me($request);
        $this->classGroups->syncForUser($me);

        $conversation = Conversation::where('school_class_id', $schoolClass)->forUser($me->id)->firstOrFail();

        return response()->json(['id' => $conversation->id]);
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $participant = $this->participantOrFail($conversation, $me);
        $afterId = $request->integer('after');
        $beforeId = $request->integer('before');
        $aroundId = $request->integer('around');

        $query = fn () => $conversation->messages()->with(Messenger::MESSAGE_RELATIONS);
        $isAdmin = $this->messenger->isGroupAdmin($conversation, $me);
        $present = fn ($m) => $this->messenger->presentMessage($m, $me->id, $isAdmin);
        $hasNewer = false;

        if ($afterId) {
            $messages = $query()->where('id', '>', $afterId)->orderBy('id')->limit(200)->get();
        } elseif ($aroundId) {
            // Saut vers un message (résultat de recherche, citation, épingle).
            $older = $query()->where('id', '<=', $aroundId)->orderByDesc('id')->limit(25)->get()->reverse();
            $newer = $query()->where('id', '>', $aroundId)->orderBy('id')->limit(25)->get();
            $messages = $older->concat($newer)->values();
            $hasNewer = $newer->isNotEmpty() && $conversation->messages()->where('id', '>', $newer->last()->id)->exists();
        } else {
            $messages = $query()->when($beforeId, fn ($q) => $q->where('id', '<', $beforeId))
                ->orderByDesc('id')->limit(50)->get()->reverse()->values();
        }

        $latestId = $conversation->messages()->max('id');
        if (! $hasNewer && $latestId && $latestId > (int) $participant->last_read_message_id) {
            $participant->update(['last_read_message_id' => $latestId]);
        }

        // Réactions / épingles modifiées depuis le dernier passage (messages déjà affichés).
        $changed = [];
        if ($afterId && $request->filled('since')) {
            $changed = $query()->where('id', '<=', $afterId)
                ->where('updated_at', '>', Carbon::parse($request->string('since')->value()))
                ->limit(100)->get()
                ->map($present)->all();
        }

        // Lu par tous les autres jusqu'à cet id (coches de lecture).
        $othersReadUpTo = $conversation->participants()->where('user_id', '!=', $me->id)->min(DB::raw('COALESCE(last_read_message_id, 0)'));

        $other = null;
        if ($conversation->isDirect()) {
            $otherUser = $conversation->participants()->where('user_id', '!=', $me->id)->first()?->user;
            $other = $otherUser ? $this->messenger->presentUser($otherUser->load(Messenger::USER_RELATIONS)) : null;
        }

        $pinned = $conversation->messages()->whereNotNull('pinned_at')->with('user:id,name')->latest('pinned_at')->limit(5)->get()
            ->map(fn ($m) => ['id' => $m->id, 'sender_name' => $m->user?->name ?? 'EEHT Connect', 'body' => $m->body ? mb_strimwidth($m->body, 0, 120, '…') : ($m->attachment_name ? '📎 '.$m->attachment_name : '')]);

        // Positions de lecture des autres membres d'un groupe (« Vu par N »).
        $readPositions = $conversation->isDirect() || $conversation->isAssistant() ? [] : $conversation->participants()
            ->where('user_id', '!=', $me->id)->pluck('last_read_message_id')->map(fn ($id) => (int) $id)->all();

        $canWrite = ! $conversation->isAssistant() && (! $conversation->only_admins_can_write || $isAdmin);

        return response()->json([
            'messages' => $messages->map($present)->all(),
            'changed' => $changed,
            'has_more' => ! $afterId && $messages->isNotEmpty() && $conversation->messages()->where('id', '<', $messages->first()->id)->exists(),
            'has_newer' => $hasNewer,
            'others_read_up_to' => (int) $othersReadUpTo,
            'other' => $other,
            'pinned' => $pinned,
            'can_write' => $canWrite,
            'write_restricted' => ! $canWrite && ! $conversation->isAssistant(),
            'can_pin' => $this->canPin($conversation, $me),
            'is_admin' => $isAdmin,
            'typing' => $this->typingNames($conversation, $me),
            'read_positions' => $readPositions,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    private function canPin(Conversation $conversation, User $user): bool
    {
        return match (true) {
            $conversation->isDirect(), $conversation->isAssistant() => true,
            $conversation->isClassGroup() => (bool) $user->teacher || $this->messenger->isStaffUser($user),
            default => (bool) $conversation->participants()->where('user_id', $user->id)->value('is_admin')
                || $this->messenger->isStaffUser($user),
        };
    }

    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $this->participantOrFail($conversation, $me);
        abort_if($conversation->isAssistant(), 422, "L'assistant EEHT Connect ne reçoit pas de messages.");
        abort_if(
            $conversation->only_admins_can_write && ! $this->messenger->isGroupAdmin($conversation, $me),
            403,
            'Seuls les administrateurs du groupe peuvent envoyer des messages.',
        );

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000', 'required_without:attachment'],
            'attachment' => ['nullable', 'file', 'mimes:'.self::ATTACHMENT_MIMES, 'max:10240'],
            'reply_to_id' => ['nullable', 'integer', Rule::exists('conversation_messages', 'id')->where('conversation_id', $conversation->id)],
            'mention_ids' => ['nullable', 'array', 'max:100'],
            'mention_ids.*' => ['integer'],
        ]);

        $message = $this->messenger->send(
            $conversation,
            $me,
            $data['body'] ?? null,
            $request->file('attachment'),
            replyTo: isset($data['reply_to_id']) ? ConversationMessage::find($data['reply_to_id']) : null,
            mentionIds: array_map('intval', $data['mention_ids'] ?? []),
        );
        $this->stopTyping($conversation, $me);

        return response()->json(['message' => $this->messenger->presentMessage($message->load(Messenger::MESSAGE_RELATIONS), $me->id)]);
    }

    /** Modifier son message (texte), dans les 15 minutes suivant l'envoi. */
    public function updateMessage(Request $request, ConversationMessage $message): JsonResponse
    {
        $me = $this->me($request);
        $this->participantOrFail($message->conversation, $me);
        abort_unless($message->editableBy($me->id), 403, 'Ce message ne peut plus être modifié (délai de '.ConversationMessage::EDIT_WINDOW_MINUTES.' minutes dépassé).');

        $data = $request->validate(['body' => ['required', 'string', 'max:5000']]);
        $body = trim($data['body']);
        abort_if($body === '', 422, 'Le message ne peut pas être vide.');

        if ($body !== $message->body) {
            $message->forceFill(['body' => $body, 'edited_at' => now()])->save();
        }

        return response()->json(['message' => $this->messenger->presentMessage($message->fresh(Messenger::MESSAGE_RELATIONS), $me->id)]);
    }

    /** Supprimer un message pour tout le monde (auteur dans les 24 h, ou administrateur du groupe). */
    public function destroyMessage(Request $request, ConversationMessage $message): JsonResponse
    {
        $me = $this->me($request);
        $conversation = $message->conversation;
        $this->participantOrFail($conversation, $me);

        $isAdmin = $this->messenger->isGroupAdmin($conversation, $me);
        abort_if($message->isSystem() || $message->isRetracted(), 422, 'Ce message ne peut pas être supprimé.');
        abort_unless(
            $message->retractableBy($me->id) || ($isAdmin && $message->user_id !== $me->id),
            403,
            'Vous ne pouvez plus supprimer ce message pour tout le monde.',
        );

        $this->messenger->retract($message, $me);

        return response()->json(['message' => $this->messenger->presentMessage($message->fresh(Messenger::MESSAGE_RELATIONS), $me->id, $isAdmin)]);
    }

    /** Qui a lu mon message (groupes : « Vu par »). */
    public function readers(Request $request, ConversationMessage $message): JsonResponse
    {
        $me = $request->user();
        $this->participantOrFail($message->conversation, $me);
        abort_unless($message->user_id === $me->id, 403, 'Seul l’auteur du message peut voir qui l’a lu.');

        $participants = $message->conversation->participants()
            ->where('user_id', '!=', $me->id)
            ->with(['user' => fn ($q) => $q->with(Messenger::USER_RELATIONS)])
            ->get()
            ->filter(fn ($p) => $p->user);

        [$read, $unread] = $participants->partition(fn ($p) => (int) $p->last_read_message_id >= $message->id);
        $present = fn ($list) => $list->map(fn ($p) => $this->messenger->presentUser($p->user))->sortBy('name')->values();

        return response()->json(['read' => $present($read), 'unread' => $present($unread)]);
    }

    // -----------------------------------------------------------------
    // « En train d'écrire… » (mémorisé quelques secondes dans le cache)
    // -----------------------------------------------------------------

    private const TYPING_SECONDS = 8;

    private function typingKey(Conversation $conversation): string
    {
        return "connect:typing:{$conversation->id}";
    }

    /** @return array<int, string> */
    private function typingNames(Conversation $conversation, User $me): array
    {
        return $this->activeTypists(Cache::get($this->typingKey($conversation)), $me);
    }

    /**
     * @param  array<int, array{name: string, until: int}>|null  $list
     * @return array<int, string> noms des autres personnes en train d'écrire
     */
    private function activeTypists(?array $list, User $me): array
    {
        $now = now()->timestamp;

        return collect($list ?? [])
            ->filter(fn ($t, $userId) => (int) $userId !== $me->id && $t['until'] >= $now)
            ->pluck('name')->values()->all();
    }

    private function stopTyping(Conversation $conversation, User $me): void
    {
        $list = Cache::get($this->typingKey($conversation), []);
        if (isset($list[$me->id])) {
            unset($list[$me->id]);
            Cache::put($this->typingKey($conversation), $list, 60);
        }
    }

    public function typing(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $request->user();
        $this->participantOrFail($conversation, $me);

        $now = now()->timestamp;
        $list = collect(Cache::get($this->typingKey($conversation), []))
            ->filter(fn ($t) => $t['until'] >= $now)
            ->all();
        $list[$me->id] = ['name' => $me->name, 'until' => $now + self::TYPING_SECONDS];
        Cache::put($this->typingKey($conversation), $list, 60);

        return response()->json(['ok' => true]);
    }

    public function react(Request $request, ConversationMessage $message): JsonResponse
    {
        $me = $request->user();
        $this->participantOrFail($message->conversation, $me);
        abort_if($message->isRetracted(), 422, 'Ce message a été supprimé.');
        $data = $request->validate(['emoji' => ['required', 'string', Rule::in(MessageReaction::ALLOWED)]]);

        $existing = $message->reactions()->where('user_id', $me->id)->where('emoji', $data['emoji'])->first();
        $existing ? $existing->delete() : $message->reactions()->create(['user_id' => $me->id, 'emoji' => $data['emoji']]);
        $message->touch();

        return response()->json(['message' => $this->messenger->presentMessage($message->fresh(Messenger::MESSAGE_RELATIONS), $me->id)]);
    }

    public function pin(Request $request, ConversationMessage $message): JsonResponse
    {
        $me = $this->me($request);
        $this->participantOrFail($message->conversation, $me);
        abort_unless($this->canPin($message->conversation, $me), 403, 'Seuls les enseignants et les responsables du groupe peuvent épingler.');
        abort_if($message->isRetracted(), 422, 'Ce message a été supprimé.');

        $message->forceFill($message->pinned_at
            ? ['pinned_at' => null, 'pinned_by' => null]
            : ['pinned_at' => now(), 'pinned_by' => $me->id])->save();

        return response()->json(['message' => $this->messenger->presentMessage($message->fresh(Messenger::MESSAGE_RELATIONS), $me->id)]);
    }

    /** Recherche plein texte dans les messages et fichiers de toutes mes conversations. */
    public function search(Request $request): JsonResponse
    {
        $me = $request->user();
        $q = trim($request->string('q')->value());

        if (mb_strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $like = "%{$q}%";

        $results = ConversationMessage::whereIn('conversation_id', ConversationParticipant::where('user_id', $me->id)->select('conversation_id'))
            ->where(fn ($w) => $w->where('body', 'like', $like)->orWhere('attachment_name', 'like', $like)->orWhere('subject', 'like', $like))
            ->with('user:id,name', 'conversation.participants.user:id,name')
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(function (ConversationMessage $m) use ($me, $q) {
                $conversation = $m->conversation;
                $text = $m->body ?? $m->attachment_name ?? '';
                $pos = mb_stripos($text, $q);
                $start = max(0, ($pos === false ? 0 : $pos) - 40);
                if ($start > 0 && ($space = mb_strpos($text, ' ', $start)) !== false && $space < ($pos ?: $start)) {
                    $start = $space + 1; // l'extrait commence sur un mot entier
                }

                return [
                    'id' => $m->id,
                    'conversation_id' => $conversation->id,
                    'conversation_name' => match (true) {
                        $conversation->isDirect() => $conversation->participants->firstWhere('user_id', '!=', $me->id)?->user?->name ?? 'Conversation',
                        default => $conversation->name,
                    },
                    'conversation_type' => $conversation->type,
                    'sender_name' => $m->user?->name ?? 'EEHT Connect',
                    'snippet' => ($start > 0 ? '…' : '').mb_substr($text, $start, 160).(mb_strlen($text) > $start + 160 ? '…' : ''),
                    'is_file' => $m->body === null && $m->attachment_name !== null,
                    'created_at' => $m->created_at->toIso8601String(),
                ];
            });

        return response()->json(['results' => $results]);
    }

    public function attachment(Request $request, ConversationMessage $message)
    {
        $this->participantOrFail($message->conversation, $request->user());
        abort_unless($message->attachment_path, 404);

        // Nouvelles pièces jointes : disque privé ; anciennes (reprises de
        // l'ancienne messagerie) : disque public.
        $disk = Storage::disk('local')->exists($message->attachment_path) ? 'local' : 'public';
        abort_unless(Storage::disk($disk)->exists($message->attachment_path), 404);

        $disposition = $request->boolean('download') ? 'attachment' : 'inline';

        return Storage::disk($disk)->response($message->attachment_path, $message->attachment_name, [], $disposition);
    }

    public function openDirect(Request $request): JsonResponse
    {
        $me = $this->me($request);
        $data = $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);
        $target = User::with(Messenger::USER_RELATIONS)->findOrFail($data['user_id']);

        abort_unless($this->canContact($me, $target), 403, 'Vous ne pouvez pas écrire à cette personne.');

        $conversation = $this->messenger->directConversation($me, $target);

        return response()->json(['id' => $conversation->id]);
    }

    public function storeGroup(Request $request): JsonResponse
    {
        $me = $this->me($request);
        abort_unless($this->canCreateGroups($me), 403, 'Seuls le personnel et les enseignants peuvent créer un groupe.');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'member_ids' => ['required', 'array', 'min:1', 'max:500'],
            'member_ids.*' => ['integer', 'distinct', Rule::exists('users', 'id')->where('is_active', true)],
        ]);

        $conversation = DB::transaction(function () use ($me, $data) {
            $conversation = Conversation::create([
                'type' => Conversation::TYPE_GROUP,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'created_by' => $me->id,
            ]);

            $conversation->participants()->create(['user_id' => $me->id, 'is_admin' => true]);
            foreach (array_diff(array_map('intval', $data['member_ids']), [$me->id]) as $userId) {
                $conversation->participants()->create(['user_id' => $userId]);
            }

            return $conversation;
        });

        return response()->json(['id' => $conversation->id]);
    }

    public function toggleFavorite(Request $request, Conversation $conversation): JsonResponse
    {
        $participant = $this->participantOrFail($conversation, $request->user());
        $participant->update(['is_favorite' => ! $participant->is_favorite]);

        return response()->json(['is_favorite' => $participant->is_favorite]);
    }

    /** Couper les notifications : 60 / 480 / 10080 minutes, « toujours » (null) ou réactiver (0). */
    public function mute(Request $request, Conversation $conversation): JsonResponse
    {
        $participant = $this->participantOrFail($conversation, $request->user());
        $data = $request->validate(['minutes' => ['present', 'nullable', 'integer', Rule::in([0, 60, 480, 10080])]]);

        $participant->update(['muted_until' => match (true) {
            $data['minutes'] === null => ConversationParticipant::MUTED_FOREVER,
            (int) $data['minutes'] === 0 => null,
            default => now()->addMinutes((int) $data['minutes']),
        }]);

        return response()->json([
            'muted' => $participant->isMuted(),
            'muted_until' => $participant->isMuted() ? $participant->muted_until->toIso8601String() : null,
        ]);
    }

    // -----------------------------------------------------------------
    // Gestion des groupes (administrateurs)
    // -----------------------------------------------------------------

    private function groupAdminOrFail(Conversation $conversation, User $me): void
    {
        $this->participantOrFail($conversation, $me);
        abort_unless($this->messenger->isGroupAdmin($conversation, $me), 403, 'Seuls les administrateurs du groupe peuvent faire cette modification.');
    }

    /** Groupe libre (les membres des groupes de classe sont gérés automatiquement). */
    private function editableGroupOrFail(Conversation $conversation): void
    {
        abort_unless($conversation->type === Conversation::TYPE_GROUP && ! $conversation->isClassGroup(), 422, 'Les membres d’un groupe de classe sont mis à jour automatiquement.');
    }

    private function logGroupEvent(Conversation $conversation, string $text): void
    {
        $this->messenger->sendSystem($conversation, $text, ['type' => 'group'], push: false);
    }

    public function updateGroup(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $this->groupAdminOrFail($conversation, $me);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'only_admins_can_write' => ['sometimes', 'boolean'],
        ]);

        if ($conversation->isClassGroup()) {
            // Le nom d'un groupe de classe suit celui de la classe.
            unset($data['name']);
        }

        if (isset($data['name']) && $data['name'] !== $conversation->name) {
            $this->logGroupEvent($conversation, "{$me->name} a renommé le groupe en « {$data['name']} ».");
        }
        if (array_key_exists('only_admins_can_write', $data) && (bool) $data['only_admins_can_write'] !== $conversation->only_admins_can_write) {
            $this->logGroupEvent($conversation, $data['only_admins_can_write']
                ? "{$me->name} a réservé l'envoi de messages aux administrateurs."
                : "{$me->name} a autorisé tous les membres à envoyer des messages.");
        }

        $conversation->update($data);

        return response()->json(['ok' => true]);
    }

    public function updateGroupAvatar(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $this->groupAdminOrFail($conversation, $me);
        $request->validate(['avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096']]);

        if ($conversation->avatar_path) {
            Storage::disk('public')->delete($conversation->avatar_path);
        }
        $path = $request->file('avatar')?->store('connect-groups', 'public');
        $conversation->update(['avatar_path' => $path]);
        $this->logGroupEvent($conversation, $path ? "{$me->name} a changé la photo du groupe." : "{$me->name} a retiré la photo du groupe.");

        return response()->json(['avatar' => $conversation->avatarUrl()]);
    }

    public function addMembers(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $this->groupAdminOrFail($conversation, $me);
        $this->editableGroupOrFail($conversation);

        $data = $request->validate([
            'user_ids' => ['required', 'array', 'min:1', 'max:200'],
            'user_ids.*' => ['integer', 'distinct', Rule::exists('users', 'id')->where('is_active', true)],
        ]);

        $existing = $conversation->participants()->pluck('user_id')->all();
        $latestId = $conversation->messages()->max('id');
        $added = User::whereIn('id', array_diff(array_map('intval', $data['user_ids']), $existing))->orderBy('name')->get();

        foreach ($added as $user) {
            // Le nouveau membre voit l'historique sans qu'il compte comme non lu.
            $conversation->participants()->create(['user_id' => $user->id, 'last_read_message_id' => $latestId]);
        }

        if ($added->isNotEmpty()) {
            $this->logGroupEvent($conversation, "{$me->name} a ajouté ".$added->pluck('name')->join(', ', ' et ').'.');
        }

        return response()->json(['added' => $added->count()]);
    }

    public function removeMember(Request $request, Conversation $conversation, User $user): JsonResponse
    {
        $me = $this->me($request);
        $this->groupAdminOrFail($conversation, $me);
        $this->editableGroupOrFail($conversation);
        abort_if($user->id === $me->id, 422, 'Pour partir, utilisez « Quitter le groupe ».');

        $removed = $conversation->participants()->where('user_id', $user->id)->delete();
        if ($removed) {
            $this->logGroupEvent($conversation, "{$me->name} a retiré {$user->name} du groupe.");
        }

        return response()->json(['ok' => true]);
    }

    public function toggleAdmin(Request $request, Conversation $conversation, User $user): JsonResponse
    {
        $me = $this->me($request);
        $this->groupAdminOrFail($conversation, $me);
        $this->editableGroupOrFail($conversation);

        $participant = $conversation->participants()->where('user_id', $user->id)->firstOrFail();

        if ($participant->is_admin && $conversation->participants()->where('is_admin', true)->count() === 1) {
            abort(422, 'Le groupe doit garder au moins un administrateur.');
        }

        $participant->update(['is_admin' => ! $participant->is_admin]);
        $this->logGroupEvent($conversation, $participant->is_admin
            ? "{$me->name} a nommé {$user->name} administrateur du groupe."
            : "{$user->name} n'est plus administrateur du groupe.");

        return response()->json(['is_admin' => $participant->is_admin]);
    }

    public function markUnread(Request $request, Conversation $conversation): JsonResponse
    {
        $participant = $this->participantOrFail($conversation, $request->user());
        $lastFromOthers = $conversation->messages()->where('user_id', '!=', $request->user()->id)->max('id');

        if ($lastFromOthers) {
            $previous = $conversation->messages()->where('id', '<', $lastFromOthers)->max('id');
            $participant->update(['last_read_message_id' => $previous]);
        }

        return response()->json(['ok' => true]);
    }

    public function leave(Request $request, Conversation $conversation): JsonResponse
    {
        $participant = $this->participantOrFail($conversation, $request->user());
        abort_if($conversation->isDirect() || $conversation->isClassGroup() || $conversation->isAssistant(), 422, 'Vous ne pouvez pas quitter cette conversation.');

        $participant->delete();

        if (! $conversation->participants()->exists()) {
            $conversation->delete();
        }

        return response()->json(['ok' => true]);
    }

    /** Panneau de droite : fiche de l'interlocuteur ou membres du groupe, fichiers partagés, groupes communs. */
    public function details(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $this->participantOrFail($conversation, $me);

        $files = $conversation->messages()->whereNotNull('attachment_path')->latest('id')->limit(6)->get()
            ->map(fn ($m) => $this->messenger->presentMessage($m)['attachment'] + ['created_at' => $m->created_at->toIso8601String()]);

        $payload = ['files' => $files, 'files_count' => $conversation->messages()->whereNotNull('attachment_path')->count()];

        if ($conversation->isDirect()) {
            $this->classGroups->syncForUser($me);
            $other = $conversation->participants()->where('user_id', '!=', $me->id)->first()?->user;
            $payload['profile'] = $other ? $this->messenger->profile($other->load(Messenger::USER_RELATIONS)) : null;
            $payload['common_groups'] = $other
                ? Conversation::where('type', Conversation::TYPE_GROUP)->forUser($me->id)->forUser($other->id)
                    ->withCount('participants')->orderBy('name')->get()
                    ->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'members_count' => $g->participants_count, 'is_class' => $g->isClassGroup()])
                : [];
        } else {
            $members = $conversation->participants()->with(['user' => fn ($q) => $q->with(Messenger::USER_RELATIONS)])->get();
            $payload['group'] = [
                'name' => $conversation->name,
                'description' => $conversation->description ?? match (true) {
                    $conversation->isClassGroup() => 'Groupe de la classe : élèves et enseignants.',
                    $conversation->isAssistant() => 'Vos rappels automatiques : examens, devoirs, changements d\'emploi du temps et absences.',
                    default => null,
                },
                'is_class' => $conversation->isClassGroup(),
                'avatar' => $conversation->avatarUrl(),
                'only_admins_can_write' => $conversation->only_admins_can_write,
                'can_manage' => $this->messenger->isGroupAdmin($conversation, $me),
                'can_manage_members' => $this->messenger->isGroupAdmin($conversation, $me) && $conversation->type === Conversation::TYPE_GROUP && ! $conversation->isClassGroup(),
                'can_leave' => ! $conversation->isClassGroup() && ! $conversation->isAssistant(),
                'members' => $members->filter(fn ($p) => $p->user)->map(fn ($p) => [
                    ...$this->messenger->presentUser($p->user),
                    'is_admin' => $p->is_admin,
                ])->sortBy([['online', 'desc'], ['name', 'asc']])->values(),
            ];
        }

        return response()->json($payload);
    }

    // -----------------------------------------------------------------
    // Contacts, annonces, documents, compteur
    // -----------------------------------------------------------------

    public function contacts(Request $request): JsonResponse
    {
        $me = $this->me($request);
        $search = trim($request->string('q')->value());
        $role = $request->string('role')->value();

        $studentUserIds = Student::where('status', 'actif')->whereNotNull('user_id')->pluck('user_id');
        $teacherUserIds = Teacher::whereNotNull('user_id')->pluck('user_id');
        $staffIds = User::adminStaff()->pluck('id');
        $parentIds = User::whereHas('roles', fn ($r) => $r->where('name', 'parent'))->pluck('id');

        $ids = match ($role) {
            'eleve' => $studentUserIds,
            'enseignant' => $teacherUserIds,
            'administration' => $staffIds,
            'parent' => $parentIds,
            default => $studentUserIds->merge($teacherUserIds)->merge($staffIds)->merge($parentIds),
        };

        $users = User::whereIn('id', $ids->unique())
            ->where('is_active', true)
            ->where('id', '!=', $me->id)
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->with(Messenger::USER_RELATIONS)
            ->orderBy('name')
            ->limit(200)
            ->get()
            ->filter(fn (User $u) => $this->canContact($me, $u))
            ->values();

        return response()->json([
            'contacts' => $users->map(fn (User $u) => $this->messenger->presentUser($u))->all(),
        ]);
    }

    public function announcements(Request $request): JsonResponse
    {
        $announcements = $request->user()->announcementsReceived()
            ->with('createdBy:id,name')
            ->orderByDesc('announcements.created_at')
            ->limit(100)
            ->get()
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'body' => $a->body,
                'priority' => $a->priority,
                'author' => $a->createdBy?->name,
                'created_at' => $a->created_at->toIso8601String(),
                'read' => $a->pivot->read_at !== null,
            ]);

        return response()->json(['announcements' => $announcements]);
    }

    public function readAnnouncement(Request $request, Announcement $announcement): JsonResponse
    {
        $request->user()->announcementsReceived()->updateExistingPivot($announcement->id, ['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function documents(Request $request): JsonResponse
    {
        $me = $request->user();
        $search = trim($request->string('q')->value());

        $documents = ConversationMessage::whereNotNull('attachment_path')
            ->whereIn('conversation_id', ConversationParticipant::where('user_id', $me->id)->select('conversation_id'))
            ->when($search !== '', fn ($q) => $q->where('attachment_name', 'like', "%{$search}%"))
            ->with('user:id,name', 'conversation.participants.user:id,name')
            ->latest('id')
            ->limit(200)
            ->get()
            ->map(function (ConversationMessage $m) use ($me) {
                $conversation = $m->conversation;
                $name = $conversation->isDirect()
                    ? ($conversation->participants->firstWhere('user_id', '!=', $me->id)?->user?->name ?? 'Conversation')
                    : $conversation->name;

                return [
                    ...$this->messenger->presentMessage($m)['attachment'],
                    'id' => $m->id,
                    'sender_name' => $m->user?->name,
                    'conversation_id' => $conversation->id,
                    'conversation_name' => $name,
                    'created_at' => $m->created_at->toIso8601String(),
                ];
            });

        return response()->json(['documents' => $documents]);
    }

    // -----------------------------------------------------------------
    // Assistant IA
    // -----------------------------------------------------------------

    private function withAssistant(callable $callback): JsonResponse
    {
        abort_unless($this->assistant->enabled(), 404, "L'assistant IA n'est pas activé.");

        try {
            return response()->json($callback());
        } catch (AssistantUnavailable $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }
    }

    public function aiSuggest(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $request->user();
        $this->participantOrFail($conversation, $me);

        return $this->withAssistant(fn () => ['suggestions' => $this->assistant->suggestReplies($conversation, $me)]);
    }

    public function aiSummarize(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $request->user();
        $this->participantOrFail($conversation, $me);

        return $this->withAssistant(fn () => $this->assistant->summarize($conversation, $me));
    }

    public function aiRewrite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'text' => ['required', 'string', 'max:5000'],
            'mode' => ['required', Rule::in(array_keys(ConnectAssistant::REWRITE_MODES))],
        ]);

        return $this->withAssistant(fn () => ['text' => $this->assistant->rewrite($data['text'], $data['mode'])]);
    }

    public function aiTranslate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'text' => ['required_without:message_id', 'nullable', 'string', 'max:5000'],
            'message_id' => ['nullable', 'integer', 'exists:conversation_messages,id'],
            'language' => ['required', Rule::in(array_keys(ConnectAssistant::LANGUAGES))],
        ]);

        $text = $data['text'] ?? null;
        if (! empty($data['message_id'])) {
            $message = ConversationMessage::findOrFail($data['message_id']);
            $this->participantOrFail($message->conversation, $request->user());
            $text = $message->body;
            abort_unless($text, 422, 'Ce message ne contient pas de texte à traduire.');
        }

        return $this->withAssistant(fn () => ['text' => $this->assistant->translate($text, $data['language'])]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $messages = $this->messenger->unreadCounts($request->user()->id)->sum();
        $announcements = $request->user()->announcementsReceived()->wherePivotNull('read_at')->count();

        return response()->json([
            'count' => $messages + $announcements,
            'messages' => $messages,
            'announcements' => $announcements,
        ]);
    }
}
