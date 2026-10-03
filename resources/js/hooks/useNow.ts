import { useEffect, useState } from 'react';

/** Heure courante (en millisecondes), rafraîchie à intervalle régulier : sert aux comptes à rebours. */
export default function useNow(intervalMs = 30000): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);

        return () => clearInterval(id);
    }, [intervalMs]);

    return now;
}
