import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

// Lit les propriétés CSS personnalisées « --{name}-{stop} » (définies à l'exécution depuis Admin > Paramètres
// > Couleurs via App\Support\ThemePalette) pour que ces palettes restent entièrement configurables sans
// recompilation — tout en conservant le fonctionnement des modificateurs d'opacité de Tailwind (p. ex.
// bg-gold-500/50).
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
        // Les classes écrites dans des fichiers .ts (p. ex. les dégradés de matières de lib/portal.ts) doivent
        // elles aussi être générées.
        './resources/js/**/*.ts',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
                serif: ['"Playfair Display"', ...defaultTheme.fontFamily.serif],
            },
            colors: {
                // Les quatre palettes sont configurables depuis Admin > Paramètres > Couleurs (voir
                // App\Support\ThemePalette) — ce fichier ne fait que brancher les variables CSS ; les
                // couleurs hexadécimales de secours s'y trouvent.
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
