<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\TemporaryPassword;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    /**
     * Met à jour le mot de passe de l'utilisateur.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed', 'not_in:'.TemporaryPassword::LEGACY],
        ], [
            'password.not_in' => 'Ce mot de passe est trop courant : choisissez-en un autre.',
        ]);

        $request->user()->forceFill([
            'password' => Hash::make($validated['password']),
        ] + TemporaryPassword::flag(false))->save();

        return back();
    }
}
