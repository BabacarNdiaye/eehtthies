<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Generates full Tailwind-style tint/shade scales from the single base hex
 * colors configured in Site Settings, and exposes them as CSS custom
 * properties consumed by tailwind.config.js (ink/gold/brand/leaf).
 */
class ThemePalette
{
    public const DEFAULTS = [
        'ink' => '#0b1728',
        'gold' => '#c8942a',
        'brand' => '#9c1272',
        'leaf' => '#8bc93f',
    ];

    /** Settings key => palette name. */
    protected const KEYS = [
        'theme_neutral_color' => 'ink',
        'theme_primary_color' => 'gold',
        'theme_secondary_color' => 'brand',
        'theme_accent_color' => 'leaf',
    ];

    /**
     * Shade stop => how far to mix toward white (positive) or black
     * (negative), relative to the "anchor" stop where the chosen color
     * lands untouched (amount 0).
     *
     * gold/brand/leaf are brand accents: the chosen color is the vivid
     * "500" stop, with tints above and shades below.
     *
     * ink is the structural dark neutral used for backgrounds/text
     * everywhere: the chosen color is the dominant "900" stop (matching
     * how the previous static palette was actually used across the site),
     * with an extra near-black "950" for overlays.
     */
    protected const STOPS = [
        'default' => [
            50 => 0.95,
            100 => 0.90,
            200 => 0.75,
            300 => 0.60,
            400 => 0.30,
            500 => 0,
            600 => -0.15,
            700 => -0.30,
            800 => -0.45,
            900 => -0.60,
        ],
        'ink' => [
            50 => 0.955,
            100 => 0.90,
            200 => 0.76,
            300 => 0.59,
            400 => 0.40,
            500 => 0.27,
            600 => 0.18,
            700 => 0.10,
            800 => 0.04,
            900 => 0,
            950 => -0.35,
        ],
    ];

    public static function cssVariables(): string
    {
        $css = ':root{';

        foreach (self::KEYS as $settingKey => $paletteName) {
            $hex = Setting::get($settingKey, self::DEFAULTS[$paletteName]);
            $stops = self::STOPS[$paletteName] ?? self::STOPS['default'];

            foreach (self::shades($hex, $stops) as $stop => $rgb) {
                $css .= "--{$paletteName}-{$stop}:{$rgb};";
            }
        }

        return $css.'}';
    }

    /**
     * @param  array<int, float>  $stops
     * @return array<int, string> shade stop => "r g b"
     */
    protected static function shades(string $hex, array $stops): array
    {
        [$r, $g, $b] = self::hexToRgb($hex);
        $shades = [];

        foreach ($stops as $stop => $amount) {
            if ($amount === 0) {
                $shades[$stop] = "{$r} {$g} {$b}";
                continue;
            }

            $target = $amount > 0 ? [255, 255, 255] : [0, 0, 0];
            $ratio = abs($amount);

            $nr = (int) round($r + ($target[0] - $r) * $ratio);
            $ng = (int) round($g + ($target[1] - $g) * $ratio);
            $nb = (int) round($b + ($target[2] - $b) * $ratio);

            $shades[$stop] = "{$nr} {$ng} {$nb}";
        }

        return $shades;
    }

    /** @return array{0:int,1:int,2:int} */
    protected static function hexToRgb(string $hex): array
    {
        $hex = ltrim(trim($hex), '#');

        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }

        if (! preg_match('/^[0-9a-fA-F]{6}$/', $hex)) {
            return [11, 23, 40];
        }

        return [
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2)),
        ];
    }
}
