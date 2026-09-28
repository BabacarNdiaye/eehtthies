/**
 * Small formatting helpers shared across the public-facing pages.
 */

export function formatFcfa(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    const numeric = typeof value === 'string' ? parseFloat(value) : value;

    if (Number.isNaN(numeric)) {
        return '—';
    }

    return `${numeric.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;
}

export function formatDateLong(value?: string | null): string {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function formatDateShort(value?: string | null): string {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatTime(value?: string | null): string {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function storageUrl(path?: string | null): string | null {
    if (!path) return null;

    return `/storage/${path}`;
}

export function initials(...parts: (string | null | undefined)[]): string {
    return parts
        .filter(Boolean)
        .map((p) => (p as string).trim().charAt(0).toUpperCase())
        .join('');
}
