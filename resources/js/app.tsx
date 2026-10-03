import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import ConnectLauncher from './Components/ConnectLauncher';
import PwaInstallBanner from './Components/PwaInstallBanner';
import { clearOfflineData } from './lib/offline';

const appName = import.meta.env.VITE_APP_NAME || 'EEHT de Thiès';

const loggedOut = (page: { props: unknown }) => !(page.props as { auth?: { user?: unknown } }).auth?.user;

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        // L'appareil peut être partagé : tout ce qui est gardé pour le mode hors ligne (emploi du temps, carte
        // d'étudiant) est effacé dès qu'aucun utilisateur n'est connecté — au chargement et à chaque déconnexion.
        if (loggedOut(props.initialPage)) clearOfflineData();
        router.on('navigate', (event) => {
            if (loggedOut(event.detail.page)) clearOfflineData();
        });

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
