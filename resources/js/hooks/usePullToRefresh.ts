import { haptic } from '@/lib/portal';
import { useEffect, useState } from 'react';

export const PULL_THRESHOLD = 70;
const PULL_MAX = 110;

/** Vrai quand l'application est installée sur l'écran d'accueil (le navigateur n'offre alors plus « tirer pour actualiser »). */
export function isStandalone(): boolean {
    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
}

/**
 * « Tirer pour actualiser » en haut de page, uniquement dans l'application installée : dans un navigateur
 * normal, le geste natif existe déjà. `pull` est la distance tirée (px, amortie) ; `refreshing` est vrai pendant
 * le rechargement. On ne bloque jamais le défilement : le geste n'est suivi que lorsque la page est tout en haut.
 */
export default function usePullToRefresh(onRefresh: () => Promise<void> | void, enabled = true) {
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!enabled || !isStandalone()) return;

        let startY: number | null = null;
        let distance = 0;

        const onStart = (event: TouchEvent) => {
            startY = window.scrollY <= 0 && event.touches.length === 1 ? event.touches[0].clientY : null;
            distance = 0;
        };

        const onMove = (event: TouchEvent) => {
            if (startY === null) return;

            const delta = event.touches[0].clientY - startY;

            if (delta <= 0 || window.scrollY > 0) {
                distance = 0;
                setPull(0);

                return;
            }

            distance = Math.min(delta * 0.5, PULL_MAX);
            setPull(distance);
        };

        const onEnd = async () => {
            if (startY === null) return;

            const triggered = distance >= PULL_THRESHOLD;

            startY = null;
            distance = 0;
            setPull(0);

            if (triggered) {
                haptic(15);
                setRefreshing(true);

                try {
                    await onRefresh();
                } finally {
                    setRefreshing(false);
                }
            }
        };

        window.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);

        return () => {
            window.removeEventListener('touchstart', onStart);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('touchcancel', onEnd);
        };
    }, [enabled, onRefresh]);

    return { pull, refreshing };
}
