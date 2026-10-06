<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Redimensionne et ré-encode les images téléversées avant leur écriture sur disque, pour que les pages
 * construites à partir de photos téléversées par l'administration n'envoient pas à chaque visiteur des
 * originaux de plusieurs mégaoctets. Uniquement GD (Imagick n'est pas disponible en production — voir le
 * correctif du code QR dans l'historique de déploiement) et sans dépendance, car ajouter un nouveau paquet
 * Composer reviendrait à synchroniser un nouveau sous-arbre vendor/ par FTP, sans accès SSH pour régénérer
 * l'autochargeur sur cet hébergement.
 */
class ImageOptimizer
{
    /**
     * Redimensionne (si l'image dépasse $maxDimension sur son plus grand côté) et enregistre une image
     * téléversée. Le contenu photographique est converti en JPEG pour une compression optimale ; les PNG qui
     * utilisent réellement la transparence restent des PNG pour que rien ne se dégrade visuellement. Se rabat
     * sur l'enregistrement du fichier sans traitement si GD ne peut pas le lire ou si la compression n'a rien
     * économisé.
     */
    public static function store(
        UploadedFile $file,
        string $directory,
        int $maxDimension = 1400,
        int $quality = 82,
    ): string {
        $sourcePath = $file->getRealPath();
        $imageInfo = $sourcePath ? @getimagesize($sourcePath) : false;

        if (! $imageInfo) {
            return $file->store($directory, 'public');
        }

        [$width, $height, $type] = $imageInfo;

        $source = match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($sourcePath),
            IMAGETYPE_PNG => @imagecreatefrompng($sourcePath),
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourcePath) : null,
            default => null,
        };

        if (! $source) {
            return $file->store($directory, 'public');
        }

        $hasAlpha = $type === IMAGETYPE_PNG && self::hasTransparency($source, $width, $height);

        $scale = min(1, $maxDimension / max($width, $height));
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        $resized = imagecreatetruecolor($newWidth, $newHeight);

        if ($hasAlpha) {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
            imagefill($resized, 0, 0, $transparent);
        } else {
            $white = imagecolorallocate($resized, 255, 255, 255);
            imagefill($resized, 0, 0, $white);
        }

        imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($source);

        $extension = $hasAlpha ? 'png' : 'jpg';
        $filename = trim($directory, '/').'/'.Str::random(40).'.'.$extension;
        $absolutePath = Storage::disk('public')->path($filename);

        if (! is_dir(dirname($absolutePath))) {
            mkdir(dirname($absolutePath), 0755, true);
        }

        $ok = $hasAlpha
            ? imagepng($resized, $absolutePath, 6)
            : imagejpeg($resized, $absolutePath, $quality);

        imagedestroy($resized);

        if (! $ok || ! is_file($absolutePath) || filesize($absolutePath) >= $file->getSize()) {
            if (is_file($absolutePath)) {
                @unlink($absolutePath);
            }

            return $file->store($directory, 'public');
        }

        return $filename;
    }

    /** Échantillonne une grille de pixels à la recherche d'un canal alpha non totalement opaque — assez léger pour s'exécuter à chaque téléversement. */
    private static function hasTransparency($image, int $width, int $height): bool
    {
        $stepX = max(1, (int) floor($width / 32));
        $stepY = max(1, (int) floor($height / 32));

        for ($y = 0; $y < $height; $y += $stepY) {
            for ($x = 0; $x < $width; $x += $stepX) {
                $rgba = imagecolorat($image, $x, $y);
                $alpha = ($rgba >> 24) & 0x7F;
                if ($alpha > 0) {
                    return true;
                }
            }
        }

        return false;
    }
}
