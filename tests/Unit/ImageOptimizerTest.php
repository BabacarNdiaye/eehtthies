<?php

namespace Tests\Unit;

use App\Support\ImageOptimizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageOptimizerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function makeJpeg(int $width, int $height, string $path): string
    {
        $image = imagecreatetruecolor($width, $height);
        $color = imagecolorallocate($image, 200, 60, 60);
        imagefilledrectangle($image, 0, 0, $width, $height, $color);
        imagejpeg($image, $path, 95);
        imagedestroy($image);

        return $path;
    }

    /** A noisy pattern, not a flat fill — flat colors compress trivially well as PNG and would never benefit from JPEG re-encoding, unlike the real (photographic) uploads this class exists for. */
    private function makeOpaquePng(int $width, int $height, string $path): string
    {
        $image = imagecreatetruecolor($width, $height);
        for ($y = 0; $y < $height; $y += 4) {
            for ($x = 0; $x < $width; $x += 4) {
                $color = imagecolorallocate($image, random_int(0, 255), random_int(0, 255), random_int(0, 255));
                imagefilledrectangle($image, $x, $y, $x + 3, $y + 3, $color);
            }
        }
        imagepng($image, $path, 0);
        imagedestroy($image);

        return $path;
    }

    private function makeTransparentPng(int $width, int $height, string $path): string
    {
        $image = imagecreatetruecolor($width, $height);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        $transparent = imagecolorallocatealpha($image, 0, 0, 0, 127);
        imagefill($image, 0, 0, $transparent);
        $opaque = imagecolorallocatealpha($image, 20, 120, 20, 0);
        imagefilledellipse($image, (int) ($width / 2), (int) ($height / 2), (int) ($width / 2), (int) ($height / 2), $opaque);
        imagepng($image, $path);
        imagedestroy($image);

        return $path;
    }

    public function test_it_downscales_a_large_opaque_image_and_converts_it_to_jpeg(): void
    {
        $source = $this->makeOpaquePng(2000, 1200, tempnam(sys_get_temp_dir(), 'img').'.png');
        $originalSize = filesize($source);

        $uploaded = new UploadedFile($source, 'big.png', null, null, true);
        $path = ImageOptimizer::store($uploaded, 'test-images', 1000);

        $this->assertStringEndsWith('.jpg', $path);
        Storage::disk('public')->assertExists($path);

        $absolute = Storage::disk('public')->path($path);
        [$width, $height] = getimagesize($absolute);

        $this->assertSame(1000, $width);
        $this->assertSame(600, $height);
        $this->assertLessThan($originalSize, filesize($absolute));

        @unlink($source);
    }

    public function test_it_keeps_a_transparent_png_as_png(): void
    {
        $source = $this->makeTransparentPng(1600, 1600, tempnam(sys_get_temp_dir(), 'img').'.png');

        $uploaded = new UploadedFile($source, 'logo.png', null, null, true);
        $path = ImageOptimizer::store($uploaded, 'test-images', 1000);

        $this->assertStringEndsWith('.png', $path);
        Storage::disk('public')->assertExists($path);

        $absolute = Storage::disk('public')->path($path);
        [$width, $height, $type] = getimagesize($absolute);

        $this->assertSame(IMAGETYPE_PNG, $type);
        $this->assertSame(1000, max($width, $height));

        @unlink($source);
    }

    public function test_it_does_not_upscale_an_image_smaller_than_the_max_dimension(): void
    {
        $source = $this->makeJpeg(400, 300, tempnam(sys_get_temp_dir(), 'img').'.jpg');

        $uploaded = new UploadedFile($source, 'small.jpg', null, null, true);
        $path = ImageOptimizer::store($uploaded, 'test-images', 1400);

        $absolute = Storage::disk('public')->path($path);
        [$width, $height] = getimagesize($absolute);

        $this->assertSame(400, $width);
        $this->assertSame(300, $height);

        @unlink($source);
    }

    public function test_it_falls_back_to_the_original_upload_for_an_unreadable_file(): void
    {
        $source = tempnam(sys_get_temp_dir(), 'notimg').'.png';
        file_put_contents($source, 'this is not a real image file');

        $uploaded = new UploadedFile($source, 'broken.png', null, null, true);
        $path = ImageOptimizer::store($uploaded, 'test-images');

        Storage::disk('public')->assertExists($path);
        $this->assertSame(
            file_get_contents($source),
            file_get_contents(Storage::disk('public')->path($path)),
        );

        @unlink($source);
    }
}
