<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->enum('type', [
                'devoir', 'interrogation', 'controle', 'examen',
                'examen_pratique', 'examen_theorique',
            ])->default('devoir');
            $table->enum('session', ['normale', 'rattrapage'])->default('normale');
            $table->foreignId('school_class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained()->nullOnDelete();
            $table->string('term')->nullable(); // ex: Semestre 1
            $table->date('exam_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->decimal('max_score', 5, 2)->default(20);
            $table->decimal('coefficient', 5, 2)->default(1);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });

        Schema::create('exam_teacher', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_teacher');
        Schema::dropIfExists('exams');
    }
};
