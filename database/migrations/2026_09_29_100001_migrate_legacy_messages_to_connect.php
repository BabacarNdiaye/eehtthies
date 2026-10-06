<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reprend l'historique de l'ancienne messagerie dans EEHT Connect :
 *  - les annonces (envoyées jusqu'ici comme un message privé par
 *    destinataire) deviennent des lignes announcement_user ;
 *  - les autres messages privés sont regroupés en une conversation privée
 *    par paire d'utilisateurs, en conservant l'état lu/non lu ;
 *  - les discussions de classe deviennent le groupe de la classe.
 *
 * Les anciennes tables sont conservées (non supprimées) pour pouvoir revenir
 * en arrière ; plus aucun code ne les utilise.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $announcementMessageIds = $this->migrateAnnouncements($now);
        $this->migrateInternalMessages($announcementMessageIds, $now);
        $this->migrateClassMessages($now);
    }

    public function down(): void
    {
        DB::table('announcement_user')->delete();
        DB::table('conversation_messages')->delete();
        DB::table('conversation_participants')->delete();
        DB::table('conversations')->delete();
    }

    /** @return array<int, true> ids des internal_messages qui étaient des annonces */
    private function migrateAnnouncements($now): array
    {
        if (! Schema::hasTable('internal_messages') || ! Schema::hasTable('announcements')) {
            return [];
        }

        $ids = [];

        foreach (DB::table('announcements')->get() as $announcement) {
            $messages = DB::table('internal_messages')
                ->where('sender_id', $announcement->created_by)
                ->where('body', $announcement->body)
                ->whereIn('subject', [$announcement->title, "[URGENT] {$announcement->title}"])
                ->get(['id', 'recipient_id', 'read_at', 'created_at']);

            foreach ($messages as $message) {
                $ids[$message->id] = true;
                DB::table('announcement_user')->insertOrIgnore([
                    'announcement_id' => $announcement->id,
                    'user_id' => $message->recipient_id,
                    'read_at' => $message->read_at,
                    'pushed_at' => $now,
                    'created_at' => $message->created_at,
                    'updated_at' => $now,
                ]);
            }
        }

        return $ids;
    }

    private function migrateInternalMessages(array $skipIds, $now): void
    {
        if (! Schema::hasTable('internal_messages')) {
            return;
        }

        $hasAttachments = Schema::hasColumn('internal_messages', 'attachment_path');

        $byPair = DB::table('internal_messages')->orderBy('created_at')->orderBy('id')->get()
            ->reject(fn ($m) => isset($skipIds[$m->id]))
            ->groupBy(function ($m) {
                $pair = array_filter([$m->sender_id, $m->recipient_id]);
                sort($pair);

                return implode('-', $pair);
            });

        foreach ($byPair as $messages) {
            $first = $messages->first();
            $participantIds = $messages->flatMap(fn ($m) => [$m->sender_id, $m->recipient_id])->filter()->unique();

            $conversationId = DB::table('conversations')->insertGetId([
                'type' => 'direct',
                'created_by' => $first->sender_id,
                'last_message_at' => $messages->last()->created_at,
                'created_at' => $first->created_at,
                'updated_at' => $now,
            ]);

            // Pour chaque participant : dernier message lu = celui qui précède
            // son premier message reçu non lu (ou le dernier de la conversation).
            $lastRead = [];
            $blocked = [];

            foreach ($messages as $m) {
                $isRoot = $m->thread_id === null || (int) $m->thread_id === (int) $m->id;

                $newId = DB::table('conversation_messages')->insertGetId([
                    'conversation_id' => $conversationId,
                    'user_id' => $m->sender_id,
                    'subject' => $isRoot ? $m->subject : null,
                    'body' => $m->body,
                    'attachment_path' => $hasAttachments ? $m->attachment_path : null,
                    'attachment_name' => $hasAttachments ? $m->attachment_name : null,
                    'attachment_size' => $hasAttachments ? $m->attachment_size : null,
                    'attachment_mime' => $hasAttachments && $m->attachment_path ? $this->guessMime($m->attachment_path) : null,
                    'pushed_at' => $now,
                    'created_at' => $m->created_at,
                    'updated_at' => $m->updated_at,
                ]);

                foreach ($participantIds as $userId) {
                    if (isset($blocked[$userId])) {
                        continue;
                    }
                    if ((int) $m->recipient_id === (int) $userId && $m->read_at === null) {
                        $blocked[$userId] = true;

                        continue;
                    }
                    $lastRead[$userId] = $newId;
                }
            }

            foreach ($participantIds as $userId) {
                DB::table('conversation_participants')->insert([
                    'conversation_id' => $conversationId,
                    'user_id' => $userId,
                    'last_read_message_id' => $lastRead[$userId] ?? null,
                    'created_at' => $first->created_at,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    private function migrateClassMessages($now): void
    {
        if (! Schema::hasTable('class_messages')) {
            return;
        }

        $byClass = DB::table('class_messages')->orderBy('created_at')->orderBy('id')->get()->groupBy('school_class_id');

        foreach ($byClass as $schoolClassId => $messages) {
            $class = DB::table('school_classes')->where('id', $schoolClassId)->first(['id', 'name']);
            if (! $class) {
                continue;
            }

            $conversationId = DB::table('conversations')->insertGetId([
                'type' => 'group',
                'name' => $class->name,
                'school_class_id' => $class->id,
                'last_message_at' => $messages->last()->created_at,
                'created_at' => $messages->first()->created_at,
                'updated_at' => $now,
            ]);

            $lastId = null;
            foreach ($messages as $m) {
                $lastId = DB::table('conversation_messages')->insertGetId([
                    'conversation_id' => $conversationId,
                    'user_id' => $m->user_id,
                    'body' => $m->body,
                    'pushed_at' => $now,
                    'created_at' => $m->created_at,
                    'updated_at' => $m->updated_at,
                ]);
            }

            // Les membres (élèves + enseignants de la classe) sont complétés
            // automatiquement par l'application ; on inscrit dès maintenant les
            // auteurs, en considérant l'historique comme lu (l'ancienne
            // discussion de classe n'avait pas de suivi de lecture).
            foreach ($messages->pluck('user_id')->unique() as $userId) {
                DB::table('conversation_participants')->insert([
                    'conversation_id' => $conversationId,
                    'user_id' => $userId,
                    'last_read_message_id' => $lastId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    private function guessMime(string $path): ?string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'pdf' => 'application/pdf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt' => 'application/vnd.ms-powerpoint',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            default => null,
        };
    }
};
