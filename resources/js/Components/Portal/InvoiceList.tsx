import { formatAmount } from '@/lib/portal';
import { Invoice, Payment } from '@/types';
import { Receipt, Wallet } from 'lucide-react';

const statusStyles: Record<string, string> = {
    payee: 'bg-emerald-100 text-emerald-700',
    partielle: 'bg-amber-100 text-amber-700',
    impayee: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
    payee: 'Payée',
    partielle: 'Partielle',
    impayee: 'Impayée',
};

const typeLabels: Record<string, string> = {
    inscription: "Frais d'inscription",
    scolarite: 'Frais de scolarité',
    mensualite: 'Mensualité',
    autre: 'Autre',
};

/** Factures d'un élève : statut, montants, barre de règlement et paiements reçus avec lien vers le reçu PDF. */
export default function InvoiceList({ invoices, receiptHref }: { invoices: Invoice[]; receiptHref: (invoice: Invoice, payment: Payment) => string }) {
    if (invoices.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-4 py-10 text-center ring-1 ring-ink-100">
                <Wallet className="h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-400">Aucune facture pour le moment.</p>
            </div>
        );
    }

    return (
        <ul className="space-y-3">
            {invoices.map((invoice) => {
                const status = invoice.computed_status ?? 'impayee';
                const net = Number(invoice.amount) - Number(invoice.discount);
                const paid = invoice.computed_paid ?? 0;
                const balance = invoice.computed_balance ?? 0;
                const progress = net > 0 ? Math.min(1, paid / net) : 1;

                return (
                    <li key={invoice.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{invoice.reference}</p>
                                <h3 className="mt-0.5 font-serif text-base font-semibold leading-snug text-ink-900">{invoice.label}</h3>
                                <p className="mt-0.5 text-xs text-ink-500">
                                    {typeLabels[invoice.type]}
                                    {invoice.due_date && <> · Échéance {new Date(invoice.due_date).toLocaleDateString('fr-FR')}</>}
                                </p>
                            </div>
                            <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>{statusLabels[status]}</span>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Part réglée">
                            <div className={`h-full rounded-full ${status === 'payee' ? 'bg-emerald-500' : 'bg-gold-500'}`} style={{ width: `${progress * 100}%` }} />
                        </div>

                        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                            <div>
                                <dt className="text-[11px] text-ink-400">Montant</dt>
                                <dd className="font-semibold text-ink-900">{formatAmount(net)}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] text-ink-400">Payé</dt>
                                <dd className="font-semibold text-emerald-700">{formatAmount(paid)}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] text-ink-400">Restant</dt>
                                <dd className={`font-semibold ${balance > 0 ? 'text-red-700' : 'text-ink-900'}`}>{formatAmount(balance)}</dd>
                            </div>
                        </dl>
                        {Number(invoice.discount) > 0 && (
                            <p className="mt-1.5 text-[11px] text-ink-400">Remise de {formatAmount(Number(invoice.discount))} déjà déduite du montant.</p>
                        )}

                        {invoice.payments && invoice.payments.length > 0 && (
                            <ul className="mt-3 space-y-1 border-t border-ink-100 pt-3">
                                {invoice.payments.map((payment) => (
                                    <li key={payment.id} className="flex items-center justify-between gap-3 text-sm text-ink-600">
                                        <span>
                                            {new Date(payment.paid_at).toLocaleDateString('fr-FR')} — {formatAmount(Number(payment.amount))}
                                        </span>
                                        <a
                                            href={receiptHref(invoice, payment)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex min-h-[2.75rem] items-center gap-1.5 px-1 text-xs font-semibold text-gold-700 hover:text-gold-600"
                                        >
                                            <Receipt className="h-4 w-4" /> Reçu
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
