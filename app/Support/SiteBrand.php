<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Logo de l'école : celui téléversé dans Admin ▸ Paramètres s'il existe encore sur le disque, sinon le logo EEHT
 * d'origine livré avec l'application (public/images/logo-eeht.png), qui s'affiche donc toujours.
 */
class SiteBrand
{
    public const DEFAULT_PATH = 'images/logo-eeht.png';

    /** Chemin disque (PDF) : lu directement dans storage/, sans dépendre du lien public/storage. */
    public static function file(): string
    {
        $logo = Setting::get('site_logo');
        if ($logo) {
            $path = storage_path('app/public/'.ltrim($logo, '/'));
            if (is_file($path)) {
                return $path;
            }
        }

        return public_path(self::DEFAULT_PATH);
    }

    /** Adresse publique (courriels, SEO). */
    public static function url(): string
    {
        $logo = Setting::get('site_logo');
        if ($logo && is_file(storage_path('app/public/'.ltrim($logo, '/')))) {
            return url('/storage/'.ltrim($logo, '/'));
        }

        return url('/'.self::DEFAULT_PATH);
    }
}
