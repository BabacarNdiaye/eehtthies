<?php

use App\Support\CouncilDefaults;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /** Banque d'appréciations et grille de stage de départ (lot V2) : n'ajoute que ce qui manque. */
    public function up(): void
    {
        CouncilDefaults::install();
    }

    public function down(): void
    {
        // Volontairement vide.
    }
};
