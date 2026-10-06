import { fcfa } from '@/lib/money';
import { Download, Wallet } from 'lucide-react';

export interface PayslipSummary {
    id: number;
    period_label: string;
    reference: string;
    payment_type: 'fixe' | 'horaire';
    base_amount: number;
    hours: number | null;
    hourly_rate: number | null;
    bonuses: { label: string; amount: number }[];
    deductions: { label: string; amount: number }[];
    net_amount: number;
    channel_label: string;
    /** Le numéro de compte n'est jamais envoyé en clair : seulement ses quatre derniers caractères. */
    account_masked: string | null;
    paid_at: string | null;
}

/** « 2026-10-30 » en « 30/10/2026 », sans passer par un fuseau horaire. */
const shortDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

const hoursText = (value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h`;

/** Une carte par bulletin payé, du plus récent au plus ancien : net versé, détail du calcul et téléchargement du PDF. */
export default function PayslipList({ payslips, downloadRoute }: { payslips: PayslipSummary[]; downloadRoute: string }) {
    if (payslips.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-4 py-10 text-center ring-1 ring-ink-100">
                <Wallet className="h-8 w-8 text-ink-300" aria-hidden="true" />
                <p className="max-w-sm text-sm text-ink-500">
                    Aucun bulletin pour le moment. Chaque bulletin apparaît ici dès que votre salaire du mois est versé.
                </p>
            </div>
        );
    }

    return (
        <ul className="space-y-4">
            {payslips.map((payslip) => (
                <li key={payslip.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                            <h2 className="font-serif text-lg font-bold text-ink-900">{payslip.period_label}</h2>
                            <p className="mt-0.5 text-xs text-ink-500">
                                {payslip.paid_at && <>Versé le {shortDate(payslip.paid_at)} · </>}
                                {payslip.channel_label}
                                {payslip.account_masked && <> · compte {payslip.account_masked}</>}
                            </p>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Réf. {payslip.reference}</p>
                        </div>
                        <div className="sm:text-right">
                            <p className="text-xs text-ink-500">Net versé</p>
                            <p className="font-serif text-2xl font-bold text-ink-900">{fcfa(payslip.net_amount)}</p>
                        </div>
                    </div>

                    <dl className="mt-4 divide-y divide-ink-100 text-sm">
                        <div className="flex items-baseline justify-between gap-4 py-2">
                            <dt className="text-ink-700">
                                {payslip.payment_type === 'horaire' && payslip.hours !== null
                                    ? `Heures travaillées : ${hoursText(payslip.hours)} × ${fcfa(payslip.hourly_rate ?? 0)}`
                                    : 'Salaire mensuel de base'}
                            </dt>
                            <dd className="shrink-0 font-medium text-ink-900">{fcfa(payslip.base_amount)}</dd>
                        </div>
                        {payslip.bonuses.map((bonus, index) => (
                            <div key={`prime-${index}`} className="flex items-baseline justify-between gap-4 py-2">
                                <dt className="text-ink-700">Prime — {bonus.label}</dt>
                                <dd className="shrink-0 font-medium text-emerald-700">+ {fcfa(bonus.amount)}</dd>
                            </div>
                        ))}
                        {payslip.deductions.map((deduction, index) => (
                            <div key={`retenue-${index}`} className="flex items-baseline justify-between gap-4 py-2">
                                <dt className="text-ink-700">Retenue — {deduction.label}</dt>
                                <dd className="shrink-0 font-medium text-red-700">− {fcfa(deduction.amount)}</dd>
                            </div>
                        ))}
                    </dl>

                    <a
                        href={route(downloadRoute, payslip.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800 max-sm:w-full max-sm:justify-center"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Télécharger le bulletin (PDF)
                        <span className="sr-only"> de {payslip.period_label}</span>
                    </a>
                </li>
            ))}
        </ul>
    );
}
