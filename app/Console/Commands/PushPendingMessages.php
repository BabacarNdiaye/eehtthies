<?php

namespace App\Console\Commands;

use App\Models\Announcement;
use App\Models\Call;
use App\Models\ConversationMessage;
use App\Models\User;
use App\Services\Messenger;
use App\Services\SafePush;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Envoie en différé les notifications push qui n'ont pas pu partir pendant la
 * requête : messages de grands groupes EEHT Connect et annonces (remises à
 * des centaines de destinataires d'un coup).
 */
class PushPendingMessages extends Command
{
    protected $signature = 'app:push-pending-messages';

    protected $description = 'Envoie les notifications push en attente (messages de groupe EEHT Connect et annonces).';

    public function handle(Messenger $messenger): int
    {
        $messages = 0;

        ConversationMessage::whereNull('pushed_at')
            ->with('conversation.participants.user', 'user')
            ->chunkById(50, function ($batch) use ($messenger, &$messages) {
                foreach ($batch as $message) {
                    [$title, $body, $url] = $messenger->pushContent($message->conversation, $message, $message->user);

                    $message->conversation->participants
                        ->where('user_id', '!=', $message->user_id)
                        ->reject(fn ($p) => $p->isMuted()) // conversation en sourdine
                        ->each(fn ($p) => SafePush::send($p->user, $title, $body, $url));

                    $message->forceFill(['pushed_at' => now()])->saveQuietly();
                    $messages++;
                }
            });

        $announcements = 0;

        DB::table('announcement_user')->whereNull('pushed_at')->orderBy('id')
            ->chunkById(200, function ($rows) use (&$announcements) {
                $byAnnouncement = Announcement::whereIn('id', $rows->pluck('announcement_id')->unique())->get()->keyBy('id');
                $users = User::whereIn('id', $rows->pluck('user_id')->unique())->get()->keyBy('id');

                foreach ($rows as $row) {
                    $announcement = $byAnnouncement[$row->announcement_id] ?? null;
                    if ($announcement) {
                        $title = $announcement->priority === 'urgente' ? "[URGENT] {$announcement->title}" : "Annonce — {$announcement->title}";
                        SafePush::send($users[$row->user_id] ?? null, $title, $announcement->body, '/connect?section=announcements');
                    }
                    DB::table('announcement_user')->where('id', $row->id)->update(['pushed_at' => now()]);
                    $announcements++;
                }
            });

        // « Me le rappeler » : rappels d'appels arrivés à échéance.
        $reminders = 0;
        Call::whereNotNull('remind_at')->whereNull('reminded_at')->where('remind_at', '<=', now())
            ->with('caller', 'callee')->get()
            ->each(function (Call $call) use ($messenger, &$reminders) {
                $call->forceFill(['reminded_at' => now()])->save();
                if (! $call->callee || ! $call->caller) {
                    return;
                }
                $messenger->sendSystem(
                    $messenger->assistantConversation($call->callee),
                    "⏰ Pensez à rappeler {$call->caller->name} (".($call->type === 'video' ? 'appel vidéo' : 'appel vocal').' de '.$call->created_at->format('H:i').').',
                    ['type' => 'call_reminder', 'call_id' => $call->id, 'conversation_id' => $call->conversation_id],
                    push: false,
                );
                SafePush::send($call->callee, "⏰ Rappeler {$call->caller->name}", 'Vous avez demandé à être prévenu(e). Appuyez pour ouvrir la conversation.', "/connect?conversation={$call->conversation_id}");
                $reminders++;
            });

        $this->info("{$messages} message(s), {$announcements} annonce(s) et {$reminders} rappel(s) d'appel poussé(s).");

        return self::SUCCESS;
    }
}
