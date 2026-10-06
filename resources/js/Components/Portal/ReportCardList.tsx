import { ReportCard } from '@/types';
import { Award, Download } from 'lucide-react';

const decisionStyles: Record<string, string> = {
    admis: 'bg-emerald-100 text-emerald-700',
    redouble: 'bg-red-100 text-red-700',
    rattrapage: 'bg-purple-100 text-purple-700',
    non_defini: 'bg-ink-100 text-ink-500',
};

const decisionLabels: Record<string, string> = {
    admis: 'Admis(e) en classe supérieure',
    redouble: 'Autorisé(e) à redoubler',
    exclu: 'Exclusion',
    rattrapage: 'Rattrapage',
    non_defini: 'Non défini',
};

/** Bulletins publiés : période, moyenne, rang, décision du conseil et téléchargement du PDF. */
export default function ReportCardList({ reportCards, pdfHref }: { reportCards: ReportCard[]; pdfHref: (reportCard: ReportCard) => string }) {
    if (reportCards.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-4 py-10 text-center ring-1 ring-ink-100">
                <Award className="h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-400">Aucun bulletin publié pour le moment.</p>
            </div>
        );
    }

    return (
        <ul className="space-y-2.5">
            {reportCards.map((rc) => (
                <li key={rc.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-800">
                            <Award className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-900">{rc.term}</p>
                            <p className="text-xs text-ink-500">
                                Moyenne {rc.average != null ? Number(rc.average).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'} / 20
                                {rc.rank ? ` · Rang ${rc.rank}/${rc.class_size}` : ''}
                            </p>
                        </div>
                        <a
                            href={pdfHref(rc)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Télécharger le bulletin ${rc.term} en PDF`}
                            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-ink-900 px-3.5 text-xs font-semibold text-white transition-colors active:bg-ink-800"
                        >
                            <Download className="h-4 w-4" /> PDF
                        </a>
                    </div>
                    <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${decisionStyles[rc.decision] ?? decisionStyles.non_defini}`}>
                        {decisionLabels[rc.decision] ?? decisionLabels.non_defini}
                    </span>
                </li>
            ))}
        </ul>
    );
}
