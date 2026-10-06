<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lot V3 : notification de clôture aux familles (DIR-07). Une ligne par élève prévenu : elle évite de prévenir deux fois
 * et garde la trace des canaux utilisés. Table à part, hors du verrou du conseil : on prévient après la clôture.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('council_family_notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('council_id')->constrained()->cascadeOnDelete();
            $table->foreignId('council_student_id')->constrained()->cascadeOnDelete();
            // Canaux réellement utilisés : mail, push, connect.
            $table->json('channels');
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->unique('council_student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('council_family_notices');
    }
};
