<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\ConversationParticipant;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\ClassGroupSync;
use App\Services\Messenger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            'initial' => [
                'conversation' => $request->integer('conversation') ?: null,
                'class' => $request->integer('class') ?: null,
                'user' => $request->integer('user') ?: null,
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

        return $conversations->map(function (Conversation $c) use ($me, $unread) {
            $mine = $c->participants->firstWhere('user_id', $me->id);
            $last = $c->latestMessage;
            $other = $c->isDirect() ? $c->participants->firstWhere('user_id', '!=', $me->id)?->user : null;

            return [
                'id' => $c->id,
                'type' => $c->type,
                'is_class' => $c->isClassGroup(),
                'name' => $c->isDirect() ? ($other?->name ?? 'Utilisateur supprimé') : $c->name,
                'avatar' => $other ? $this->messenger->avatarUrl($other) : null,
                'other' => $other ? $this->messenger->presentUser($other) : null,
                'members_count' => $c->participants->count(),
                'is_favorite' => (bool) $mine?->is_favorite,
                'unread' => $unread[$c->id] ?? 0,
                'last' => $last ? [
                    'body' => $last->body ?? ($last->attachment_name ? '📎 '.$last->attachment_name : ''),
                    'sender_name' => $last->user_id === $me->id ? 'Vous' : $last->user?->name,
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

        $query = $conversation->messages()->with('user:id,name,avatar', 'user.teacher:id,user_id,photo', 'user.student:id,user_id,photo');

        if ($afterId) {
            $messages = $query->where('id', '>', $afterId)->orderBy('id')->get();
        } else {
            $messages = $query->when($beforeId, fn ($q) => $q->where('id', '<', $beforeId))
                ->orderByDesc('id')->limit(50)->get()->reverse()->values();
        }

        $latestId = $conversation->messages()->max('id');
        if ($latestId && $latestId > (int) $participant->last_read_message_id) {
            $participant->update(['last_read_message_id' => $latestId]);
        }

        // Lu par tous les autres jusqu'à cet id (coches de lecture).
        $othersReadUpTo = $conversation->participants()->where('user_id', '!=', $me->id)->min(DB::raw('COALESCE(last_read_message_id, 0)'));

        $other = null;
        if ($conversation->isDirect()) {
            $otherUser = $conversation->participants()->where('user_id', '!=', $me->id)->first()?->user;
            $other = $otherUser ? $this->messenger->presentUser($otherUser->load(Messenger::USER_RELATIONS)) : null;
        }

        return response()->json([
            'messages' => $messages->map(fn ($m) => $this->messenger->presentMessage($m))->all(),
            'has_more' => ! $afterId && $messages->isNotEmpty() && $conversation->messages()->where('id', '<', $messages->first()->id)->exists(),
            'others_read_up_to' => (int) $othersReadUpTo,
            'other' => $other,
        ]);
    }

    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $this->participantOrFail($conversation, $me);

        $request->validate([
            'body' => ['nullable', 'string', 'max:5000', 'required_without:attachment'],
            'attachment' => ['nullable', 'file', 'mimes:'.self::ATTACHMENT_MIMES, 'max:10240'],
        ]);

        $message = $this->messenger->send($conversation, $me, $request->input('body'), $request->file('attachment'));

        return response()->json(['message' => $this->messenger->presentMessage($message->load('user'))]);
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
        abort_if($conversation->isDirect() || $conversation->isClassGroup(), 422, 'Vous ne pouvez pas quitter cette conversation.');

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
                'description' => $conversation->description ?? ($conversation->isClassGroup() ? 'Groupe de la classe : élèves et enseignants.' : null),
                'is_class' => $conversation->isClassGroup(),
                'can_leave' => ! $conversation->isClassGroup(),
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
