<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Registre des sanctions de la vie scolaire. Le niveau est une chaîne (constantes de DisciplineRecord::LEVELS),
        // pas un enum MySQL : ajouter un niveau ne doit pas exiger de migration.
        Schema::create('discipline_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            // Classe de l'élève au moment des faits (l'élève peut changer de classe ensuite).
            $table->foreignId('school_class_id')->nullable()->constrained()->nullOnDelete();
            $table->date('occurred_on');
            $table->string('level', 30);
            $table->text('reason');
            // Nombre de jours d'exclusion, pour une exclusion temporaire.
            $table->unsignedSmallInteger('days')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['student_id', 'occurred_on']);
            $table->index(['school_class_id', 'occurred_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discipline_records');
    }
};
