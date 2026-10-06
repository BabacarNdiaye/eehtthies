<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidatures', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('formation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained()->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('birth_date')->nullable();
            $table->enum('gender', ['M', 'F'])->nullable();
            $table->string('email');
            $table->string('phone');
            $table->text('address')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->string('last_school')->nullable();
            $table->string('last_diploma')->nullable();
            $table->text('motivation')->nullable();
            $table->enum('status', [
                'brouillon',
                'soumise',
                'en_cours_etude',
                'dossier_incomplet',
                'preselectionnee',
                'acceptee',
                'refusee',
                'inscription_finalisee',
            ])->default('soumise');
            $table->text('admin_notes')->nullable();
            $table->string('source')->nullable(); // site, facebook, téléphone…
            $table->timestamp('interview_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidatures');
    }
};
