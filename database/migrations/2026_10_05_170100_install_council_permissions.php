<?php

use App\Support\CouncilPermissions;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Droits du module Conseil de classe et rôles « vie scolaire » / « secrétariat » : en production, le seeder des
     * rôles n'est jamais relancé (il réinitialise les droits de l'école), c'est cette migration qui les installe.
     * Elle n'ajoute que ce qui manque, voir CouncilPermissions::install().
     */
    public function up(): void
    {
        CouncilPermissions::install();
    }

    public function down(): void
    {
        // Volontairement vide : retirer des droits déjà attribués à des comptes serait destructeur.
    }
};
