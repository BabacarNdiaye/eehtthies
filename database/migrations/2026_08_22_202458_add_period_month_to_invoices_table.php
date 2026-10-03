<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Exécute les migrations.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // 1 à 12, n'a de sens que si type = 'mensualite'. Permet de rattacher une facture de mensualité à
            // un mois civil précis, pour la suivre ou la générer mois par mois plutôt qu'en une seule somme.
            $table->unsignedTinyInteger('period_month')->nullable()->after('type');
        });
    }

    /**
     * Annule les migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('period_month');
        });
    }
};
