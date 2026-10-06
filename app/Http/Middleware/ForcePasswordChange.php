<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tant qu'un compte porte un mot de passe provisoire (users.must_change_password), il ne peut que changer son mot de
 * passe ou se déconnecter : toute autre page le ramène à l'écran « Mot de passe » de son espace.
 */
class ForcePasswordChange
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->must_change_password || $this->allowed($request)) {
            return $next($request);
        }

        // Une requête de fond (sondage, JSON) reçoit un refus net plutôt qu'une redirection que personne ne suivrait.
        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            abort(423, 'Changez votre mot de passe provisoire avant de continuer.');
        }

        $target = match (true) {
            $user->hasRole('eleve') => 'student.password',
            $user->hasRole('parent') => 'parent.password',
            $user->hasRole('enseignant') => 'teacher.password',
            default => 'admin.password',
        };

        return redirect()->route($target)->with('error', 'Pour votre sécurité, choisissez un nouveau mot de passe avant de continuer.');
    }

    private function allowed(Request $request): bool
    {
        return $request->routeIs('student.password', 'parent.password', 'teacher.password', 'admin.password', 'password.update', 'logout', 'password.*');
    }
}
