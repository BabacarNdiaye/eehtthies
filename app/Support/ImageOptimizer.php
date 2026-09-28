<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Resizes and re-encodes uploaded images before they hit disk, so pages
 * built from admin-uploaded photos don't ship multi-megabyte originals to
 * every visitor. GD-only (Imagick isn't available on production — see the
 * QR code fix in the deploy history) and dependency-free, since adding a
 * new Composer package would mean syncing a new vendor/ subtree over FTP
 * with no SSH access to regenerate the autoloader on this host.
 */
class ImageOptimizer
{
    /**
     * Resizes (if larger than $maxDimension on its longest side) and stores
     * an uploaded image. Photographic content is converted to JPEG for the
     * best compression; PNGs that actually use transparency are kept as
     * PNG so nothing visually breaks. Falls back to storing the upload
     * unprocessed if GD can't read it or compression didn't save space.
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

    /** Samples a grid of pixels for any non-fully-opaque alpha — cheap enough to run on every upload. */
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
