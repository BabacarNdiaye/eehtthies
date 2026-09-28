<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_logs', function (Blueprint $table) {
            $table->id();
            // nullOnDelete (not cascade): a lesson log is a pedagogical record that
            // must survive an admin later deleting/restructuring the timetable slot.
            $table->foreignId('timetable_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('school_class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->text('content');
            $table->text('homework')->nullable();
            $table->timestamps();

            $table->unique(['timetable_entry_id', 'date'], 'lesson_log_unique_session');
            $table->index(['school_class_id', 'date']);
            $table->index(['teacher_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_logs');
    }
};
