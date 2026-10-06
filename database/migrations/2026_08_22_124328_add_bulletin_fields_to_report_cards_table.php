<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remplace l'enum rigide par une simple chaîne afin de pouvoir ajouter plus tard de nouvelles valeurs
        // de décision (p. ex. « exclu ») sans migration de la base.
        Schema::table('report_cards', function (Blueprint $table) {
            $table->dropColumn('decision');
        });

        Schema::table('report_cards', function (Blueprint $table) {
            $table->string('decision')->default('non_defini')->after('class_size');
            $table->string('mention')->nullable()->after('decision');
            $table->decimal('class_average', 5, 2)->nullable()->after('mention');
            $table->decimal('previous_term_average', 5, 2)->nullable()->after('class_average');
            $table->decimal('annual_average', 5, 2)->nullable()->after('previous_term_average');
            $table->unsignedInteger('annual_rank')->nullable()->after('annual_average');
            $table->unsignedInteger('retard_count')->default(0)->after('annual_rank');
            $table->unsignedInteger('absence_count')->default(0)->after('retard_count');
            $table->unsignedInteger('unjustified_absence_count')->default(0)->after('absence_count');
        });
    }

    public function down(): void
    {
        Schema::table('report_cards', function (Blueprint $table) {
            $table->dropColumn([
                'mention', 'class_average', 'previous_term_average', 'annual_average',
                'annual_rank', 'retard_count', 'absence_count', 'unjustified_absence_count',
            ]);
        });

        Schema::table('report_cards', function (Blueprint $table) {
            $table->dropColumn('decision');
        });

        Schema::table('report_cards', function (Blueprint $table) {
            $table->enum('decision', ['admis', 'redouble', 'rattrapage', 'non_defini'])->default('non_defini')->after('class_size');
        });
    }
};
