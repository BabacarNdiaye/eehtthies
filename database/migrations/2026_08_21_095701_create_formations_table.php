<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('slug')->unique();
            $table->string('diploma')->nullable(); // CAP, BEP, BT, BTS, DTS, Qualifiante...
            $table->string('level')->nullable();
            $table->string('duration')->nullable(); // ex: 2 ans
            $table->text('description')->nullable();
            $table->text('admission_conditions')->nullable();
            $table->decimal('registration_fee', 12, 2)->default(0);
            $table->decimal('tuition_fee', 12, 2)->default(0);
            $table->longText('program')->nullable(); // programme / matières (texte riche)
            $table->text('objectives')->nullable();
            $table->text('career_prospects')->nullable(); // débouchés
            $table->unsignedInteger('capacity')->nullable();
            $table->string('image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formations');
    }
};
