<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Un cycle de paie : un mois, préparé en brouillon, validé, puis payé ligne par ligne.
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('period_year');
            $table->unsignedTinyInteger('period_month');
            // brouillon | validee
            $table->string('status', 12)->default('brouillon');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();

            $table->unique(['period_year', 'period_month']);
        });

        // Une ligne par personne : l'instantané de ce qui a été préparé (nom, base, heures, primes, retenues, compte), pour
        // que le cycle validé reste lisible même si la fiche de la personne change ensuite.
        Schema::create('payroll_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('position')->nullable();
            // fixe | horaire
            $table->string('payment_type', 10);
            // Salaire fixe du mois, ou heures × taux pour un enseignant payé à l'heure.
            $table->decimal('base_amount', 12, 2);
            $table->decimal('hours', 8, 2)->nullable();
            $table->decimal('hourly_rate', 10, 2)->nullable();
            // [{type: prime|retenue, label, amount}]
            $table->json('adjustments')->nullable();
            $table->decimal('net_amount', 12, 2);
            $table->string('payout_channel', 30)->nullable();
            $table->string('payout_account', 120)->nullable();
            // Séances du cahier de texte sans créneau d'emploi du temps : non comptées, signalées.
            $table->unsignedSmallInteger('unmatched_sessions')->default(0);
            $table->text('notes')->nullable();
            // Payé ⇔ l'un de ces liens existe ; annuler le paiement dans le registre le remet à zéro.
            $table->foreignId('salary_payment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('teacher_salary_payment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['payroll_run_id', 'user_id']);
            $table->unique(['payroll_run_id', 'teacher_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_lines');
        Schema::dropIfExists('payroll_runs');
    }
};
