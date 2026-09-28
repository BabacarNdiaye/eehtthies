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

    protected $description = 'One-time: resizes + re-encodes already-uploaded formation images (several were 1.4-2MB PNGs) via ImageOptimizer, to cut page weight on the public formations pages.';

    public function handle(): int
    {
        $formations = Formation::whereNotNull('image')->get();
        $savedBytes = 0;
        $touched = 0;

        foreach ($formations as $formation) {
            $oldPath = $formation->image;
            $absolutePath = Storage::disk('public')->path($oldPath);

            if (! is_file($absolutePath)) {
                $this->warn("Missing file for {$formation->code}: {$oldPath}");

                continue;
            }

            $originalSize = filesize($absolutePath);

            // Wrap the on-disk file as an UploadedFile so it can go through
            // the exact same optimizer used for new uploads.
            $uploaded = new UploadedFile($absolutePath, basename($absolutePath), null, null, true);
            $newPath = ImageOptimizer::store($uploaded, 'formations');
            $newSize = Storage::disk('public')->size($newPath);

            if ($newSize >= $originalSize) {
                Storage::disk('public')->delete($newPath);
                $this->line("Skipped {$formation->code} (already optimal): ".round($originalSize / 1024)."KB");

                continue;
            }

            $formation->update(['image' => $newPath]);
            Storage::disk('public')->delete($oldPath);

            $savedBytes += $originalSize - $newSize;
            $touched++;
            $this->info("{$formation->code}: ".round($originalSize / 1024)."KB -> ".round($newSize / 1024)."KB");
        }

        $this->info("Compressed {$touched} image(s), saved ".round($savedBytes / 1024 / 1024, 2).' MB total.');

        return self::SUCCESS;
    }
}
