// EEHT de Thiès — service worker pour la prise en charge de l'installation en PWA. Volontairement minimal :
// réseau d'abord pour les navigations (le contenu est donc toujours frais en ligne), avec une petite page de
// secours hors ligne quand il n'y a aucune connexion. On ne met PAS en pré-cache les ressources Vite à nom
// haché, car leurs noms changent à chaque déploiement et une liste de pré-cache périmée casserait
// l'application après une mise à jour.

// Changer ce numéro à chaque modification de la page hors ligne : il renouvelle les fichiers gardés en cache.
const CACHE_NAME = 'eeht-shell-v3';
const OFFLINE_URL = '/offline.html';
// Petits fichiers de la page hors ligne, mis en cache à l'installation pour qu'elle s'affiche sans réseau (elle lit
// l'emploi du temps et la carte gardés dans le navigateur par l'application — voir public/offline.js).
const OFFLINE_ASSETS = [OFFLINE_URL, '/offline.js', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        )),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Fichiers de la page hors ligne : cache d'abord (ils changent très rarement), réseau en secours.
    if (
        event.request.method === 'GET' &&
        event.request.mode !== 'navigate' &&
        OFFLINE_ASSETS.includes(new URL(event.request.url).pathname)
    ) {
        event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));

        return;
    }

    if (event.request.mode !== 'navigate') {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
});

// Notifications push — la charge utile est construite côté serveur par le canal de notification WebPush
// (titre, corps, icône, données, plus tag, actions et vibration pour les appels EEHT Connect afin que l'appel
// sonne sur l'écran verrouillé).
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const payload = event.data.json();
    const data = { ...(payload.data || {}), url: payload.data?.url || '/' };

    event.waitUntil(
        self.registration.showNotification(payload.title || 'EEHT de Thiès', {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: payload.tag,
            renotify: !!payload.tag && !!payload.renotify,
            requireInteraction: !!payload.requireInteraction,
            vibrate: payload.vibrate,
            actions: payload.actions,
            silent: false,
            timestamp: Date.now(),
            data,
        }),
    );
});

// Ouvre (ou réutilise) une fenêtre de l'application sur l'URL donnée.
function openApp(url) {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
            if (client.url.endsWith(url) && 'focus' in client) {
                return client.focus();
            }
        }
        const existing = clients.find((c) => 'navigate' in c);
        if (existing) {
            return existing.navigate(url).then((c) => (c || existing).focus());
        }
        if (self.clients.openWindow) {
            return self.clients.openWindow(url);
        }
    });
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};
    const url = data.url || '/';

    // Refuser un appel sans ouvrir l'application (adresse signée).
    if (event.action === 'decline' && data.decline_url) {
        event.waitUntil(fetch(data.decline_url, { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } }).catch(() => undefined));
        return;
    }

    // Répondre : l'application s'ouvre et décroche directement.
    const target = event.action === 'answer' ? url + (url.includes('?') ? '&' : '?') + 'answer=1' : url;

    event.waitUntil(openApp(target));
});
