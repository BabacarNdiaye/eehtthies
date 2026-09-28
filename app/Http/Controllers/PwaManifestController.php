<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class PwaManifestController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $name = Setting::get('site_name') ?: 'EEHT de Thiès';
        $shortName = Setting::get('site_short_name') ?: 'EEHT';
        $themeColor = Setting::get('theme_neutral_color') ?: '#50022b';

        return response()->json([
            'name' => $name,
            'short_name' => $shortName,
            'description' => "Plateforme de l'Elite École Hôtelière et Touristique de Thiès : formations, actualités, espace élève, enseignant et parent.",
            'start_url' => '/?source=pwa',
            'id' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait-primary',
            'background_color' => '#ffffff',
            'theme_color' => $themeColor,
            'lang' => 'fr',
            'icons' => [
                ['src' => '/icons/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => '/icons/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => '/icons/icon-maskable-192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'maskable'],
                ['src' => '/icons/icon-maskable-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
            ],
        ], 200, ['Content-Type' => 'application/manifest+json']);
    }
}
