<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lot V2 du conseil de classe : pré-conseil (appréciations des enseignants et banque de phrases), évaluation de
     * stage, actions de suivi, recours, et lien entre le bulletin et le conseil qui l'a décidé.
     */
    public function up(): void
    {
        Schema::create('appreciation_templates', function (Blueprint $table) {
            $table->id();
            // excellent | bien | moyen | insuffisant (AppreciationTemplate::LEVELS)
            $table->string('level', 20);
            // travail | comportement | progression (AppreciationTemplate::THEMES)
            $table->string('theme', 20);
            $table->text('text');
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('council_observations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('council_student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->restrictOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // Publiable sur le bulletin et à la projection.
            $table->text('appreciation')->nullable();
            // Interne : jamais projeté, jamais montré aux familles.
            $table->text('internal_note')->nullable();
            $table->string('difficulty', 30)->nullable();
            $table->text('recommendation')->nullable();
            $table->unsignedInteger('revision')->default(0);
            $table->timestamps();

            $table->unique(['council_student_id', 'subject_id']);
        });

        Schema::create('internship_criteria', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('council_internship_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('council_student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('criterion_id')->constrained('internship_criteria')->restrictOnDelete();
            $table->string('company_name')->nullable();
            $table->string('tutor_name')->nullable();
            // tres_satisfaisant | satisfaisant | a_ameliorer | insuffisant
            $table->string('rating', 30)->nullable();
            $table->text('comment')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['council_student_id', 'criterion_id'], 'council_internship_student_criterion');
        });

        Schema::create('council_follow_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('council_decision_id')->nullable()->constrained()->nullOnDelete();
            // null | family_interview
            $table->string('kind', 30)->nullable();
            $table->text('problem');
            $table->text('action')->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            // todo | in_progress | done | not_done | abandoned
            $table->string('status', 20)->default('todo');
            $table->text('comment')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('interview_at')->nullable();
            $table->text('interview_report')->nullable();
            $table->dateTime('reminded_before_at')->nullable();
            $table->dateTime('reminded_due_at')->nullable();
            $table->timestamps();

            $table->index(['owner_id', 'status', 'due_date']);
            $table->index(['student_id', 'status']);
        });

        Schema::create('council_appeals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('council_decision_id')->constrained()->restrictOnDelete();
            $table->date('filed_at');
            $table->string('filed_by_name');
            $table->text('reason');
            $table->date('deadline');
            // pending | upheld | modified
            $table->string('outcome', 20)->default('pending');
            $table->dateTime('outcome_at')->nullable();
            $table->foreignId('outcome_decision_id')->nullable()->constrained('council_decisions')->nullOnDelete();
            $table->text('outcome_comment')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('report_cards', function (Blueprint $table) {
            $table->foreignId('council_id')->nullable()->after('general_appreciation')->constrained()->nullOnDelete();
            $table->boolean('decision_provisional')->default(false)->after('council_id');
        });
    }

    public function down(): void
    {
        Schema::table('report_cards', function (Blueprint $table) {
            $table->dropConstrainedForeignId('council_id');
            $table->dropColumn('decision_provisional');
        });

        Schema::dropIfExists('council_appeals');
        Schema::dropIfExists('council_follow_ups');
        Schema::dropIfExists('council_internship_evaluations');
        Schema::dropIfExists('internship_criteria');
        Schema::dropIfExists('council_observations');
        Schema::dropIfExists('appreciation_templates');
    }
};
