import GuestLayout from '@/Layouts/GuestLayout';
import { fcfa } from '@/lib/money';
import { Head, Link, router } from '@inertiajs/react';
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';

interface Attempt {
    reference: string;
    status: string;
    amount: number;
    channel_label: string;
    student_name: string;
    invoices: { label: string; amount: number }[];
    open: boolean;
}

interface Props {
    attempt: Attempt;
    complete_url: string;
    status_url: string;
}

const button = 'inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50';

/**
 * Page du faux fournisseur de paiement : on y choisit le résultat du paiement, qui part vers l'application comme une vraie
 * notification signée. Aucun argent réel ne circule.
 */
export default function Simulation({ attempt, complete_url, status_url }: Props) {
    const [processing, setProcessing] = useState(false);

    const complete = (outcome: 'success' | 'failure') => {
        setProcessing(true);
        router.post(complete_url, { outcome }, { onFinish: () => setProcessing(false) });
    };

    return (
        <GuestLayout>
            <Head title="Simulation de paiement" />

            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm">
                    <strong>Mode simulation.</strong> Aucun argent réel ne circule : cette page remplace celle d’un fournisseur de paiement pour essayer le parcours.
                </p>
            </div>

            <h1 className="mt-6 font-serif text-2xl font-bold text-ink-900">Payer {fcfa(attempt.amount)}</h1>
            <p className="mt-1 text-sm text-ink-500">
                {attempt.channel_label} · pour {attempt.student_name}
            </p>

            <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100 text-sm">
                {attempt.invoices.map((invoice, index) => (
                    <li key={index} className="flex justify-between gap-4 px-4 py-2.5">
                        <span className="text-ink-700">{invoice.label}</span>
                        <span className="shrink-0 font-medium text-ink-900">{fcfa(invoice.amount)}</span>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-ink-500">Référence {attempt.reference}</p>

            {attempt.open ? (
                <div className="mt-6 space-y-2">
                    <button type="button" disabled={processing} onClick={() => complete('success')} className={`${button} bg-emerald-700 text-white hover:bg-emerald-800`}>
                        Simuler un paiement réussi
                    </button>
                    <button type="button" disabled={processing} onClick={() => complete('failure')} className={`${button} border border-red-200 bg-white text-red-700 hover:bg-red-50`}>
                        Simuler un échec
                    </button>
                    <Link href={status_url} className={`${button} text-ink-600 hover:bg-ink-50`}>
                        Annuler et revenir
                    </Link>
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    <p role="status" className="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                        Cette tentative est terminée : elle ne peut plus être simulée.
                    </p>
                    <Link href={status_url} className={`${button} bg-ink-900 text-white hover:bg-ink-800`}>
                        Voir le résultat
                    </Link>
                </div>
            )}
        </GuestLayout>
    );
}
