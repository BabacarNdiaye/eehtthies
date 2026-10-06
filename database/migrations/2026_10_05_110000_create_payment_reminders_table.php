<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            // « auto » : relance planifiée ; « manual » : bouton « Relancer » du personnel (sent_by).
            $table->string('kind', 10);
            // Palier qui a déclenché l'envoi : jours de retard (3, 7, 15, 30, 60) ou -3 pour le rappel avant échéance.
            // Vide pour une facture seulement citée dans le message et pour une relance manuelle.
            $table->smallInteger('milestone')->nullable();
            // Jours écoulés depuis l'échéance au moment de l'envoi (négatif avant l'échéance).
            $table->smallInteger('days_overdue');
            $table->decimal('balance', 12, 2);
            // Canaux atteints : mail, push, connect.
            $table->json('channels')->nullable();
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Un palier ne part jamais deux fois pour une même facture (les valeurs vides ne se concurrencent pas).
            $table->unique(['invoice_id', 'milestone']);
            $table->index(['student_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_reminders');
    }
};
