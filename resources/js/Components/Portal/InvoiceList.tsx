import PayOnline from '@/Components/Portal/PayOnline';
import Segmented from '@/Components/Portal/Segmented';
import { paymentChannelLabel } from '@/lib/paymentChannels';
import { formatAmount } from '@/lib/portal';
import { Invoice, OnlinePaymentConfig, Payment } from '@/types';
import { CheckCircle2, Clock, Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';

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

/** Une carte par facture : statut, échéance, montants, barre de règlement et paiements reçus avec lien vers le reçu PDF. */
function InvoiceCards({ invoices, receiptHref }: { invoices: Invoice[]; receiptHref: (invoice: Invoice, payment: Payment) => string }) {
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
                const due = balance > 0 ? dueBadge(invoice.due_date) : null;

                return (
                    <li key={invoice.id} className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{invoice.reference}</p>
                                <h2 className="mt-0.5 font-serif text-base font-semibold leading-snug text-ink-900">{invoice.label}</h2>
                                <p className="mt-0.5 text-xs text-ink-500">
                                    {typeLabels[invoice.type]}
                                    {invoice.due_date && <> · Échéance {new Date(invoice.due_date).toLocaleDateString('fr-FR')}</>}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>{statusLabels[status]}</span>
                                {due && (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${due.tone}`}>
                                        <Clock className="h-3 w-3" aria-hidden="true" />
                                        {due.label}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Part réglée">
                            <div className={`h-full rounded-full ${status === 'payee' ? 'bg-emerald-500' : 'bg-leaf-500'}`} style={{ width: `${progress * 100}%` }} />
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
                                            <span className="text-ink-500"> · {paymentChannelLabel(payment.channel, payment.method)}</span>
                                        </span>
                                        <a
                                            href={receiptHref(invoice, payment)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex min-h-[2.75rem] items-center gap-1.5 px-1 text-xs font-semibold text-leaf-700 hover:text-leaf-600"
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

/** « 2026-10-05 » ou « 2026-10-05T00:00:00Z » en date locale, sans décalage de fuseau. */
function localDate(iso: string): Date {
    const [year, month, day] = iso.slice(0, 10).split('-').map(Number);

    return new Date(year, month - 1, day);
}

/** Jours entre aujourd'hui et la date : négatif quand elle est passée. */
function daysUntil(iso: string): number {
    const now = new Date();

    return Math.round((localDate(iso).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
}

/** Pastille d'échéance d'une facture à régler : en retard, ou proche (une semaine) ; rien quand l'échéance est lointaine. */
function dueBadge(dueDate?: string | null): { label: string; tone: string } | null {
    if (!dueDate) return null;

    const days = daysUntil(dueDate);

    if (days < 0) return { label: `En retard de ${-days} j`, tone: 'bg-red-100 text-red-700' };
    if (days === 0) return { label: "Échéance aujourd'hui", tone: 'bg-amber-100 text-amber-800' };
    if (days <= 7) return { label: `Dans ${days} j`, tone: 'bg-amber-100 text-amber-800' };

    return null;
}

/** Synthèse en tête de liste : solde à régler, factures en retard, prochaine échéance. */
function Summary({ invoices }: { invoices: Invoice[] }) {
    if (invoices.length === 0) return null;

    const open = invoices.filter((invoice) => (invoice.computed_balance ?? 0) > 0);
    const totalDue = open.reduce((sum, invoice) => sum + (invoice.computed_balance ?? 0), 0);

    const card = 'relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-leaf-900 p-5 text-white shadow-elevated';
    const glow = <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-leaf-500/25 blur-2xl" />;

    if (totalDue <= 0) {
        return (
            <div role="status" className={`${card} flex items-center gap-4`}>
                {glow}
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-leaf-500 text-ink-900">
                    <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </span>
                <div className="relative">
                    <p className="text-xs font-medium text-white/70">Scolarité</p>
                    <p className="text-2xl font-bold leading-tight">À jour</p>
                </div>
            </div>
        );
    }

    const overdue = open.filter((invoice) => invoice.due_date && daysUntil(invoice.due_date) < 0);
    const overdueTotal = overdue.reduce((sum, invoice) => sum + (invoice.computed_balance ?? 0), 0);
    const next = open
        .filter((invoice) => invoice.due_date && daysUntil(invoice.due_date) >= 0)
        .sort((a, b) => daysUntil(a.due_date as string) - daysUntil(b.due_date as string))[0];

    return (
        <div role="status" className={card}>
            {glow}
            <div className="relative flex items-center gap-3">
                <Wallet className="h-6 w-6 shrink-0 text-leaf-400" aria-hidden="true" />
                <p className="text-xs font-medium text-white/70">Solde à régler</p>
            </div>
            <p className="relative mt-2 text-3xl font-bold leading-tight tracking-tight">{formatAmount(totalDue)}</p>
            {overdue.length > 0 && (
                <p className="relative mt-3 inline-block rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-200">
                    {overdue.length} facture(s) en retard, soit {formatAmount(overdueTotal)}
                </p>
            )}
            {next?.due_date && (
                <p className="relative mt-2 text-sm text-white/70">
                    Prochaine échéance : {localDate(next.due_date).toLocaleDateString('fr-FR')} — {formatAmount(next.computed_balance ?? 0)}
                </p>
            )}
        </div>
    );
}

/** À régler d'abord, l'échéance la plus ancienne en tête (un retard se voit tout de suite) ; puis les factures soldées, les plus récentes d'abord. */
function byUrgency(invoices: Invoice[]): Invoice[] {
    const isOpen = (invoice: Invoice) => (invoice.computed_balance ?? 0) > 0;
    const dueTime = (invoice: Invoice, fallback: number) => (invoice.due_date ? localDate(invoice.due_date).getTime() : fallback);

    return [...invoices].sort((a, b) => {
        if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;

        return isOpen(a) ? dueTime(a, Number.MAX_SAFE_INTEGER) - dueTime(b, Number.MAX_SAFE_INTEGER) : dueTime(b, 0) - dueTime(a, 0);
    });
}

/** Factures d'un élève : synthèse (solde, retards, prochaine échéance) puis une carte par facture, les plus urgentes en premier. */
export default function InvoiceList({
    invoices,
    receiptHref,
    online,
}: {
    invoices: Invoice[];
    receiptHref: (invoice: Invoice, payment: Payment) => string;
    /** Présent seulement quand un pilote de paiement en ligne est actif : « Payer en ligne » n'apparaît pas sinon. */
    online?: OnlinePaymentConfig | null;
}) {
    const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');
    const ordered = byUrgency(invoices);
    const open = ordered.filter((invoice) => (invoice.computed_balance ?? 0) > 0);
    const shown = filter === 'open' ? open : filter === 'paid' ? ordered.filter((invoice) => (invoice.computed_balance ?? 0) <= 0) : ordered;

    return (
        <>
            <Summary invoices={invoices} />
            {online && open.length > 0 && <PayOnline key={open.map((invoice) => invoice.id).join('-')} invoices={open} online={online} />}
            {invoices.length > 0 && (
                <Segmented
                    label="Filtrer les factures"
                    value={filter}
                    onChange={setFilter}
                    tabs={[
                        { key: 'all', label: 'Toutes' },
                        { key: 'open', label: 'À payer', badge: open.length || null },
                        { key: 'paid', label: 'Payées' },
                    ]}
                />
            )}
            <InvoiceCards invoices={shown} receiptHref={receiptHref} />
        </>
    );
}
