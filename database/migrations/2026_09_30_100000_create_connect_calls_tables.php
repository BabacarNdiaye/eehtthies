<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Appels audio/vidéo en ligne d'EEHT Connect (WebRTC, pair à pair). Le
 * serveur ne transporte ni le son ni l'image : il ne fait que la mise en
 * relation (offre/réponse/candidats ICE échangés via call_signals).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('caller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('callee_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 10); // audio | video
            // ringing → active → ended ; ou declined / missed / cancelled
            $table->string('status', 12)->default('ringing')->index();
            $table->timestamp('answered_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->index(['callee_id', 'status']);
        });

        Schema::create('call_signals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained()->cascadeOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 12); // offer | answer | candidate
            $table->longText('payload');
            $table->timestamp('created_at')->nullable();
            $table->index(['call_id', 'to_user_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_signals');
        Schema::dropIfExists('calls');
    }
};
