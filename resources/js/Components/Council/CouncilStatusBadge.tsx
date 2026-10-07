/** Couleur de chaque état d'un conseil (App\Models\Council::STATUSES) ; le libellé est toujours écrit. */
const TONES: Record<string, string> = {
    draft: 'bg-ink-100 text-ink-700 ring-ink-500/20',
    scheduled: 'bg-sky-100 text-sky-900 ring-sky-600/20',
    in_session: 'bg-violet-100 text-violet-900 ring-violet-600/20',
    drafting_minutes: 'bg-amber-100 text-amber-900 ring-amber-600/20',
    pending_validation: 'bg-orange-100 text-orange-900 ring-orange-600/20',
    closed: 'bg-emerald-100 text-emerald-900 ring-emerald-600/20',
};

const DOTS: Record<string, string> = {
    draft: 'bg-ink-400',
    scheduled: 'bg-sky-500',
    in_session: 'bg-violet-500',
    drafting_minutes: 'bg-amber-500',
    pending_validation: 'bg-orange-500',
    closed: 'bg-emerald-500',
};

export default function CouncilStatusBadge({ status, label }: { status: string; label: string }) {
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TONES[status] ?? TONES.draft}`}>
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${DOTS[status] ?? DOTS.draft} ${status === 'in_session' ? 'animate-pulse' : ''}`} aria-hidden="true" />
            {label}
        </span>
    );
}
