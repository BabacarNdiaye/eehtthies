<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Comment la personne est payée (Wave, virement…) et sur quel compte : données sensibles, jamais journalisées.
        foreach (['users', 'teachers'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->string('payout_channel', 30)->nullable();
                $blueprint->string('payout_account', 120)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['users', 'teachers'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropColumn(['payout_channel', 'payout_account']);
            });
        }
    }
};
