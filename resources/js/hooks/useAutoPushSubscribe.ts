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
 * Active silencieusement les notifications push du navigateur pour l'utilisateur connecté, sans bouton —
 * demande la permission une seule fois (l'invite native du navigateur) au premier chargement d'une page de
 * portail ou d'administration, et ne fait rien aux visites suivantes une fois que l'utilisateur a répondu
 * (accord ou refus).
 */
export default function useAutoPushSubscribe() {
    const vapidPublicKey = usePage<PageProps>().props.vapidPublicKey as string | undefined;

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !vapidPublicKey) return;
        if (typeof Notification === 'undefined' || Notification.permission === 'denied') return;

        navigator.serviceWorker.ready.then(async (reg) => {
            // Un abonnement déjà présent au niveau du navigateur NE signifie PAS qu'il est enregistré pour
            // l'utilisateur ACTUELLEMENT connecté — sur un appareil partagé, un compte précédent peut en être
            // titulaire. Toujours resynchroniser avec le backend ; updatePushSubscription() y transfère la
            // propriété à la personne connectée en ce moment, ce qui est exactement ce que l'on veut et reste
            // peu coûteux et idempotent dans les deux cas.
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
