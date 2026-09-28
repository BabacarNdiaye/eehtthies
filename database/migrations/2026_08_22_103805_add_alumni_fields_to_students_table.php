<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->unsignedInteger('graduation_year')->nullable()->after('status');
            $table->string('current_position')->nullable()->after('graduation_year');
            $table->string('current_employer')->nullable()->after('current_position');
            $table->string('linkedin_url')->nullable()->after('current_employer');
            $table->text('alumni_bio')->nullable()->after('linkedin_url');
            $table->boolean('is_alumni_public')->default(false)->after('alumni_bio');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'graduation_year', 'current_position', 'current_employer',
                'linkedin_url', 'alumni_bio', 'is_alumni_public',
            ]);
        });
    }
};
