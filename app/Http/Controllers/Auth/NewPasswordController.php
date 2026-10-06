<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\TemporaryPassword;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    /**
     * Affiche la vue de réinitialisation du mot de passe.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]);
    }

    /**
     * Traite une demande de nouveau mot de passe entrante.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // On tente ici de réinitialiser le mot de passe de l'utilisateur. En cas de succès, on met à jour le
        // mot de passe sur le modèle d'utilisateur réel et on l'enregistre en base. Sinon, on analyse
        // l'erreur et on renvoie la réponse.
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                ] + TemporaryPassword::flag(false))->save();

                event(new PasswordReset($user));
            }
        );

        // Si le mot de passe a bien été réinitialisé, on redirige l'utilisateur vers la vue authentifiée
        // d'accueil de l'application. En cas d'erreur, on le renvoie à la page d'origine avec son message
        // d'erreur.
        if ($status == Password::PASSWORD_RESET) {
            return redirect()->route('login')->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }
}
