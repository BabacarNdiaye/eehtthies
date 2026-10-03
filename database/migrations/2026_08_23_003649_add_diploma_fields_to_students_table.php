<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Exécute les migrations.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('diploma_number')->nullable()->unique()->after('is_repeating');
            $table->date('diploma_issued_at')->nullable()->after('diploma_number');
        });
    }

    /**
     * Annule les migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['diploma_number', 'diploma_issued_at']);
        });
    }
};
