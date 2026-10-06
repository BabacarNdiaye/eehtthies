<?php

namespace App\Console\Commands;

use App\Models\StudentDocument;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Déplace les documents d'élèves (pièces d'identité, certificats…) de l'ancien disque public, dont les liens
 * s'ouvraient sans connexion, vers le disque privé. Tourne chaque nuit : sans effet quand tout est déjà privé.
 */
class PrivatizeStudentDocuments extends Command
{
    protected $signature = 'app:privatize-student-documents';

    protected $description = 'Déplace les documents d’élèves du disque public vers le disque privé';

    public function handle(): int
    {
        $moved = 0;
        $missing = 0;

        StudentDocument::query()->orderBy('id')->each(function (StudentDocument $document) use (&$moved, &$missing) {
            $before = Storage::disk('public')->exists($document->file_path);
            $disk = $document->privatize();

            if ($disk === null) {
                $missing++;
            } elseif ($before && $disk === 'local') {
                $moved++;
            }
        });

        $this->info("{$moved} document(s) déplacé(s) vers le disque privé".($missing > 0 ? ", {$missing} fichier(s) introuvable(s)" : '').'.');

        return self::SUCCESS;
    }
}
