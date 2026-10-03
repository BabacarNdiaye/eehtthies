<?php

namespace App\Console\Commands;

use App\Models\Formation;
use App\Support\ImageOptimizer;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class CompressFormationImages extends Command
{
    protected $signature = 'app:compress-formation-images';

    protected $description = 'Ponctuelle : redimensionne et ré-encode les images de formation déjà téléversées (plusieurs étaient des PNG de 1,4 à 2 Mo) via ImageOptimizer, pour alléger les pages publiques des formations.';

    public function handle(): int
    {
        $formations = Formation::whereNotNull('image')->get();
        $savedBytes = 0;
        $touched = 0;

        foreach ($formations as $formation) {
            $oldPath = $formation->image;
            $absolutePath = Storage::disk('public')->path($oldPath);

            if (! is_file($absolutePath)) {
                $this->warn("Fichier manquant pour {$formation->code} : {$oldPath}");

                continue;
            }

            $originalSize = filesize($absolutePath);

            // Enveloppe le fichier présent sur disque dans un UploadedFile pour qu'il passe par exactement le
            // même optimiseur que les nouveaux téléversements.
            $uploaded = new UploadedFile($absolutePath, basename($absolutePath), null, null, true);
            $newPath = ImageOptimizer::store($uploaded, 'formations');
            $newSize = Storage::disk('public')->size($newPath);

            if ($newSize >= $originalSize) {
                Storage::disk('public')->delete($newPath);
                $this->line("Image de {$formation->code} ignorée (déjà optimale) : ".round($originalSize / 1024).' Ko');

                continue;
            }

            $formation->update(['image' => $newPath]);
            Storage::disk('public')->delete($oldPath);

            $savedBytes += $originalSize - $newSize;
            $touched++;
            $this->info("{$formation->code}: ".round($originalSize / 1024).' Ko -> '.round($newSize / 1024).' Ko');
        }

        $this->info("{$touched} image(s) compressée(s), ".round($savedBytes / 1024 / 1024, 2).' Mo économisés au total.');

        return self::SUCCESS;
    }
}
