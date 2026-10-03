<?php

namespace App\Support;

use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Génère des adresses e-mail institutionnelles uniques (prenom.nom@domaine) pour les élèves, enseignants,
 * tuteurs et membres du personnel qui n'en ont pas encore, afin de pouvoir toujours créer l'accès au portail
 * sans correction manuelle des données.
 */
class InstitutionalEmail
{
    public static function generate(string $fullName): string
    {
        $words = Str::of($fullName)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z\s]/', '')
            ->squish()
            ->explode(' ')
            ->filter();

        $first = $words->first() ?: 'membre';
        $last = $words->count() > 1 ? $words->last() : null;
        $base = trim($first.($last ? ".{$last}" : ''), '.');

        $domain = config('eeht.institutional_email_domain', 'eeht-thies.sn');

        $email = "{$base}@{$domain}";
        $suffix = 2;

        while (self::isTaken($email)) {
            $email = "{$base}{$suffix}@{$domain}";
            $suffix++;
        }

        return $email;
    }

    private static function isTaken(string $email): bool
    {
        return User::where('email', $email)->orWhere('personal_email', $email)->exists()
            || Student::where('email', $email)->orWhere('guardian_email', $email)->orWhere('professional_email', $email)->exists()
            || Teacher::where('email', $email)->orWhere('professional_email', $email)->exists();
    }
}
