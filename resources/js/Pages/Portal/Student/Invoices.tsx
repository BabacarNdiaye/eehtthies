import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import Card from '@/Components/Admin/Card';
import { Invoice } from '@/types';
import { Head } from '@inertiajs/react';
import { Receipt } from 'lucide-react';

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

function formatAmount(value: string | number) {
    return new Intl.NumberFormat('fr-FR').format(Number(value)) + ' FCFA';
}

interface Props {
    invoices: Invoice[];
}

export default function Invoices({ invoices }: Props) {
    const totalDue = invoices.reduce((sum, inv) => sum + (inv.computed_balance ?? 0), 0);

    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mes factures" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-serif text-2xl font-bold text-ink-900">Mes factures</h1>
                {totalDue > 0 && (
                    <span className="rounded-full bg-red-100 px-4 py-1.5 text-sm font-semibold text-red-700">
                        Solde à régler : {formatAmount(totalDue)}
                    </span>
                )}
            </div>

            {invoices.length === 0 ? (
                <Card className="p-10 text-center text-ink-400">
                    Aucune facture pour le moment.
                </Card>
            ) : (
                <div className="space-y-4">
                    {invoices.map((invoice) => (
                        <Card key={invoice.id} className="p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                                        {invoice.reference}
                                    </p>
                                    <h2 className="mt-0.5 font-serif text-lg font-semibold text-ink-900">
                                        {invoice.label}
                                    </h2>
                                    <p className="mt-1 text-sm text-ink-500">
                                        {typeLabels[invoice.type]}
                                        {invoice.due_date && (
                                            <>
                                                {' '}
                                                · Échéance {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                                            </>
                                        )}
                                    </p>
                                </div>
                                <span
                                    className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                                        statusStyles[invoice.computed_status ?? 'impayee']
                                    }`}
                                >
                                    {statusLabels[invoice.computed_status ?? 'impayee']}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 sm:grid-cols-4">
                                <div>
                                    <p className="text-xs text-ink-400">Montant</p>
                                    <p className="font-semibold text-ink-900">{formatAmount(invoice.amount)}</p>
                                </div>
                                {Number(invoice.discount) > 0 && (
                                    <div>
                                        <p className="text-xs text-ink-400">Remise</p>
                                        <p className="font-semibold text-ink-900">{formatAmount(invoice.discount)}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-ink-400">Payé</p>
                                    <p className="font-semibold text-emerald-700">{formatAmount(invoice.computed_paid ?? 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-ink-400">Restant</p>
                                    <p className={`font-semibold ${(invoice.computed_balance ?? 0) > 0 ? 'text-red-700' : 'text-ink-900'}`}>
                                        {formatAmount(invoice.computed_balance ?? 0)}
                                    </p>
                                </div>
                            </div>

                            {invoice.payments && invoice.payments.length > 0 && (
                                <div className="mt-4 border-t border-ink-100 pt-4">
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                                        Paiements reçus
                                    </p>
                                    <ul className="space-y-1.5">
                                        {invoice.payments.map((payment) => (
                                            <li
                                                key={payment.id}
                                                className="flex items-center justify-between text-sm text-ink-600"
                                            >
                                                <span>
                                                    {new Date(payment.paid_at).toLocaleDateString('fr-FR')} —{' '}
                                                    {formatAmount(payment.amount)}
                                                </span>
                                                <a
                                                    href={route('student.invoices.receipt', [invoice.id, payment.id])}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-700 hover:text-gold-600"
                                                >
                                                    <Receipt className="h-3.5 w-3.5" />
                                                    Reçu
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </PortalLayout>
    );
}
