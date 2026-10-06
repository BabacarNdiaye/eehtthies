<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visioconférence du conseil, pendant la séance. Comme les appels d'EEHT Connect, le son et l'image passent directement
 * entre les navigateurs (WebRTC, en maillage : chacun relié à chacun) ; le serveur ne fait que la présence et le relais
 * des messages de mise en relation, relevés par interrogation (compatible avec l'hébergement mutualisé).
 * Un membre qui rejoint est noté présent « à distance » (council_members.remote).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Chaque étape est sautée si elle est déjà faite : une reprise après un échec à mi-chemin (MySQL n'annule pas le
        // DDL) ne bloque pas le cron de déploiement.
        if (! Schema::hasTable('council_meetings')) {
            Schema::create('council_meetings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('council_id')->constrained()->cascadeOnDelete();
                // audio | video
                $table->string('type', 10);
                $table->foreignId('started_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('started_at')->useCurrent();
                $table->foreignId('ended_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('ended_at')->nullable();
                $table->timestamps();

                $table->index(['council_id', 'ended_at']);
            });
        }

        if (! Schema::hasTable('council_meeting_participants')) {
            Schema::create('council_meeting_participants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('council_meeting_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('council_member_id')->nullable()->constrained()->nullOnDelete();
                // MySQL strict refuse deux TIMESTAMP NOT NULL sans valeur par défaut dans une même table.
                $table->timestamp('joined_at')->useCurrent();
                $table->timestamp('last_seen_at')->useCurrent();
                $table->timestamp('left_at')->nullable();
                $table->boolean('mic')->default(true);
                $table->boolean('cam')->default(false);
                $table->timestamps();

                $table->unique(['council_meeting_id', 'user_id']);
            });
        }

        if (! Schema::hasTable('council_meeting_signals')) {
            Schema::create('council_meeting_signals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('council_meeting_id')->constrained()->cascadeOnDelete();
                $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
                // offer | answer | candidate | bye
                $table->string('type', 12);
                $table->text('payload');
                $table->timestamp('created_at')->nullable();

                $table->index(['council_meeting_id', 'to_user_id', 'id']);
            });
        }

        if (! Schema::hasColumn('council_members', 'remote')) {
            Schema::table('council_members', function (Blueprint $table) {
                $table->boolean('remote')->default(false)->after('attendance');
            });
        }
    }

    public function down(): void
    {
        Schema::table('council_members', function (Blueprint $table) {
            $table->dropColumn('remote');
        });
        Schema::dropIfExists('council_meeting_signals');
        Schema::dropIfExists('council_meeting_participants');
        Schema::dropIfExists('council_meetings');
    }
};
