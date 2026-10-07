<?php

namespace App\Support;

/**
 * Taille maximale réellement acceptée pour un fichier téléversé : la plus petite des limites de l'application et de PHP
 * (upload_max_filesize, et post_max_size moins une marge pour le reste du formulaire). Sur un hébergement mutualisé, PHP
 * est souvent limité à 2 Mo : l'écran l'annonce alors clairement au lieu d'échouer sans message.
 */
class UploadLimit
{
    public const APP_MAX_KB = 51200; // 50 Mo

    /** Marge réservée aux autres champs du formulaire et à la miniature (Ko). */
    private const FORM_MARGIN_KB = 2560;

    public static function kilobytes(int $appMaxKb = self::APP_MAX_KB): int
    {
        $limits = [$appMaxKb];

        $upload = self::iniToKb(ini_get('upload_max_filesize'));
        if ($upload > 0) {
            $limits[] = $upload;
        }

        $post = self::iniToKb(ini_get('post_max_size'));
        if ($post > 0) {
            $limits[] = max(256, $post - self::FORM_MARGIN_KB);
        }

        return max(256, min($limits));
    }

    /** Taille en Mo, arrondie vers le bas à 0,5 Mo, pour l'affichage. */
    public static function megabytes(int $appMaxKb = self::APP_MAX_KB): float
    {
        return floor(self::kilobytes($appMaxKb) / 512) / 2;
    }

    /** « 10M », « 512K », « 2G », « 8388608 » → Ko ; 0 pour « illimité » (0 ou -1). */
    public static function iniToKb(string|false|null $value): int
    {
        $value = trim((string) $value);

        if ($value === '' || $value === '0' || $value === '-1') {
            return 0;
        }

        $number = (float) $value;

        return (int) match (strtolower(substr($value, -1))) {
            'g' => $number * 1024 * 1024,
            'm' => $number * 1024,
            'k' => $number,
            default => $number / 1024,
        };
    }
}
