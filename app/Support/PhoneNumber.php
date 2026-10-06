<?php

namespace App\Support;

/**
 * Numéros de téléphone saisis à la main (« 77 187 79 18 », « +221 77.187.79.18 », « 00221771877918 »…) ramenés à la
 * forme internationale, pour les liens « Appeler » (tel:) et « WhatsApp » (wa.me) des fiches d'élèves. Un texte qui
 * n'est pas un numéro ne donne jamais de lien : mieux vaut pas de bouton qu'un bouton qui appelle au hasard.
 */
final class PhoneNumber
{
    /** Indicatif du Sénégal : celui des numéros saisis sans indicatif (voir config/eeht.php, phone_country_code). */
    public const DEFAULT_COUNTRY_CODE = '221';

    /** « 77 187 79 18 » -> « +221771877918 » ; null si ce n'est pas un numéro (de 8 à 15 chiffres). */
    public static function international(?string $raw, string $countryCode = self::DEFAULT_COUNTRY_CODE): ?string
    {
        $raw = trim((string) $raw);

        // Des chiffres, des espaces et la ponctuation d'usage, rien d'autre : « appeler Awa 77 187 79 18 » n'est pas un numéro.
        if ($raw === '' || ! preg_match('/^\+?[\d\s().\-]+$/', $raw)) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $raw);
        $explicit = str_starts_with($raw, '+') || str_starts_with($digits, '00');

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        // Sans « + » ni « 00 », jusqu'à 10 chiffres c'est un numéro local (on lui met l'indicatif) ; au-delà il le porte déjà.
        if (! $explicit && strlen($digits) <= 10) {
            if (strlen($digits) < 8) {
                return null;
            }

            $digits = $countryCode.$digits;
        }

        return strlen($digits) >= 8 && strlen($digits) <= 15 ? '+'.$digits : null;
    }

    /** « 77 187 79 18 » -> « 221771877918 » : le format de wa.me, chiffres seuls. */
    public static function whatsapp(?string $raw, string $countryCode = self::DEFAULT_COUNTRY_CODE): ?string
    {
        $international = self::international($raw, $countryCode);

        return $international === null ? null : substr($international, 1);
    }

    /**
     * Forme lisible : « +221 77 187 79 18 » pour un numéro sénégalais (2-3-2-2 après l'indicatif), la forme
     * internationale telle quelle pour les autres. Un texte qui n'est pas un numéro est rendu tel quel, un vide en null.
     */
    public static function display(?string $raw, string $countryCode = self::DEFAULT_COUNTRY_CODE): ?string
    {
        $raw = trim((string) $raw);

        if ($raw === '') {
            return null;
        }

        $international = self::international($raw, $countryCode);

        if ($international === null) {
            return $raw;
        }

        $national = str_starts_with($international, '+'.$countryCode) ? substr($international, strlen($countryCode) + 1) : null;

        if ($countryCode === self::DEFAULT_COUNTRY_CODE && $national !== null && strlen($national) === 9) {
            return sprintf('+%s %s %s %s %s', $countryCode, substr($national, 0, 2), substr($national, 2, 3), substr($national, 5, 2), substr($national, 7, 2));
        }

        return $international;
    }
}
