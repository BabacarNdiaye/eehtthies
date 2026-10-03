import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import ConnectLauncher from './Components/ConnectLauncher';
import PwaInstallBanner from './Components/PwaInstallBanner';

const appName = import.meta.env.VITE_APP_NAME || 'EEHT de Thiès';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <ConnectLauncher initialPage={props.initialPage as never} />
                <PwaInstallBanner />
            </>,
        );
    },
    progress: {
        color: '#c8942a',
        showSpinner: false,
    },
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // La prise en charge de l'installation et du mode hors ligne est une amélioration progressive ;
            // on ignore les échecs.
        });
    });
}
