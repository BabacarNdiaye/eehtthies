<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Horodate la dernière activité de l'utilisateur connecté (statut « En ligne »
 * d'EEHT Connect). Écrit au plus une fois par minute, directement en base pour
 * ne toucher ni updated_at ni le journal d'activité.
 */
class TrackLastSeen
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ($user->last_seen_at === null || $user->last_seen_at->lt(now()->subMinute()))) {
            $now = now();
            DB::table('users')->where('id', $user->id)->update(['last_seen_at' => $now]);
            $user->last_seen_at = $now;
            $user->syncOriginalAttribute('last_seen_at');
        }

        return $next($request);
    }
}
