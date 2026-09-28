<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // 1-12, only meaningful when type = 'mensualite'. Lets a monthly
            // tuition invoice be tagged to a specific calendar month so it can
            // be tracked/generated per-month instead of as one lump sum.
            $table->unsignedTinyInteger('period_month')->nullable()->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('period_month');
        });
    }
};
