import { AlertTriangle, CheckCircle2, OctagonAlert } from 'lucide-react';

const LEVELS = {
    green: { label: 'Favorable', icon: CheckCircle2, classes: 'bg-emerald-100 text-emerald-900 ring-emerald-600/20' },
    orange: { label: 'Vigilance', icon: AlertTriangle, classes: 'bg-amber-100 text-amber-900 ring-amber-600/20' },
    red: { label: 'Attention', icon: OctagonAlert, classes: 'bg-red-100 text-red-900 ring-red-600/20' },
} as const;

/**
 * Pastille d'alerte d'un élève (RG-06) : icône et mot écrits, la couleur n'est qu'un renfort. Les motifs, quand on a le
 * droit de les voir, s'affichent en infobulle et pour les lecteurs d'écran.
 */
export default function AlertBadge({ level, reasons = [], compact = false }: { level: string | null; reasons?: string[]; compact?: boolean }) {
    if (!level || !(level in LEVELS)) {
        return <span className="text-xs text-ink-500">—</span>;
    }

    const { label, icon: Icon, classes } = LEVELS[level as keyof typeof LEVELS];
    const detail = reasons.length > 0 ? `${label} : ${reasons.join(' ; ')}` : label;

    return (
        <span title={detail} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {compact ? <span className="sr-only">{detail}</span> : label}
            {!compact && reasons.length > 0 && <span className="sr-only"> : {reasons.join(' ; ')}</span>}
        </span>
    );
}
