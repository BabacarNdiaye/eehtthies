<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Chaque route que l'interface appelle avec route('nom') doit exister côté Laravel. Un nom faux ne casse rien à la
 * compilation : l'erreur n'apparaît qu'au clic d'un visiteur (c'était le cas du formulaire de contact).
 */
class FrontendRouteNamesTest extends TestCase
{
    public function test_every_route_name_used_by_the_frontend_exists(): void
    {
        $missing = [];
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(resource_path('js'), \FilesystemIterator::SKIP_DOTS));

        foreach ($iterator as $file) {
            if (! in_array($file->getExtension(), ['ts', 'tsx'], true)) {
                continue;
            }

            preg_match_all("/\broute\(\s*'([a-zA-Z0-9_.\-]+)'/", (string) file_get_contents($file->getPathname()), $found);

            foreach ($found[1] as $name) {
                if (! Route::has($name)) {
                    $missing[$name] = str_replace(resource_path('js').DIRECTORY_SEPARATOR, '', $file->getPathname());
                }
            }
        }

        $this->assertSame([], $missing, "Routes appelées par l'interface mais absentes de Laravel :\n".json_encode($missing, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }
}
