<?php

namespace App\Support;

use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Generates unique institutional e-mail addresses (prenom.nom@domaine) for
 * students, teachers, guardians and staff who don't already have one, so
 * that portal access can always be created without a manual data fix.
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
