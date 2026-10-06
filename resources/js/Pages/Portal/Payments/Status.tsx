import GuestLayout from '@/Layouts/GuestLayout';
import { fcfa } from '@/lib/money';
import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, Clock, FileText, Search, XCircle } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface Attempt {
    reference: string;
    status: 'initiated' | 'pending' | 'succeeded' | 'failed' | 'expired' | 'anomaly';
    status_label: string;
    amount: number;
    channel_label: string;
    student_name: string;
    created_at: string;
    invoices: { label: string; amount: number }[];
    /** Réservée au personnel : le détail d'une anomalie. */
    note: string | null;
    resume_url: string | null;
    receipt_number: string | null;
    receipt_url: string | null;
    back_url: string;
    status_url: string;
}

/** Tant que le fournisseur n'a pas confirmé, la page se met à jour toute seule (toutes les 4 s, pendant 3 minutes au plus). */
function useFollow(open: boolean) {
    useEffect(() => {
        if (!open) return;

        let count = 0;
        const timer = window.setInterval(() => {
            count += 1;

            if (count > 45) return window.clearInterval(timer);

            router.reload({ only: ['attempt'] });
        }, 4000);

        return () => window.clearInterval(timer);
    }, [open]);
}

const button = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition';

/** Où en est un paiement en ligne : en attente de confirmation, payé (avec le reçu), échoué, expiré ou à vérifier. */
export default function Status({ attempt }: { attempt: Attempt }) {
    const open = attempt.status === 'pending' || attempt.status === 'initiated';

    useFollow(open);

    const states: Record<Attempt['status'], { icon: ReactNode; tone: string; title: string; text: string }> = {
        succeeded: {
            icon: <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden="true" />,
            tone: 'text-emerald-800',
            title: 'Paiement confirmé',
            text: 'Merci : votre paiement est enregistré. Un reçu vous est envoyé par e-mail et dans l’application.',
        },
        pending: {
            icon: <Clock className="h-12 w-12 text-amber-600" aria-hidden="true" />,
            tone: 'text-amber-800',
            title: 'En attente de confirmation',
            text: 'Nous attendons la confirmation du fournisseur de paiement. Cette page se met à jour toute seule ; vous pouvez aussi la quitter, vous serez prévenu(e).',
        },
        initiated: {
            icon: <Clock className="h-12 w-12 text-amber-600" aria-hidden="true" />,
            tone: 'text-amber-800',
            title: 'Paiement démarré',
            text: 'Terminez le paiement chez le fournisseur : cette page se met à jour toute seule dès qu’il est confirmé.',
        },
        failed: {
            icon: <XCircle className="h-12 w-12 text-red-600" aria-hidden="true" />,
            tone: 'text-red-800',
            title: 'Paiement non abouti',
            text: 'Le paiement a échoué ou a été annulé : rien n’a été enregistré. Vous pouvez recommencer depuis vos factures.',
        },
        expired: {
            icon: <XCircle className="h-12 w-12 text-ink-500" aria-hidden="true" />,
            tone: 'text-ink-800',
            title: 'Délai dépassé',
            text: 'Ce paiement n’a pas été confirmé dans le délai. Si vous avez bien payé, il sera enregistré dès que le fournisseur nous le confirmera ; sinon, recommencez depuis vos factures.',
        },
        anomaly: {
            icon: <Search className="h-12 w-12 text-amber-600" aria-hidden="true" />,
            tone: 'text-amber-800',
            title: 'Paiement en cours de vérification',
            text: 'Votre paiement demande une vérification de la comptabilité. Conservez votre référence : le service vous contactera si besoin.',
        },
    };
    const state = states[attempt.status];

    return (
        <GuestLayout>
            <Head title="Paiement en ligne" />

            <div role="status" aria-live="polite" className="text-center">
                <div className="flex justify-center">{state.icon}</div>
                <h1 className={`mt-3 font-serif text-2xl font-bold ${state.tone}`}>{state.title}</h1>
                <p className="mt-2 text-sm text-ink-600">{state.text}</p>
            </div>

            <dl className="mt-6 divide-y divide-ink-100 rounded-xl border border-ink-100 text-sm">
                <div className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-ink-500">Élève</dt>
                    <dd className="text-right font-medium text-ink-900">{attempt.student_name}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-ink-500">Montant</dt>
                    <dd className="font-serif text-lg font-bold text-ink-900">{fcfa(attempt.amount)}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-ink-500">Mode</dt>
                    <dd className="font-medium text-ink-900">{attempt.channel_label}</dd>
                </div>
                {attempt.invoices.map((invoice, index) => (
                    <div key={index} className="flex justify-between gap-4 px-4 py-2.5">
                        <dt className="text-ink-500">{invoice.label}</dt>
                        <dd className="shrink-0 font-medium text-ink-900">{fcfa(invoice.amount)}</dd>
                    </div>
                ))}
                {attempt.receipt_number && (
                    <div className="flex justify-between gap-4 px-4 py-2.5">
                        <dt className="text-ink-500">Reçu n°</dt>
                        <dd className="font-medium text-ink-900">{attempt.receipt_number}</dd>
                    </div>
                )}
                <div className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-ink-500">Référence</dt>
                    <dd className="font-medium text-ink-900">{attempt.reference}</dd>
                </div>
            </dl>

            {attempt.note && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{attempt.note}</p>}

            <div className="mt-6 space-y-2">
                {attempt.receipt_url && (
                    <a href={attempt.receipt_url} target="_blank" rel="noopener noreferrer" className={`${button} bg-ink-900 text-white hover:bg-ink-800`}>
                        <FileText className="h-4 w-4" aria-hidden="true" /> Télécharger le reçu
                    </a>
                )}
                {attempt.resume_url && (
                    <a href={attempt.resume_url} className={`${button} bg-ink-900 text-white hover:bg-ink-800`}>
                        Reprendre le paiement
                    </a>
                )}
                <Link href={attempt.back_url} className={`${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                    Retour
                </Link>
            </div>
        </GuestLayout>
    );
}
