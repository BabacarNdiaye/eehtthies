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
        Schema::table('internal_messages', function (Blueprint $table) {
            // Groups a message with its replies. Equals the root message's own
            // id (backfilled on create) — not a strict FK, since it can point
            // to a row that didn't exist yet at insert time.
            $table->unsignedBigInteger('thread_id')->nullable()->after('recipient_id')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('internal_messages', function (Blueprint $table) {
            $table->dropColumn('thread_id');
        });
    }
};
