<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\PushAlert;
use Throwable;

/**
 * Envoie une notification push sans jamais faire échouer la requête : une
 * notification qui ne part pas (extension PHP GMP/BCMath absente, abonnement
 * expiré, service push injoignable) ne doit pas empêcher l'envoi du message
 * lui-même. L'erreur est journalisée.
 */
class SafePush
{
    public static function send(?User $user, string $title, ?string $body, string $url, array $extra = []): void
    {
        if (! $user) {
            return;
        }

        try {
            $user->notify(new PushAlert($title, (string) $body, $url, $extra));
        } catch (Throwable $e) {
            report($e);
        }
    }
}
