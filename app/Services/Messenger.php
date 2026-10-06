<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\ConversationParticipant;
use App\Models\TimetableEntry;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Cœur d'EEHT Connect : envoi des messages (avec notification push) et mise
 * en forme des personnes / conversations / messages pour l'interface.
 */
class Messenger
{
    /** Au-delà, les notifications push d'un message de groupe partent en différé (app:push-pending-messages). */
    public const SYNC_PUSH_LIMIT = 15;

    /** Conversation privée entre deux personnes, créée si elle n'existe pas encore. */
    public function directConversation(User $a, User $b): Conversation
    {
        return Conversation::directBetween($a->id, $b->id) ?? DB::transaction(function () use ($a, $b) {
            $conversation = Conversation::create(['type' => Conversation::TYPE_DIRECT, 'created_by' => $a->id]);
            $conversation->participants()->createMany([['user_id' => $a->id], ['user_id' => $b->id]]);

            return $conversation;
        });
    }

    /** Conversation personnelle « Assistant EEHT Connect » de l'utilisateur (rappels, alertes), créée au besoin. */
    public function assistantConversation(User $user): Conversation
    {
        $existing = Conversation::where('type', Conversation::TYPE_ASSISTANT)->forUser($user->id)->first();

        return $existing ?? DB::transaction(function () use ($user) {
            $conversation = Conversation::create(['type' => Conversation::TYPE_ASSISTANT, 'name' => 'Assistant EEHT Connect']);
            $conversation->participants()->create(['user_id' => $user->id]);

            return $conversation;
        });
    }

    /**
     * @param  array<int, int>  $mentionIds  personnes @mentionnées (doivent faire partie de la conversation)
     */
    public function send(
        Conversation $conversation,
        ?User $sender,
        ?string $body,
        ?UploadedFile $file = null,
        ?string $subject = null,
        ?ConversationMessage $replyTo = null,
        array $mentionIds = [],
    ): ConversationMessage {
        $attributes = [
            'conversation_id' => $conversation->id,
            'user_id' => $sender?->id,
            'reply_to_id' => $replyTo?->id,
            'subject' => $subject,
            'body' => $body !== null && trim($body) !== '' ? $body : null,
        ];

        if ($file) {
            $attributes += [
                'attachment_path' => $file->store('connect/'.$conversation->id, 'local'),
                'attachment_name' => $file->getClientOriginalName(),
                'attachment_size' => $file->getSize(),
                'attachment_mime' => $file->getMimeType(),
            ];
        }

        $message = $this->store($conversation, $sender, $attributes);

        $mentionIds = $conversation->participants()
            ->whereIn('user_id', $mentionIds)
            ->where('user_id', '!=', $sender?->id ?? 0)
            ->pluck('user_id')
            ->all();
        if ($mentionIds) {
            $message->mentions()->attach($mentionIds);
        }

        $this->pushNow($conversation, $message, $sender, $mentionIds);

        return $message;
    }

    /**
     * Message automatique d'EEHT Connect (rappel d'examen, devoir, emploi du
     * temps, absence) : sans auteur, affiché comme une carte d'information.
     */
    public function sendSystem(Conversation $conversation, string $body, array $meta = [], bool $push = true): ConversationMessage
    {
        $message = $this->store($conversation, null, [
            'conversation_id' => $conversation->id,
            'kind' => ConversationMessage::KIND_SYSTEM,
            'body' => $body,
            'meta' => $meta ?: null,
        ]);

        if ($push) {
            $this->pushNow($conversation, $message, null);
        } else {
            $message->forceFill(['pushed_at' => now()])->saveQuietly();
        }

        return $message;
    }

    private function store(Conversation $conversation, ?User $sender, array $attributes): ConversationMessage
    {
        return DB::transaction(function () use ($conversation, $sender, $attributes) {
            $message = ConversationMessage::create($attributes);
            $conversation->forceFill(['last_message_at' => $message->created_at])->save();

            if ($sender) {
                ConversationParticipant::where('conversation_id', $conversation->id)
                    ->where('user_id', $sender->id)
                    ->update(['last_read_message_id' => $message->id]);
            }

            return $message;
        });
    }

    /** @param  array<int, int>  $mentionIds */
    private function pushNow(Conversation $conversation, ConversationMessage $message, ?User $sender, array $mentionIds = []): void
    {
        $participants = $conversation->participants()->where('user_id', '!=', $sender?->id ?? 0)->get(['user_id', 'muted_until']);
        $recipients = User::whereIn('id', $participants->pluck('user_id'))->get();
        $muted = $participants->filter(fn (ConversationParticipant $p) => $p->isMuted())->pluck('user_id')->all();

        [$title, $text, $url] = $this->pushContent($conversation, $message, $sender);

        // Les personnes @mentionnées sont toujours prévenues tout de suite,
        // même dans un grand groupe et même si elles ont mis la conversation
        // en sourdine.
        foreach ($recipients->whereIn('id', $mentionIds) as $mentioned) {
            SafePush::send($mentioned, ($sender?->name ?? 'EEHT Connect').' vous a mentionné(e)'.($conversation->isDirect() ? '' : " dans {$conversation->name}"), $text, $url);
        }

        if ($recipients->count() > self::SYNC_PUSH_LIMIT) {
            return; // laissé à app:push-pending-messages (pushed_at reste null)
        }

        foreach ($recipients->whereNotIn('id', [...$mentionIds, ...$muted]) as $recipient) {
            SafePush::send($recipient, $title, $text, $url);
        }

        $message->forceFill(['pushed_at' => now()])->saveQuietly();
    }

    /** @return array{0: string, 1: string, 2: string} titre, texte, lien */
    public function pushContent(Conversation $conversation, ConversationMessage $message, ?User $sender): array
    {
        $senderName = $sender?->name ?? ($message->isSystem() ? 'EEHT Connect' : 'Administration');
        $title = match (true) {
            $conversation->isDirect(), $conversation->isAssistant() => $senderName,
            default => "{$conversation->name} — {$senderName}",
        };
        $text = $message->body ?? ($message->attachment_name ? "📎 {$message->attachment_name}" : '');

        return [$title, $text, '/connect?conversation='.$conversation->id];
    }

    /**
     * Administrateur d'un groupe : responsable désigné (ou créateur) d'un
     * groupe libre, enseignant d'un groupe de classe ; le personnel de
     * l'établissement l'est de tous les groupes dont il fait partie.
     */
    public function isGroupAdmin(Conversation $conversation, User $user): bool
    {
        if ($conversation->isDirect() || $conversation->isAssistant()) {
            return false;
        }

        if ($this->isStaffUser($user)) {
            return true;
        }

        return $conversation->isClassGroup()
            ? (bool) $user->teacher
            : (bool) $conversation->participants()->where('user_id', $user->id)->value('is_admin');
    }

    /** Suppression « pour tout le monde » : le contenu et la pièce jointe sont effacés. */
    public function retract(ConversationMessage $message, User $by): void
    {
        if ($message->attachment_path) {
            foreach (['local', 'public'] as $disk) {
                Storage::disk($disk)->delete($message->attachment_path);
            }
        }

        DB::transaction(function () use ($message, $by) {
            $message->reactions()->delete();
            $message->mentions()->detach();
            $message->forceFill([
                'subject' => null,
                'body' => null,
                'attachment_path' => null,
                'attachment_name' => null,
                'attachment_size' => null,
                'attachment_mime' => null,
                'pinned_at' => null,
                'pinned_by' => null,
                'retracted_at' => now(),
                'retracted_by' => $by->id,
            ])->save();
        });
    }

    // -----------------------------------------------------------------
    // Mise en forme
    // -----------------------------------------------------------------

    /** Relations nécessaires à presentUser(), à charger en une fois. */
    public const USER_RELATIONS = ['student.schoolClass:id,name', 'student.formation:id,name', 'teacher', 'roles:id,name'];

    public function avatarUrl(User $user): ?string
    {
        $path = $user->avatar ?: ($user->teacher?->photo ?: $user->student?->photo);

        return $path ? '/storage/'.ltrim($path, '/') : null;
    }

    /** @return array{label: string, subtitle: ?string} */
    public function roleOf(User $user): array
    {
        if ($user->teacher) {
            return ['label' => 'Enseignant(e)', 'subtitle' => $user->department ?: $user->teacher->specialty];
        }
        if ($user->student) {
            return ['label' => 'Élève', 'subtitle' => $user->student->schoolClass?->name];
        }
        if ($user->roles->contains('name', 'parent')) {
            return ['label' => 'Parent', 'subtitle' => null];
        }

        return ['label' => $user->position ?: 'Administration', 'subtitle' => $user->department];
    }

    public function isStaffUser(User $user): bool
    {
        return ! $user->teacher && ! $user->student
            && ! $user->roles->contains(fn ($r) => in_array($r->name, ['enseignant', 'eleve', 'parent'], true));
    }

    public function presentUser(User $user): array
    {
        $role = $this->roleOf($user);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $this->avatarUrl($user),
            'role' => $role['label'],
            'subtitle' => $role['subtitle'],
            'online' => $user->isOnline(),
            'last_seen_at' => $user->last_seen_at?->toIso8601String(),
        ];
    }

    /**
     * Fiche « À propos » du panneau de droite. Les coordonnées ne sont
     * affichées que pour le personnel et les enseignants (contacts
     * professionnels) — jamais le téléphone ou l'e-mail personnel d'un élève
     * ou d'un parent.
     */
    public function profile(User $user): array
    {
        $isProfessional = $user->teacher || $this->isStaffUser($user);
        $teacher = $user->teacher;
        $student = $user->student;

        $email = $teacher?->professional_email ?: ($student?->professional_email ?: ($isProfessional ? $user->email : null));
        $phone = $isProfessional ? ($teacher?->phone ?: $user->phone) : null;

        $about = null;
        if ($teacher) {
            $about = collect([
                $teacher->specialty ? "Spécialité : {$teacher->specialty}." : null,
                $teacher->experience_years ? "{$teacher->experience_years} an(s) d'expérience." : null,
            ])->filter()->implode(' ') ?: null;
        } elseif ($student) {
            $about = collect([$student->formation?->name, $student->schoolClass?->name])->filter()->implode(' · ') ?: null;
        } elseif ($user->department) {
            $about = "Service : {$user->department}.";
        }

        return [
            ...$this->presentUser($user),
            'about' => $about,
            'email' => $email,
            'phone' => $phone,
            'formation' => $teacher ? ($teacher->diplomas ? strtok($teacher->diplomas, "\n") : null) : $student?->formation?->name,
            'position' => $teacher ? 'Enseignant(e)' : ($student ? 'Élève'.($student->schoolClass ? ' — '.$student->schoolClass->name : '') : ($user->position ?: $this->roleOf($user)['label'])),
            'availability' => $teacher ? $this->availability($teacher->id) : null,
        ];
    }

    /** Résumé des horaires d'un enseignant tiré de son emploi du temps, ex. « Lun - Ven : 08h - 16h ». */
    public function availability(int $teacherId): ?string
    {
        $entries = TimetableEntry::where('teacher_id', $teacherId)->get(['day_of_week', 'start_time', 'end_time']);
        if ($entries->isEmpty()) {
            return null;
        }

        $days = $entries->pluck('day_of_week')->unique()->sort()->values();
        $short = fn (int $d) => mb_substr(TimetableEntry::DAYS[$d] ?? (string) $d, 0, 3);
        $isRange = $days->last() - $days->first() === $days->count() - 1;
        $dayLabel = $days->count() === 1
            ? $short($days->first())
            : ($isRange ? $short($days->first()).' - '.$short($days->last()) : $days->map($short)->implode(', '));

        $hour = fn (string $t) => substr($t, 0, 2).'h'.(substr($t, 3, 2) !== '00' ? substr($t, 3, 2) : '');

        return "{$dayLabel} : {$hour($entries->min('start_time'))} - {$hour($entries->max('end_time'))}";
    }

    /** Relations à charger avant presentMessage() sur une liste de messages. */
    public const MESSAGE_RELATIONS = [
        'user:id,name,avatar', 'user.teacher:id,user_id,photo', 'user.student:id,user_id,photo',
        'replyTo:id,user_id,body,attachment_name,kind,retracted_at', 'replyTo.user:id,name',
        'reactions:id,conversation_message_id,user_id,emoji', 'mentions:id,name',
    ];

    /**
     * @param  bool  $canModerate  le lecteur peut supprimer les messages des autres (administrateur du groupe)
     */
    public function presentMessage(ConversationMessage $message, ?int $viewerId = null, bool $canModerate = false): array
    {
        $reply = $message->replyTo;
        $retracted = $message->isRetracted();

        return [
            'id' => $message->id,
            'kind' => $message->kind ?? ConversationMessage::KIND_USER,
            'user_id' => $message->user_id,
            'sender_name' => $message->user?->name ?? ($message->isSystem() ? 'EEHT Connect' : null),
            'sender_avatar' => $message->user ? $this->avatarUrl($message->user) : null,
            'subject' => $message->subject,
            'body' => $message->body,
            'meta' => $message->meta,
            'attachment' => $message->attachment_path ? [
                'name' => $message->attachment_name,
                'size' => $message->attachment_size,
                'mime' => $message->attachment_mime,
                'url' => route('connect.attachment', $message),
            ] : null,
            'reply_to' => $reply && ! $retracted ? [
                'id' => $reply->id,
                'sender_name' => $reply->user?->name ?? 'EEHT Connect',
                'body' => $reply->retracted_at ? '🚫 Message supprimé' : ($reply->body ? mb_strimwidth($reply->body, 0, 140, '…') : null),
                'attachment_name' => $reply->attachment_name,
            ] : null,
            'reactions' => $message->reactions
                ->groupBy('emoji')
                ->map(fn ($group, $emoji) => [
                    'emoji' => $emoji,
                    'count' => $group->count(),
                    'mine' => $viewerId !== null && $group->contains('user_id', $viewerId),
                ])
                ->values()
                ->all(),
            'mentions' => $message->mentions->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->all(),
            'pinned' => $message->pinned_at !== null,
            'edited' => $message->edited_at !== null && ! $retracted,
            'deleted' => $retracted,
            'deleted_by_moderator' => $retracted && $message->retracted_by !== null && $message->retracted_by !== $message->user_id,
            'can_edit' => $viewerId !== null && $message->editableBy($viewerId),
            'can_delete' => $viewerId !== null && ! $retracted && ! $message->isSystem()
                && ($message->retractableBy($viewerId) || ($canModerate && $message->user_id !== $viewerId)),
            'created_at' => $message->created_at->toIso8601String(),
        ];
    }

    /**
     * Mentions non lues par conversation (messages où l'utilisateur est
     *
     * @mentionné, postérieurs à sa dernière lecture).
     *
     * @return Collection<int, int> conversation_id => nombre
     */
    public function unreadMentionCounts(int $userId): Collection
    {
        return DB::table('message_mentions as mm')
            ->join('conversation_messages as m', 'm.id', '=', 'mm.conversation_message_id')
            ->join('conversation_participants as p', function ($join) use ($userId) {
                $join->on('p.conversation_id', '=', 'm.conversation_id')->where('p.user_id', '=', $userId);
            })
            ->where('mm.user_id', $userId)
            ->whereRaw('m.id > COALESCE(p.last_read_message_id, 0)')
            ->groupBy('m.conversation_id')
            ->selectRaw('m.conversation_id, COUNT(*) as mentions')
            ->pluck('mentions', 'conversation_id')
            ->map(fn ($n) => (int) $n);
    }

    /**
     * Nombre de messages non lus par conversation pour un utilisateur, en une
     * requête.
     *
     * @return Collection<int, int> conversation_id => nombre
     */
    public function unreadCounts(int $userId): Collection
    {
        return DB::table('conversation_messages as m')
            ->join('conversation_participants as p', function ($join) use ($userId) {
                $join->on('p.conversation_id', '=', 'm.conversation_id')->where('p.user_id', '=', $userId);
            })
            ->where(fn ($q) => $q->whereNull('m.user_id')->orWhere('m.user_id', '!=', $userId))
            ->whereRaw('m.id > COALESCE(p.last_read_message_id, 0)')
            ->groupBy('m.conversation_id')
            ->selectRaw('m.conversation_id, COUNT(*) as unread')
            ->pluck('unread', 'conversation_id')
            ->map(fn ($n) => (int) $n);
    }
}
