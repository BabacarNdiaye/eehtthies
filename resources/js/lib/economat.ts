export const ORDER_TONES: Record<string, string> = {
    brouillon: 'bg-ink-100 text-ink-700',
    envoye: 'bg-sky-100 text-sky-700',
    partiel: 'bg-amber-100 text-amber-800',
    recu: 'bg-emerald-100 text-emerald-700',
    annule: 'bg-rose-100 text-rose-700',
};

export const REQUEST_TONES: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-800',
    approuvee: 'bg-sky-100 text-sky-700',
    livree: 'bg-emerald-100 text-emerald-700',
    refusee: 'bg-rose-100 text-rose-700',
};

export const dateFr = (iso: string | null | undefined) =>
    iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const qty = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
