import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

// Reads "--{name}-{stop}" CSS custom properties (set at runtime from Admin >
// Paramètres > Couleurs via App\Support\ThemePalette) so these palettes stay
// fully configurable without a rebuild — while keeping Tailwind's opacity
// modifiers (e.g. bg-gold-500/50) working.
function themeVar(name, stop) {
    const variable = `--${name}-${stop}`;
    return ({ opacityValue }) =>
        opacityValue === undefined ? `rgb(var(${variable}))` : `rgb(var(${variable}) / ${opacityValue})`;
}

function themeScale(name, stops) {
    return Object.fromEntries(stops.map((stop) => [stop, themeVar(name, stop)]));
}

const configurableStops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
                serif: ['"Playfair Display"', ...defaultTheme.fontFamily.serif],
            },
            colors: {
                // All four palettes are configurable from Admin > Paramètres >
                // Couleurs (see App\Support\ThemePalette) — this file only
                // wires up the CSS variables; the fallback hexes live there.
                ink: themeScale('ink', [...configurableStops, 950]),
                gold: themeScale('gold', configurableStops),
                brand: themeScale('brand', configurableStops),
                leaf: themeScale('leaf', configurableStops),
            },
            boxShadow: {
                soft: '0 10px 40px -12px rgba(11, 23, 40, 0.25)',
                elevated: '0 20px 50px -15px rgba(11, 23, 40, 0.3)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(6px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                collapseIn: {
                    '0%': { opacity: '0', transform: 'translateY(-4px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'fade-in-up': 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                'collapse-in': 'collapseIn 0.2s ease-out',
            },
            transitionTimingFunction: {
                fluid: 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
        },
    },

    plugins: [forms],
};
