import { useCallback, useEffect, useRef, useState } from 'react';

export interface StudentDraft {
    general_appreciation: string;
    review_status: string;
    decisions: { decision_type_id: number; reason: string | null }[];
    revision: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

interface Options {
    councilId: number;
    enabled: boolean;
    /** Réponse du serveur : nouvelle révision (succès) ou version en base (conflit 409). */
    onSaved: (studentId: number, revision: number) => void;
    onConflict: (studentId: number, current: unknown, message: string) => void;
    onRejected: (studentId: number, message: string) => void;
}

const storageKey = (councilId: number) => `eeht:council:${councilId}:queue`;

function readQueue(councilId: number): Record<number, StudentDraft> {
    try {
        return JSON.parse(window.localStorage.getItem(storageKey(councilId)) ?? '{}');
    } catch {
        return {};
    }
}

function writeQueue(councilId: number, queue: Record<number, StudentDraft>): void {
    try {
        if (Object.keys(queue).length === 0) window.localStorage.removeItem(storageKey(councilId));
        else window.localStorage.setItem(storageKey(councilId), JSON.stringify(queue));
    } catch {
        // Stockage indisponible (navigation privée) : la file reste en mémoire.
    }
}

/**
 * Enregistrement de la séance (SEA-09, ENF-06) : chaque fiche modifiée entre dans une file, gardée dans le navigateur ;
 * la file part au changement d'élève, toutes les 30 secondes, sur Ctrl+S et au retour du réseau. Une coupure ne perd
 * rien : la file survit au rechargement de la page et repart à l'ouverture suivante.
 */
export default function useCouncilAutosave({ councilId, enabled, onSaved, onConflict, onRejected }: Options) {
    const queue = useRef<Record<number, StudentDraft>>(enabled ? readQueue(councilId) : {});
    const flushing = useRef(false);
    const [status, setStatus] = useState<SaveStatus>(Object.keys(queue.current).length > 0 ? 'offline' : 'idle');
    const [pending, setPending] = useState(Object.keys(queue.current).length);
    const callbacks = useRef({ onSaved, onConflict, onRejected });
    callbacks.current = { onSaved, onConflict, onRejected };

    const remember = () => {
        writeQueue(councilId, queue.current);
        setPending(Object.keys(queue.current).length);
    };

    const enqueue = useCallback(
        (studentId: number, draft: StudentDraft) => {
            if (!enabled) return;
            queue.current[studentId] = draft;
            remember();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [enabled, councilId],
    );

    const flush = useCallback(async () => {
        if (!enabled || flushing.current || Object.keys(queue.current).length === 0) return;
        flushing.current = true;
        setStatus('saving');
        let offline = false;

        for (const [key, draft] of Object.entries(queue.current)) {
            const studentId = Number(key);
            try {
                const { data } = await window.axios.put(route('council.session.save', [councilId, studentId]), draft);
                delete queue.current[studentId];
                callbacks.current.onSaved(studentId, data.revision);
            } catch (error: unknown) {
                const response = (error as { response?: { status: number; data: { message?: string; current?: unknown } } }).response;
                if (!response) {
                    offline = true;
                    break;
                }
                delete queue.current[studentId];
                if (response.status === 409) {
                    callbacks.current.onConflict(studentId, response.data.current, response.data.message ?? '');
                } else {
                    callbacks.current.onRejected(studentId, response.data.message ?? 'Enregistrement refusé.');
                }
            }
            remember();
        }

        flushing.current = false;
        setStatus(offline ? 'offline' : Object.keys(queue.current).length > 0 ? 'error' : 'saved');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, councilId]);

    useEffect(() => {
        if (!enabled) return;
        void flush();
        const timer = window.setInterval(() => void flush(), 30_000);
        const online = () => void flush();
        window.addEventListener('online', online);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener('online', online);
        };
    }, [enabled, flush]);

    return { enqueue, flush, status, pending, isQueued: (studentId: number) => studentId in queue.current, queued: (studentId: number) => queue.current[studentId] };
}
