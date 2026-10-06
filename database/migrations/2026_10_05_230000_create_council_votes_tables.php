<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot V3 : votes du conseil (VOT-01 à VOT-05). Un vote porte sur une décision proposée pour un élève — le couple
 * (élève du conseil, type de décision), car les lignes de décision sont réécrites à chaque enregistrement de la séance.
 * Les règles en vigueur à l'ouverture (majorité, voix prépondérante, secret) et le quorum constaté sont recopiés sur le
 * vote : un réglage modifié plus tard ne change pas un résultat acquis.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('council_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('council_student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('decision_type_id')->constrained()->restrictOnDelete();
            // device | show_of_hands
            $table->string('mode', 20);
            // nominal | secret
            $table->string('secrecy', 10);
            // expressed | absolute_present
            $table->string('majority', 20);
            $table->boolean('casting_vote');
            $table->unsignedSmallInteger('voters_convoked');
            $table->unsignedSmallInteger('voters_present');
            $table->unsignedSmallInteger('quorum_required');
            $table->unsignedSmallInteger('votes_for')->default(0);
            $table->unsignedSmallInteger('votes_against')->default(0);
            $table->unsignedSmallInteger('abstentions')->default(0);
            // adopted | rejected ; nul tant que le vote est ouvert
            $table->string('result', 10)->nullable();
            $table->boolean('tie_broken')->default(false);
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('opened_at');
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['council_id', 'closed_at']);
            $table->index(['council_student_id', 'decision_type_id']);
        });

        Schema::create('council_vote_ballots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_vote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('council_member_id')->constrained()->cascadeOnDelete();
            // for | against | abstain ; nul en vote secret (on sait qui a voté, pas quoi)
            $table->string('choice', 10)->nullable();
            $table->timestamps();

            $table->unique(['council_vote_id', 'council_member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('council_vote_ballots');
        Schema::dropIfExists('council_votes');
    }
};
