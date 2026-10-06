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
            $table->string('blood_group', 10)->nullable()->after('emergency_contact');
            $table->text('allergies')->nullable()->after('blood_group');
            $table->text('chronic_conditions')->nullable()->after('allergies');
            $table->text('current_medication')->nullable()->after('chronic_conditions');
            $table->string('health_insurance')->nullable()->after('current_medication');
            $table->string('doctor_name')->nullable()->after('health_insurance');
            $table->string('doctor_phone', 30)->nullable()->after('doctor_name');
            $table->text('health_notes')->nullable()->after('doctor_phone');
        });
    }

    /**
     * Annule les migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'blood_group', 'allergies', 'chronic_conditions', 'current_medication',
                'health_insurance', 'doctor_name', 'doctor_phone', 'health_notes',
            ]);
        });
    }
};
