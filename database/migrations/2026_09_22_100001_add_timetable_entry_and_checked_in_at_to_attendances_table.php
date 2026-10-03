<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->foreignId('timetable_entry_id')->nullable()->after('subject_id')->constrained()->nullOnDelete();
            // dateTime et non timestamp : évite le comportement implicite ON UPDATE CURRENT_TIMESTAMP de
            // MySQL et reste une valeur simple, sans fuseau horaire, comme la colonne `date` existante.
            $table->dateTime('checked_in_at')->nullable()->after('status');
            $table->index(['timetable_entry_id', 'date'], 'attendances_timetable_entry_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex('attendances_timetable_entry_date_index');
            $table->dropConstrainedForeignId('timetable_entry_id');
            $table->dropColumn('checked_in_at');
        });
    }
};
