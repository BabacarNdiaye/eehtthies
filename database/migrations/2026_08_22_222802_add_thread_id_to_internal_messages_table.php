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
        Schema::table('internal_messages', function (Blueprint $table) {
            // Regroupe un message et ses réponses. Égal à l'id du message racine (renseigné à la création) —
            // ce n'est pas une vraie clé étrangère, car il peut pointer vers une ligne qui n'existait pas
            // encore au moment de l'insertion.
            $table->unsignedBigInteger('thread_id')->nullable()->after('recipient_id')->index();
        });
    }

    /**
     * Annule les migrations.
     */
    public function down(): void
    {
        Schema::table('internal_messages', function (Blueprint $table) {
            $table->dropColumn('thread_id');
        });
    }
};
