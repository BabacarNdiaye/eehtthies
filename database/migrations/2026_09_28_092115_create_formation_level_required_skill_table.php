<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_level_required_skill', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formation_level_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['formation_level_id', 'skill_id'], 'flrsk_level_skill_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_level_required_skill');
    }
};
