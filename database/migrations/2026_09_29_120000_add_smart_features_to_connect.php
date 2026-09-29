<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * EEHT Connect « intelligent » : réponses citées, réactions, mentions,
 * messages épinglés, messages automatiques (rappels) et leur dédoublonnage.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_messages', function (Blueprint $table) {
            $table->foreignId('reply_to_id')->nullable()->after('user_id')->constrained('conversation_messages')->nullOnDelete();
            // user = écrit par une personne ; system = rappel automatique d'EEHT Connect
            $table->string('kind', 10)->default('user')->after('reply_to_id');
            $table->json('meta')->nullable()->after('attachment_mime');
            $table->timestamp('pinned_at')->nullable()->after('meta');
            $table->foreignId('pinned_by')->nullable()->after('pinned_at')->constrained('users')->nullOnDelete();
        });

        Schema::create('message_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('emoji', 16);
            $table->timestamps();
            $table->unique(['conversation_message_id', 'user_id', 'emoji'], 'message_reactions_unique');
        });

        Schema::create('message_mentions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unique(['conversation_message_id', 'user_id']);
            $table->index('user_id');
        });

        // Rappels déjà envoyés (clé unique : « exam:12:j1 », « lesson:40 »…).
        Schema::create('connect_reminders', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->timestamp('sent_at');
        });

        // Changements d'emploi du temps en attente, regroupés en un seul
        // message par classe au prochain passage de app:connect-reminders.
        Schema::create('connect_pending_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_class_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('description');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('connect_pending_events');
        Schema::dropIfExists('connect_reminders');
        Schema::dropIfExists('message_mentions');
        Schema::dropIfExists('message_reactions');

        Schema::table('conversation_messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pinned_by');
            $table->dropConstrainedForeignId('reply_to_id');
            $table->dropColumn(['kind', 'meta', 'pinned_at']);
        });
    }
};
