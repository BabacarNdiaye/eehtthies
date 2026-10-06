<?php

use App\Support\CouncilDefaults;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Référentiels de départ du conseil de classe (types de décision, incompatibilités, seuils d'alerte, groupes de
     * matières). En production aucun seeder n'est relancé : c'est cette migration qui les installe. Elle ne crée que ce
     * qui manque et n'écrase jamais ce que l'école a réglé, voir CouncilDefaults::install().
     */
    public function up(): void
    {
        CouncilDefaults::install();
    }

    public function down(): void
    {
        // Volontairement vide : les référentiels peuvent déjà servir à des décisions.
    }
};
