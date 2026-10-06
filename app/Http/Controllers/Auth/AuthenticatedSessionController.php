<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\TemporaryPassword;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Affiche la vue de connexion.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Traite une demande d'authentification entrante.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        // Un compte créé avec l'ancien mot de passe commun doit en choisir un autre avant toute chose.
        $user = $request->user();
        if (TemporaryPassword::supported() && ! $user->must_change_password && TemporaryPassword::isLegacy($user)) {
            $user->forceFill(TemporaryPassword::flag(true))->save();
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Détruit une session authentifiée.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
