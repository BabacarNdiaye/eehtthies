<?php

namespace App\Listeners;

use App\Models\LoginLog;
use Illuminate\Auth\Events\Login;
use Throwable;

/**
 * Alimente l'onglet de statistiques « Trafic » — enregistre une ligne par connexion réelle (et non par
 * requête). Ne laisse jamais un échec ici casser une vraie connexion : il s'agit d'une analyse secondaire,
 * dont la capacité d'un utilisateur à se connecter ne doit pas dépendre.
 */
class LogUserLogin
{
    public function handle(Login $event): void
    {
        try {
            LoginLog::create([
                'user_id' => $event->user->id,
                'ip_address' => request()?->ip(),
                'user_agent' => substr((string) request()?->userAgent(), 0, 255),
            ]);

            $event->user->forceFill(['last_login_at' => now()])->saveQuietly();
        } catch (Throwable $e) {
            report($e);
        }
    }
}
