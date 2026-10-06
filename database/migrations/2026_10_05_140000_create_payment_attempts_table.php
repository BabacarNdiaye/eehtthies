<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Une tentative de paiement en ligne : ce que l'élève ou son parent a décidé de payer (montant et répartition sur ses
     * factures), le pilote et le canal choisis, et où elle en est. Rien n'est encaissé tant que le fournisseur ne l'a pas
     * confirmée ; une fois confirmée, `batch_token` renvoie vers l'encaissement (le reçu).
     */
    public function up(): void
    {
        Schema::create('payment_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 32)->unique();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('initiated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('driver', 40);
            $table->string('channel', 40)->nullable();
            $table->decimal('amount', 12, 2);
            $table->json('allocations');
            $table->string('status', 20)->default('initiated');
            $table->string('provider_reference')->nullable();
            $table->text('checkout_url')->nullable();
            $table->string('batch_token', 64)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_attempts');
    }
};
