const DAY = 86_400_000;

function startOfDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Heure pour aujourd'hui, « Hier », jour abrégé dans la semaine, sinon date courte. */
export function listTime(iso: string): string {
    const d = new Date(iso);
    const diff = (startOfDay(new Date()) - startOfDay(d)) / DAY;
    if (diff <= 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Hier';
    if (diff < 7) {
        const day = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
        return day.charAt(0).toUpperCase() + day.slice(1);
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function dayLabel(iso: string): string {
    const d = new Date(iso);
    const diff = (startOfDay(new Date()) - startOfDay(d)) / DAY;
    if (diff <= 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function clockTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function shortDate(iso: string): string {
    const diff = (startOfDay(new Date()) - startOfDay(new Date(iso))) / DAY;
    if (diff <= 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeSeen(iso: string | null): string {
    if (!iso) return 'jamais connecté(e)';
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    return `le ${new Date(iso).toLocaleDateString('fr-FR')}`;
}

export function formatSize(bytes: number | null | undefined): string {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

export function extension(name: string): string {
    return (name.split('.').pop() ?? '').toUpperCase();
}

export type FileKind = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'audio' | 'other';

export function fileKind(name: string, mime?: string | null): FileKind {
    const ext = extension(name).toLowerCase();
    if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (mime?.startsWith('audio/') || ['webm', 'weba', 'ogg', 'oga', 'mp3', 'm4a', 'wav'].includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
    return 'other';
}

const CIVILITIES = new Set(['m', 'm.', 'mme', 'mlle', 'dr', 'dr.', 'pr', 'pr.']);

export function initials(name: string): string {
    return (
        name
            .split(' ')
            .filter((part) => !CIVILITIES.has(part.toLowerCase()))
            .map((part) => part[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?'
    );
}

/** Découpe un texte en morceaux texte / lien pour rendre les URL cliquables. */
export function linkify(text: string): { text: string; href?: string }[] {
    const parts: { text: string; href?: string }[] = [];
    const re = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
        if (m.index > last) parts.push({ text: text.slice(last, m.index) });
        const url = m[0];
        parts.push({ text: url, href: url.startsWith('http') ? url : `https://${url}` });
        last = m.index + url.length;
    }
    if (last < text.length) parts.push({ text: text.slice(last) });
    return parts;
}
