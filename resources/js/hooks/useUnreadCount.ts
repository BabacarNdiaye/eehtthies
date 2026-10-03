import { useEffect, useState } from 'react';

/**
 * Nombre de messages et d'annonces non lus d'EEHT Connect, interrogé toutes les 20 secondes (et dès que
 * l'onglet redevient visible). Les erreurs réseau passagères sont ignorées : le prochain passage réessaie.
 * `enabled` permet de ne pas interroger quand un autre composant (la cloche de l'en-tête d'ordinateur) le fait déjà.
 */
export default function useUnreadCount(enabled = true): number {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const fetchCount = async () => {
            if (document.visibilityState === 'hidden') return;

            try {
                const res = await window.axios.get(route('connect.unread-count'));
                if (!cancelled) setCount(res.data.count as number);
            } catch {
                // Réessai au prochain passage.
            }
        };

        fetchCount();
        const id = setInterval(fetchCount, 20000);
        document.addEventListener('visibilitychange', fetchCount);

        return () => {
            cancelled = true;
            clearInterval(id);
            document.removeEventListener('visibilitychange', fetchCount);
        };
    }, [enabled]);

    return count;
}
