<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('information_notes', function (Blueprint $table) {
            $table->unsignedInteger('emails_count')->default(0)->after('announcement_id');
        });
    }

    public function down(): void
    {
        Schema::table('information_notes', function (Blueprint $table) {
            $table->dropColumn('emails_count');
        });
    }
};
