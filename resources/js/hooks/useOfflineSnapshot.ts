import { OfflineSnapshot, saveSnapshot } from '@/lib/offline';
import { useEffect } from 'react';

/** Garde dans le navigateur l'emploi du temps (et la carte) affichés, pour le mode hors ligne. */
export default function useOfflineSnapshot(snapshot: Omit<OfflineSnapshot, 'savedAt' | 'card'> & { card?: OfflineSnapshot['card'] }) {
    const serialized = JSON.stringify(snapshot);

    useEffect(() => {
        saveSnapshot(JSON.parse(serialized));
    }, [serialized]);
}
