import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { confirmAction } from '@/lib/confirm';
import { Head, Link, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

type InvoiceRow = {
    id: number;
    label: string;
    amount: string | number;
    due_date?: string | null;
    computed_status: string;
    computed_balance: number;
};

interface Props {
    plan: {
        id: number;
        label: string;
        total_amount: string | number;
        installments_count: number;
        student?: { id: number; first_name: string; last_name: string; matricule: string } | null;
        academic_year?: { id: number; label: string } | null;
        invoices: InvoiceRow[];
    };
    paidAmount: number;
    balance: number;
    progressPercent: number;
}

const statusStyles: Record<string, string> = {
    payee: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    partielle: 'bg-amber-100 text-amber-700 border-amber-200',
    impayee: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels: Record<string, string> = {
    payee: 'Payée',
    partielle: 'Partielle',
    impayee: 'Impayée',
};

export default function Show({ plan, paidAmount, balance, progressPercent }: Props) {
    const destroy = async () => {
        if (!await confirmAction("Supprimer cet échéancier ? Impossible si une tranche a déjà reçu un paiement.")) return;
        router.delete(route('admin.payment-plans.destroy', plan.id));
    };

    return (
        <AdminLayout>
            <Head title={plan.label} />
            <PageHeader title={plan.label} subtitle={plan.student ? `${plan.student.first_name} ${plan.student.last_name} — ${plan.student.matricule}` : ''}>
                <Link
                    href={route('admin.payment-plans.index')}
                    className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                    Retour
                </Link>
                <button
                    onClick={destroy}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4" /> Supprimer
                </button>
            </PageHeader>

            <Card className="mb-6 p-6">
                <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-ink-500">
                        Payé : <span className="font-semibold text-ink-900">{paidAmount.toLocaleString('fr-FR')} FCFA</span> sur{' '}
                        {Number(plan.total_amount).toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="font-semibold text-ink-900">{progressPercent}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-gold-500" style={{ width: `${progressPercent}%` }} />
                </div>
                {balance > 0 && (
                    <p className="mt-3 text-sm text-ink-500">Solde restant : {balance.toLocaleString('fr-FR')} FCFA</p>
                )}
            </Card>

            <Card className="overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">
                        Tranches ({plan.installments_count})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Tranche</th>
                                <th className="px-5 py-3">Échéance</th>
                                <th className="px-5 py-3">Montant</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {plan.invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td className="px-5 py-3 font-medium text-ink-900">{inv.label}</td>
                                    <td className="px-5 py-3 text-ink-700">
                                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-ink-700">{Number(inv.amount).toLocaleString('fr-FR')} FCFA</td>
                                    <td className="px-5 py-3">
                                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[inv.computed_status] ?? ''}`}>
                                            {statusLabels[inv.computed_status] ?? inv.computed_status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <Link
                                            href={route('admin.invoices.show', inv.id)}
                                            className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                                        >
                                            {inv.computed_status === 'payee' ? 'Voir' : 'Enregistrer un paiement'}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
