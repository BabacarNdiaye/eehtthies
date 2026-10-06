<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * « Exclure » (passation de classe) et le statut « Exclu » d'un dossier écrivent `exclu` dans students.status, mais la
     * colonne a été créée en ENUM sans cette valeur : sur MySQL l'enregistrement échoue (« Data truncated for column
     * 'status' ») et l'exclusion ne peut pas être enregistrée. On l'ajoute à la liste ; les autres valeurs, leur ordre et la
     * valeur par défaut ne changent pas. SQLite n'a pas de vrai ENUM (la colonne y est un simple texte) : rien à faire.
     */
    public function up(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        $table = DB::getTablePrefix().'students';

        DB::statement("ALTER TABLE `{$table}` MODIFY `status` ENUM('actif', 'suspendu', 'abandon', 'diplome', 'transfere', 'exclu') NOT NULL DEFAULT 'actif'");
    }

    /**
     * Pas de retour en arrière : retirer la valeur ferait échouer (ou tronquerait) les dossiers déjà exclus, alors qu'une liste
     * plus large est sans danger pour l'ancien code.
     */
    public function down(): void
    {
        //
    }
};
