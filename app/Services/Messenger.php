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

    public function send(
        Conversation $conversation,
        ?User $sender,
        ?string $body,
        ?UploadedFile $file = null,
        ?string $subject = null,
    ): ConversationMessage {
        $attributes = [
            'conversation_id' => $conversation->id,
            'user_id' => $sender?->id,
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

        $message = DB::transaction(function () use ($conversation, $sender, $attributes) {
            $message = ConversationMessage::create($attributes);
            $conversation->forceFill(['last_message_at' => $message->created_at])->save();

            if ($sender) {
                ConversationParticipant::where('conversation_id', $conversation->id)
                    ->where('user_id', $sender->id)
                    ->update(['last_read_message_id' => $message->id]);
            }

            return $message;
        });

        $this->pushNow($conversation, $message, $sender);

        return $message;
    }

    private function pushNow(Conversation $conversation, ConversationMessage $message, ?User $sender): void
    {
        $recipients = User::whereIn(
            'id',
            $conversation->participants()->where('user_id', '!=', $sender?->id ?? 0)->pluck('user_id')
        )->get();

        if ($recipients->count() > self::SYNC_PUSH_LIMIT) {
            return; // laissé à app:push-pending-messages (pushed_at reste null)
        }

        foreach ($recipients as $recipient) {
            SafePush::send($recipient, ...$this->pushContent($conversation, $message, $sender));
        }

        $message->forceFill(['pushed_at' => now()])->saveQuietly();
    }

    /** @return array{0: string, 1: string, 2: string} titre, texte, lien */
    public function pushContent(Conversation $conversation, ConversationMessage $message, ?User $sender): array
    {
        $senderName = $sender?->name ?? 'Administration';
        $title = $conversation->isDirect() ? $senderName : "{$conversation->name} — {$senderName}";
        $text = $message->body ?? ($message->attachment_name ? "📎 {$message->attachment_name}" : '');

        return [$title, $text, '/connect?conversation='.$conversation->id];
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

    public function presentMessage(ConversationMessage $message): array
    {
        return [
            'id' => $message->id,
            'user_id' => $message->user_id,
            'sender_name' => $message->user?->name,
            'sender_avatar' => $message->user ? $this->avatarUrl($message->user) : null,
            'subject' => $message->subject,
            'body' => $message->body,
            'attachment' => $message->attachment_path ? [
                'name' => $message->attachment_name,
                'size' => $message->attachment_size,
                'mime' => $message->attachment_mime,
                'url' => route('connect.attachment', $message),
            ] : null,
            'created_at' => $message->created_at->toIso8601String(),
        ];
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
