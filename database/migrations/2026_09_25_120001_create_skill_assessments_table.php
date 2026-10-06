<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skill_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('level');
            $table->date('assessed_at');
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'skill_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('skill_assessments');
    }
};
