<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Conseils de classe : le conseil, ses membres et ses élèves (avec la photo figée de leurs données). Statuts, fonctions
     * et niveaux d'alerte sont des chaînes validées par des constantes PHP (pas d'enum MySQL).
     *
     * Les références à l'élève, à la classe et à l'année sont en RESTRICT : supprimer un élève ou une classe ne doit jamais
     * effacer un conseil, encore moins un procès-verbal. Les utilisateurs partis laissent un vide (nullOnDelete).
     */
    public function up(): void
    {
        Schema::create('councils', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained()->restrictOnDelete();
            $table->foreignId('school_class_id')->constrained()->restrictOnDelete();
            $table->string('term', 50);
            $table->boolean('is_end_of_year')->default(false);
            $table->dateTime('scheduled_at')->nullable();
            $table->string('room')->nullable();
            $table->text('agenda')->nullable();
            // draft | scheduled | in_session | drafting_minutes | pending_validation | closed (Council::STATUSES)
            $table->string('status', 20)->default('draft');
            $table->foreignId('president_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('main_teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('secretary_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('preconseil_deadline')->nullable();
            $table->dateTime('snapshot_taken_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('ended_at')->nullable();
            $table->dateTime('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('session_notes')->nullable();
            $table->text('general_observations')->nullable();
            $table->text('recommendations')->nullable();
            // Vue projetée : élève affiché par le président et compteur que la projection interroge (sondage).
            $table->unsignedBigInteger('focus_council_student_id')->nullable();
            $table->unsignedInteger('focus_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['school_class_id', 'academic_year_id', 'term'], 'councils_class_term_unique');
            $table->index('status');
            $table->index(['academic_year_id', 'term']);
        });

        Schema::create('council_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained()->nullOnDelete();
            $table->string('external_name')->nullable();
            $table->string('external_role')->nullable();
            // president | main_teacher | secretary | teacher | school_life | delegate_student | delegate_parent | tutor | other
            $table->string('function', 30);
            $table->boolean('can_vote')->default(true);
            // pending | present | absent | excused
            $table->string('attendance', 20)->default('pending');
            $table->dateTime('arrived_at')->nullable();
            $table->timestamps();

            $table->index(['council_id', 'function']);
        });

        Schema::create('council_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            // Photo des données au moment du figement (FIG-01) ; les colonnes ci-dessous en sont des copies pour trier.
            $table->json('snapshot')->nullable();
            $table->decimal('general_average', 5, 2)->nullable();
            $table->unsignedInteger('rank')->nullable();
            $table->unsignedInteger('class_size')->nullable();
            $table->decimal('previous_average', 5, 2)->nullable();
            $table->decimal('progression', 5, 2)->nullable();
            $table->unsignedSmallInteger('failed_subjects_count')->nullable();
            $table->decimal('unjustified_absence_hours', 6, 1)->nullable();
            // green | orange | red
            $table->string('alert_level', 10)->nullable();
            $table->json('alert_reasons')->nullable();
            // pending | on_hold | reviewed
            $table->string('review_status', 20)->default('pending');
            $table->text('main_teacher_summary')->nullable();
            $table->foreignId('main_teacher_recommendation_id')->nullable()->constrained('decision_types')->nullOnDelete();
            $table->text('general_appreciation')->nullable();
            $table->boolean('has_left_class')->default(false);
            // Verrou optimiste : augmente à chaque enregistrement (ENF-08).
            $table->unsignedInteger('revision')->default(0);
            $table->timestamps();

            $table->unique(['council_id', 'student_id']);
            $table->index(['council_id', 'alert_level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('council_students');
        Schema::dropIfExists('council_members');
        Schema::dropIfExists('councils');
    }
};
