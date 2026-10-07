<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('information_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('number');
            $table->date('note_date');
            $table->string('subject');
            $table->text('body');
            $table->string('audience_type');
            $table->unsignedBigInteger('audience_id')->nullable();
            $table->foreignId('announcement_id')->nullable()->constrained('announcements')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['year', 'number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('information_notes');
    }
};
