import { useEffect, useState } from 'react';

/**
 * Garde l'écran allumé tant que `active` est vrai (API « Wake Lock » : Chrome, Edge, Safari 16.4+). Le verrou est
 * relâché par le navigateur quand la page passe en arrière-plan : on le redemande au retour. Renvoie vrai quand
 * l'écran est effectivement maintenu allumé ; sans prise en charge, ne fait rien.
 */
export default function useWakeLock(active: boolean): boolean {
    const [held, setHeld] = useState(false);

    useEffect(() => {
        if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

        let sentinel: WakeLockSentinel | null = null;
        let cancelled = false;

        const acquire = async () => {
            try {
                const lock = await navigator.wakeLock.request('screen');

                if (cancelled) {
                    await lock.release();

                    return;
                }

                sentinel = lock;
                setHeld(true);
                lock.addEventListener('release', () => setHeld(false));
            } catch {
                setHeld(false); // refusé (économie d'énergie, onglet masqué) : on réessaiera au prochain retour
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') acquire();
        };

        acquire();
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisibility);
            sentinel?.release().catch(() => undefined);
            setHeld(false);
        };
    }, [active]);

    return held;
}
