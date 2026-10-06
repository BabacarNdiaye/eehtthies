<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // nullOnDelete (et non cascade) : supprimer un échéancier ne doit jamais supprimer de vraies
            // factures ou paiements — il les dégroupe seulement en factures indépendantes.
            $table->foreignId('payment_plan_id')->nullable()->after('student_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_plan_id');
        });
    }
};
