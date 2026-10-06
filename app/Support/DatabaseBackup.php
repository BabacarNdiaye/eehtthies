<?php

namespace App\Support;

use Illuminate\Support\Facades\Artisan;
use Throwable;

/**
 * Sauvegarde de la base de données demandée avant une opération destructive. Même appel que le bouton
 * « Créer une sauvegarde » (BackupController::store), enveloppé pour ne jamais lever d'exception et rester
 * simulable dans les tests : un échec se traduit par `false`, et l'appelant renonce à supprimer quoi que ce soit.
 */
class DatabaseBackup
{
    public function run(): bool
    {
        try {
            return Artisan::call('backup:run', ['--only-db' => true]) === 0;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }
}
