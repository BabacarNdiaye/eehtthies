<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * EEHT Connect « professionnel » : messages modifiés / supprimés pour tout le
 * monde, conversations mises en sourdine, gestion des groupes (photo, écriture
 * réservée aux administrateurs).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_messages', function (Blueprint $table) {
            $table->timestamp('edited_at')->nullable();
            // Supprimé pour tout le monde : contenu effacé, remplacé par
            // « Ce message a été supprimé ».
            $table->timestamp('retracted_at')->nullable();
            $table->foreignId('retracted_by')->nullable()->constrained('users')->nullOnDelete();
        });

        Schema::table('conversation_participants', function (Blueprint $table) {
            // Notifications coupées jusqu'à cette date (très lointaine = « toujours »).
            $table->timestamp('muted_until')->nullable();
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->string('avatar_path')->nullable();
            $table->boolean('only_admins_can_write')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['avatar_path', 'only_admins_can_write']);
        });

        Schema::table('conversation_participants', function (Blueprint $table) {
            $table->dropColumn('muted_until');
        });

        Schema::table('conversation_messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('retracted_by');
            $table->dropColumn(['edited_at', 'retracted_at']);
        });
    }
};
