const palette: Record<string, string> = {
    // candidature statuses
    brouillon: 'bg-ink-100 text-ink-600 ring-ink-500/20',
    soumise: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    en_cours_etude: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    dossier_incomplet: 'bg-orange-100 text-orange-700 ring-orange-600/20',
    preselectionnee: 'bg-purple-100 text-purple-700 ring-purple-600/20',
    acceptee: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    refusee: 'bg-red-100 text-red-700 ring-red-600/20',
    inscription_finalisee: 'bg-gold-100 text-gold-800 ring-gold-600/20',
    // student / teacher statuses
    actif: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    inactif: 'bg-ink-100 text-ink-600 ring-ink-500/20',
    suspendu: 'bg-red-100 text-red-700 ring-red-600/20',
    abandon: 'bg-red-100 text-red-700 ring-red-600/20',
    diplome: 'bg-gold-100 text-gold-800 ring-gold-600/20',
    transfere: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    // internship statuses
    en_cours: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    termine: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    abandonne: 'bg-red-100 text-red-700 ring-red-600/20',
};

export default function StatusBadge({
    status,
    label,
}: {
    status: string;
    label?: string;
}) {
    const classes = palette[status] ?? 'bg-ink-100 text-ink-600 ring-ink-500/20';

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}
        >
            {label ?? status}
        </span>
    );
}
