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
        Schema::table('formations', function (Blueprint $table) {
            // « Diplôme d'État » / « Diplôme d'école » / « Attestation » — le statut officiel de
            // reconnaissance du titre, distinct du code `diploma` (CAP/BEP/BTS...), car un « diplôme » n'est
            // pas toujours reconnu par l'État (p. ex. le BT est un Diplôme d'école validé par la Chambre des
            // Métiers, et non un Diplôme d'État).
            $table->string('diploma_recognition')->nullable()->after('diploma');
        });
    }

    /**
     * Annule les migrations.
     */
    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn('diploma_recognition');
        });
    }
};
