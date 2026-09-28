<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formation_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('level_number');
            $table->string('label');
            $table->boolean('is_final_level')->default(false);
            $table->decimal('min_average', 4, 2)->nullable();
            $table->unsignedInteger('max_unjustified_absences')->nullable();
            $table->boolean('internship_required')->default(false);
            $table->boolean('final_exam_required')->default(false);
            $table->timestamps();

            $table->unique(['formation_id', 'level_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_levels');
    }
};
