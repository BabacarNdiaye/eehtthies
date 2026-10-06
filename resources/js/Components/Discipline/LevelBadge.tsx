/** Niveaux du registre des sanctions (App\Models\DisciplineRecord::LEVELS), du plus léger au plus lourd. */
const TONES: Record<string, string> = {
    avertissement: 'bg-amber-100 text-amber-900 ring-amber-600/20',
    blame: 'bg-orange-100 text-orange-900 ring-orange-600/20',
    exclusion_cours: 'bg-red-100 text-red-800 ring-red-600/20',
    exclusion: 'bg-red-200 text-red-900 ring-red-700/30',
};

/** Pastille d'un niveau de sanction : le libellé est toujours écrit, la couleur n'est qu'un renfort. */
export default function LevelBadge({ level, label, days }: { level: string; label: string; days?: number | null }) {
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TONES[level] ?? 'bg-ink-100 text-ink-700 ring-ink-500/20'}`}>
            {label}
            {level === 'exclusion' && days ? ` · ${days} j` : ''}
        </span>
    );
}
