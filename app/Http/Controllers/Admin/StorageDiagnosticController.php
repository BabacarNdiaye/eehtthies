<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Storage;

/**
 * « Diagnostic des photos » : dit pourquoi les photos ne s'affichent pas en ligne, sans terminal. Il contrôle le dossier
 * des fichiers publics, le raccourci public/storage, les photos que la base de données annonce et qui manquent sur le
 * disque, et affiche une image de test servie par la même adresse /storage/… que les photos. Réservé à la direction.
 */
class StorageDiagnosticController extends Controller
{
    public function __invoke(): View
    {
        $root = storage_path('app/public');
        $link = public_path('storage');
        $disk = Storage::disk('public');

        // Image de test, réécrite à chaque ouverture de la page.
        $testWritten = false;
        try {
            $testWritten = $disk->put('diagnostic/test.png', $this->testPng());
        } catch (\Throwable) {
        }

        [$files, $bytes] = $this->scan($root);

        $linkInfo = [
            'path' => $link,
            'exists' => file_exists($link) || is_link($link),
            'is_link' => is_link($link),
            'target' => is_link($link) ? (string) readlink($link) : null,
            'works' => is_link($link) && @realpath($link) !== false && @realpath($link) === @realpath($root),
            'can_symlink' => function_exists('symlink') && ! in_array('symlink', array_map('trim', explode(',', (string) ini_get('disable_functions'))), true),
        ];

        $groups = [
            'Élèves' => $this->photoCheck(Student::query()->whereNotNull('photo')->where('photo', '!=', ''), 'photo', $disk),
            'Enseignants' => $this->photoCheck(Teacher::query()->whereNotNull('photo')->where('photo', '!=', ''), 'photo', $disk),
        ];

        $verdicts = [];

        if (! is_dir($root)) {
            $verdicts[] = ['bad', "Le dossier des fichiers publics n'existe pas : {$root}. Créez-le (storage/app/public)."];
        } elseif (! is_writable($root)) {
            $verdicts[] = ['bad', 'Le dossier des fichiers publics n\'est pas modifiable : les nouvelles photos ne pourront pas être enregistrées (droits 775 à donner à storage/).'];
        }

        if ($files <= 1) {
            $verdicts[] = ['bad', "Le dossier des photos est vide en ligne ({$root}). Les photos ont été téléversées sur un autre ordinateur et n'ont jamais été envoyées : copiez-y le dossier storage/app/public de cet ordinateur."];
        }

        foreach ($groups as $label => $group) {
            if ($group['missing'] > 0) {
                $verdicts[] = ['bad', "{$label} : {$group['missing']} photo(s) sur {$group['total']} sont enregistrées dans la base mais le fichier est introuvable sur le disque."];
            } elseif ($group['total'] > 0) {
                $verdicts[] = ['ok', "{$label} : les {$group['total']} photos enregistrées sont bien présentes sur le disque."];
            }
        }

        if ($linkInfo['is_link'] && ! $linkInfo['works']) {
            $verdicts[] = ['warn', "Le raccourci public/storage existe mais pointe ailleurs ({$linkInfo['target']}) : il est cassé. L'application sert quand même les photos elle-même ; supprimez ce raccourci, ou recréez-le."];
        } elseif (! $linkInfo['exists']) {
            $verdicts[] = ['ok', "Pas de raccourci public/storage : c'est sans gravité, l'application sert les photos elle-même."];
        } elseif ($linkInfo['works']) {
            $verdicts[] = ['ok', 'Le raccourci public/storage fonctionne.'];
        }

        if (! $testWritten) {
            $verdicts[] = ['bad', "Impossible d'écrire l'image de test dans storage/app/public : vérifiez les droits d'écriture du dossier storage/."];
        }

        return view('diagnostics.storage', [
            'appUrl' => (string) config('app.url'),
            'root' => $root,
            'rootExists' => is_dir($root),
            'files' => $files,
            'megabytes' => round($bytes / 1048576, 1),
            'link' => $linkInfo,
            'groups' => $groups,
            'verdicts' => $verdicts,
            'testUrl' => '/storage/diagnostic/test.png',
        ]);
    }

    /** Nombre de fichiers et poids du dossier (arrêt à 50 000 fichiers pour ne pas ralentir la page). @return array{0: int, 1: int} */
    private function scan(string $root): array
    {
        if (! is_dir($root)) {
            return [0, 0];
        }

        $count = 0;
        $bytes = 0;

        try {
            $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS));
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $count++;
                    $bytes += $file->getSize();
                }
                if ($count >= 50000) {
                    break;
                }
            }
        } catch (\Throwable) {
        }

        return [$count, $bytes];
    }

    /** @return array{total: int, missing: int, samples: list<array{path: string, exists: bool}>} */
    private function photoCheck($query, string $column, $disk): array
    {
        $total = (clone $query)->count();
        $missing = 0;
        $samples = [];

        (clone $query)->orderBy('id')->limit(300)->pluck($column)->each(function (string $path) use ($disk, &$missing, &$samples) {
            $exists = $disk->exists(ltrim($path, '/'));
            $missing += $exists ? 0 : 1;
            if (count($samples) < 6 && (! $exists || count($samples) < 3)) {
                $samples[] = ['path' => $path, 'exists' => $exists];
            }
        });

        return ['total' => $total, 'missing' => $missing, 'samples' => $samples];
    }

    private function testPng(): string
    {
        $im = imagecreatetruecolor(24, 24);
        imagefill($im, 0, 0, imagecolorallocate($im, 22, 163, 74));
        ob_start();
        imagepng($im);

        return (string) ob_get_clean();
    }
}
