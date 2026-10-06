<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->string('payment_type')->default('fixe')->after('experience_years');
            $table->decimal('monthly_salary', 10, 2)->nullable()->after('payment_type');
            $table->decimal('hourly_rate', 10, 2)->nullable()->after('monthly_salary');
        });
    }

    public function down(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn(['payment_type', 'monthly_salary', 'hourly_rate']);
        });
    }
};
