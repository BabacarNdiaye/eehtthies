<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            // present | absent_justifie | absent_non_justifie : c'est le statut qui distingue un 0 (absence non
            // justifiée, qui compte dans la moyenne) d'une absence justifiée (évaluation ignorée). Une chaîne et non
            // un enum, comme la décision des bulletins : une valeur de plus ne demandera pas de migration.
            $table->string('status', 24)->default('present')->after('score');
        });

        // Les absences déjà saisies ne disent rien d'une éventuelle justification, et l'ancien calcul les ignorait,
        // exactement comme une absence justifiée : on les reprend ainsi pour que les bulletins déjà générés gardent
        // leurs résultats. À reclasser en « non justifiée » dans la saisie des notes, épreuve par épreuve, au besoin.
        DB::table('grades')->where('is_absent', true)->update(['status' => 'absent_justifie']);
    }

    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
