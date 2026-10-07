<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Piège à robots des formulaires publics : un champ « website_url » caché aux visiteurs (hors écran, sans focus clavier,
 * ignoré des lecteurs d'écran). Une personne ne le remplit jamais ; un robot qui remplit tout, si. Le formulaire est alors
 * ignoré en silence, avec la même réponse qu'un envoi réussi, pour ne rien apprendre au robot.
 */
class Honeypot
{
    public const FIELD = 'website_url';

    public static function tripped(Request $request): bool
    {
        return filled($request->input(self::FIELD));
    }
}
