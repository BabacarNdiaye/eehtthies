<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sert les fichiers publics (photos d'élèves et d'enseignants, galerie, actualités, diaporama) à l'adresse /storage/…
 * quand le raccourci public/storage n'existe pas : hébergement sans terminal où « php artisan storage:link » n'a pas pu
 * être lancé, ou qui interdit les liens symboliques. Quand le raccourci existe, le serveur web sert le fichier lui-même
 * et ce contrôleur n'est jamais appelé.
 *
 * Seul le disque « public » est exposé. Les dossiers sensibles, les fichiers cachés et tout chemin remontant sont refusés
 * (404) : les documents d'élèves ne sortent jamais par ici, même avant d'avoir été déplacés sur le disque privé.
 */
class PublicStorageController extends Controller
{
    /** Dossiers du disque public qui ne doivent JAMAIS être servis à tout le monde. */
    private const FORBIDDEN_PREFIXES = ['student-documents/', 'backups/', 'private/'];

    public function __invoke(string $path): Response
    {
        $path = ltrim($path, '/');

        abort_if($path === '' || str_contains($path, '..') || str_contains($path, "\0"), 404);
        abort_if(str_starts_with(basename($path), '.'), 404);

        foreach (self::FORBIDDEN_PREFIXES as $prefix) {
            abort_if(str_starts_with($path, $prefix), 404);
        }

        $disk = Storage::disk('public');

        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, [
            'Cache-Control' => 'public, max-age=604800',
            'X-Content-Type-Options' => 'nosniff',
            // Un fichier téléversé ne peut ni exécuter de script ni charger quoi que ce soit ; l'objet « self » laisse le lecteur
            // PDF du navigateur s'afficher dans le lecteur de la bibliothèque.
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; object-src 'self'; frame-ancestors 'self'",
        ]);
    }
}
