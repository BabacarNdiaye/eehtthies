import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { IconLink } from '@/Components/Admin/IconButton';
import { Invoice } from '@/types';
import { Head } from '@inertiajs/react';
import { Eye, Inbox } from 'lucide-react';

const fcfa = (v: number | string) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(v)))} FCFA`;

type OverdueInvoice = Invoice & {
    student: { id: number; first_name: string; last_name: string; matricule: string; phone?: string | null; email?: string | null };
    computed_balance: number;
};

export default function Overdue({ invoices, totalOutstanding }: { invoices: OverdueInvoice[]; totalOutstanding: number }) {
    return (
        <AdminLayout>
            <Head title="Impayés" />
            <PageHeader title="Situation des impayés" subtitle="Liste des factures avec un solde restant à percevoir." />

            <Card className="mb-6 p-5">
                <p className="text-sm text-ink-500">Total des impayés</p>
                <p className="font-serif text-3xl font-bold text-red-600">{fcfa(totalOutstanding)}</p>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Référence</th>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Contact</th>
                                <th className="px-5 py-3">Échéance</th>
                                <th className="px-5 py-3">Solde dû</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{inv.reference}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {inv.student.first_name} {inv.student.last_name}
                                        <p className="text-xs text-ink-500">{inv.student.matricule}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-500">
                                        {inv.student.phone ?? inv.student.email ?? '—'}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
                                    </td>
                                    <td className="px-5 py-3 font-semibold text-red-600">{fcfa(inv.computed_balance)}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end">
                                            <IconLink href={route('admin.invoices.show', inv.id)} label="Consulter">
                                                <Eye className="h-4 w-4" />
                                            </IconLink>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun impayé — toutes les factures sont réglées.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
