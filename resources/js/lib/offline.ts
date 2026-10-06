import { PortalEntry } from '@/lib/portal';

/**
 * Données gardées dans le navigateur pour que l'application reste utile sans réseau : l'emploi du temps de la
 * semaine et la carte d'étudiant. Une seule « photographie » (la dernière), lue aussi par public/offline.js
 * quand le réseau est coupé. Elle est effacée à la déconnexion (voir app.tsx) : l'appareil peut être partagé.
 */
export const OFFLINE_PREFIX = 'eeht:';
export const SNAPSHOT_KEY = `${OFFLINE_PREFIX}snapshot`;

export interface CardData {
    name: string;
    matricule: string;
    formation: string | null;
    class_name: string | null;
    academic_year: string | null;
    photo: string | null;
    /** Code QR de pointage, en SVG encodé en base64. */
    qr: string;
}

export interface SnapshotEntry {
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject: string;
    place: string | null;
    who: string | null;
}

export interface OfflineSnapshot {
    userId: number;
    role: 'student' | 'teacher' | 'parent';
    name: string;
    subtitle: string | null;
    savedAt: string;
    week: SnapshotEntry[];
    card: CardData | null;
}

/** Cours de l'emploi du temps → lignes de la photographie (l'enseignant voit la classe, l'élève l'enseignant). */
export function toSnapshotEntries(entries: PortalEntry[], showClass: boolean): SnapshotEntry[] {
    return entries.map((entry) => ({
        day_of_week: entry.day_of_week,
        start_time: entry.start_time,
        end_time: entry.end_time,
        subject: entry.subject?.name ?? 'Cours',
        place: entry.room?.name ?? null,
        who: showClass ? (entry.school_class?.name ?? null) : entry.teacher ? `${entry.teacher.first_name} ${entry.teacher.last_name}` : null,
    }));
}

export function readSnapshot(userId?: number): OfflineSnapshot | null {
    try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        const snapshot = raw ? (JSON.parse(raw) as OfflineSnapshot) : null;

        return snapshot && (userId === undefined || snapshot.userId === userId) ? snapshot : null;
    } catch {
        return null;
    }
}

/** Enregistre la photographie ; la carte déjà gardée pour le même utilisateur est conservée si on n'en fournit pas. */
export function saveSnapshot(snapshot: Omit<OfflineSnapshot, 'savedAt' | 'card'> & { card?: CardData | null }): void {
    try {
        const previous = readSnapshot(snapshot.userId);

        localStorage.setItem(
            SNAPSHOT_KEY,
            JSON.stringify({ ...snapshot, card: snapshot.card ?? previous?.card ?? null, savedAt: new Date().toISOString() }),
        );
    } catch {
        // Stockage plein ou bloqué (navigation privée) : l'application fonctionne simplement sans mode hors ligne.
    }
}

/** Met à jour la seule carte de la photographie de cet utilisateur (sans toucher à l'emploi du temps). */
export function saveCard(userId: number, card: CardData): void {
    try {
        const previous = readSnapshot(userId);

        if (previous) {
            localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ ...previous, card }));
        }
    } catch {
        // Voir saveSnapshot.
    }
}

/** Efface tout ce que l'application a gardé dans le navigateur (déconnexion, changement de compte). */
export function clearOfflineData(): void {
    try {
        Object.keys(localStorage)
            .filter((key) => key.startsWith(OFFLINE_PREFIX))
            .forEach((key) => localStorage.removeItem(key));
    } catch {
        // Rien à effacer si le stockage est inaccessible.
    }
}
