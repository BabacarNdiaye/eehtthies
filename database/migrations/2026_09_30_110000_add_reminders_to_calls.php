<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * « Me le rappeler » : un appel refusé peut programmer un rappel envoyé à la
 * personne appelée (notification + message de l'assistant EEHT Connect).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->timestamp('remind_at')->nullable()->index();
            $table->timestamp('reminded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->dropIndex(['remind_at']);
            $table->dropColumn(['remind_at', 'reminded_at']);
        });
    }
};
