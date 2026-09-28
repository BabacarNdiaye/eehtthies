// EEHT de Thiès — service worker for installable PWA support.
// Deliberately minimal: network-first for navigations (so content is always
// fresh when online), with a small offline fallback page when there is no
// connection at all. We do NOT precache hashed Vite build assets here since
// their filenames change on every deploy and a stale precache list would
// break the app after an update.

const CACHE_NAME = 'eeht-shell-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL])),
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
    if (event.request.mode !== 'navigate') {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
});

// Push notifications — the payload is built server-side by the WebPush
// notification channel (title/body/icon/data.url).
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const payload = event.data.json();
    const url = payload.data?.url || '/';

    event.waitUntil(
        self.registration.showNotification(payload.title || 'EEHT de Thiès', {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192.png',
            badge: payload.icon || '/icons/icon-192.png',
            data: { url },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(url);
            }
        }),
    );
});
