<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Décisions du conseil, élève par élève. Le type de décision est en RESTRICT : un type déjà choisi ne se supprime plus
     * (on le désactive). Statut : active, provisional (sous recours, V2) ou rectified (remplacée par une rectification,
     * `superseded_by` pointe la nouvelle décision).
     */
    public function up(): void
    {
        Schema::create('council_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('council_student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('decision_type_id')->constrained()->restrictOnDelete();
            $table->text('reason')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('active');
            $table->unsignedBigInteger('superseded_by')->nullable();
            $table->timestamps();

            $table->index(['council_student_id', 'status']);
            $table->index(['council_id', 'decision_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('council_decisions');
    }
};
