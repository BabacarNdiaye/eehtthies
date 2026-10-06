import { Gavel } from 'lucide-react';

export interface FamilyCouncil {
    id: number;
    class: string | null;
    term: string;
    year: string | null;
    closed_at: string | null;
    general_appreciation: string | null;
    decisions: { label: string; provisional: boolean }[];
    subjects: { subject: string | null; appreciation: string }[];
}

/**
 * Résultats des conseils de classe pour l'élève et sa famille (DIR-06) : après la clôture seulement, l'appréciation
 * générale, les décisions publiables et les appréciations des enseignants. Une décision faisant l'objet d'un recours
 * est signalée « provisoire ».
 */
export default function CouncilResults({ councils }: { councils: FamilyCouncil[] }) {
    if (councils.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-4 py-8 text-center ring-1 ring-ink-100">
                <Gavel className="h-7 w-7 text-ink-300" aria-hidden="true" />
                <p className="text-sm text-ink-500">Les résultats du conseil de classe paraîtront ici après sa clôture.</p>
            </div>
        );
    }

    return (
        <ul className="space-y-3">
            {councils.map((council) => (
                <li key={council.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                    <p className="text-sm font-semibold text-ink-900">
                        {council.term} · {council.class}
                    </p>
                    <p className="text-xs text-ink-500">
                        {council.year}
                        {council.closed_at && ` · conseil clôturé le ${new Date(`${council.closed_at}T00:00:00`).toLocaleDateString('fr-FR')}`}
                    </p>

                    {council.decisions.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Décisions du conseil">
                            {council.decisions.map((decision) => (
                                <li key={decision.label} className="rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-900">
                                    {decision.label}
                                    {decision.provisional && ' — provisoire (recours en cours)'}
                                </li>
                            ))}
                        </ul>
                    )}

                    {council.general_appreciation && (
                        <blockquote className="mt-3 border-l-4 border-gold-400 pl-3 text-sm text-ink-800">{council.general_appreciation}</blockquote>
                    )}

                    {council.subjects.length > 0 && (
                        <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-ink-700">Appréciations des enseignants ({council.subjects.length})</summary>
                            <dl className="mt-2 space-y-2 text-sm">
                                {council.subjects.map((item, index) => (
                                    <div key={index}>
                                        <dt className="font-medium text-ink-900">{item.subject}</dt>
                                        <dd className="text-ink-700">{item.appreciation}</dd>
                                    </div>
                                ))}
                            </dl>
                        </details>
                    )}
                </li>
            ))}
        </ul>
    );
}
