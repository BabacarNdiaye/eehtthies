<?php

namespace App\Console\Commands;

use App\Models\InternalMessage;
use App\Notifications\PushAlert;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class PushPendingMessages extends Command
{
    protected $signature = 'app:push-pending-messages';

    protected $description = 'Envoie les notifications push des messages internes créés en masse (annonces, envois de classe) sans bloquer la requête qui les a créés.';

    public function handle(): int
    {
        // TEMPORARY guard — remove once the pushed_at migration has run on this
        // environment (EEHT Connect Phase 1 deploy, 2026-09-28).
        if (! Schema::hasColumn('internal_messages', 'pushed_at')) {
            $this->warn('Colonne pushed_at absente — migration pas encore appliquée, rien à faire.');

            return self::SUCCESS;
        }

        $count = 0;

        InternalMessage::whereNull('pushed_at')
            ->with('sender:id,name', 'recipient')
            ->chunkById(50, function ($messages) use (&$count) {
                foreach ($messages as $message) {
                    $message->recipient?->notify(new PushAlert(
                        $message->sender?->name ?? 'Administration',
                        $message->body,
                        '/notifications'
                    ));
                    $message->forceFill(['pushed_at' => now()])->saveQuietly();
                    $count++;
                }
            });

        $this->info("{$count} message(s) poussé(s).");

        return self::SUCCESS;
    }
}
