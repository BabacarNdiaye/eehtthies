<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_visits', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45)->nullable();
            $table->string('country_code', 2)->nullable();
            $table->string('country')->nullable();
            $table->string('region')->nullable();
            $table->string('city')->nullable();
            $table->string('path', 255);
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index('created_at');
            $table->index(['country', 'region']);
            $table->index('ip_address');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_visits');
    }
};
