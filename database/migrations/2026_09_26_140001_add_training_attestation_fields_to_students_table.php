<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('training_attestation_number')->nullable()->after('diploma_issued_at');
            $table->date('training_attestation_issued_at')->nullable()->after('training_attestation_number');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['training_attestation_number', 'training_attestation_issued_at']);
        });
    }
};
