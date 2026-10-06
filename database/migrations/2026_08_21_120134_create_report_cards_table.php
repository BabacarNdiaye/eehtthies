<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('school_class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->string('term'); // ex: Semestre 1
            $table->decimal('average', 5, 2)->nullable();
            $table->unsignedInteger('rank')->nullable();
            $table->unsignedInteger('class_size')->nullable();
            $table->enum('decision', ['admis', 'redouble', 'rattrapage', 'non_defini'])->default('non_defini');
            $table->text('general_appreciation')->nullable();
            $table->string('qr_token')->unique();
            $table->boolean('is_published')->default(false);
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'academic_year_id', 'term']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_cards');
    }
};
