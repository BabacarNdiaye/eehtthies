<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            // "Diplôme d'État" / "Diplôme d'école" / "Attestation" — the
            // official recognition status of the credential, distinct from
            // the `diploma` code (CAP/BEP/BTS...), since a "diploma" isn't
            // always state-recognized (e.g. the BT is a Diplôme d'école
            // validated by the Chambre des Métiers, not a Diplôme d'État).
            $table->string('diploma_recognition')->nullable()->after('diploma');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn('diploma_recognition');
        });
    }
};
