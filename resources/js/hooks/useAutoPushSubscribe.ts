import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))) as BufferSource;
}

/**
 * Silently enables browser push notifications for the signed-in user, no
 * button required — asks for permission once (the browser's own native
 * prompt) the first time a portal/admin page loads, and does nothing on
 * subsequent visits once the user has answered (granted or denied).
 */
export default function useAutoPushSubscribe() {
    const vapidPublicKey = usePage<PageProps>().props.vapidPublicKey as string | undefined;

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !vapidPublicKey) return;
        if (typeof Notification === 'undefined' || Notification.permission === 'denied') return;

        navigator.serviceWorker.ready.then(async (reg) => {
            // A subscription already existing at the browser level does NOT
            // mean it's registered for the CURRENTLY signed-in user — on a
            // shared device, a previous account may hold it. Always re-sync
            // to the backend; updatePushSubscription() there transfers
            // ownership to whoever is logged in now, which is exactly what
            // we want and is cheap/idempotent either way.
            const existing = await reg.pushManager.getSubscription();
            if (existing) {
                await window.axios.post(route('push-subscriptions.store'), existing.toJSON());
                return;
            }

            const permission =
                Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
            if (permission !== 'granted') return;

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            await window.axios.post(route('push-subscriptions.store'), sub.toJSON());
        });
    }, [vapidPublicKey]);
}
