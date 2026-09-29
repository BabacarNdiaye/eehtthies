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
// notification channel (title/body/icon/data, plus tag/actions/vibrate for
// EEHT Connect calls so the call rings on the lock screen).
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

// Open (or reuse) an app window on the given URL.
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
