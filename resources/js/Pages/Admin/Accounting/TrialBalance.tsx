import AdminLayout from '@/Layouts/AdminLayout';
import AccountingTabs from '@/Components/Admin/AccountingTabs';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import ExportButtons from '@/Components/Admin/ExportButtons';
import { Field, TextInput } from '@/Components/Admin/Field';
import { Head, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

interface Row {
    id: number;
    code: string;
    name: string;
    nature: string;
    debit: number;
    credit: number;
    balance: number;
}

interface Props {
    rows: Row[];
    totalDebit: number;
    totalCredit: number;
    filters: { from?: string | null; to?: string | null };
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function TrialBalance({ rows, totalDebit, totalCredit, filters }: Props) {
    const applyFilters = (overrides: Record<string, string>) => {
        router.get(route('admin.accounting.trial-balance'), { from: filters.from ?? '', to: filters.to ?? '', ...overrides }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout>
            <Head title="Balance générale" />
            <PageHeader title="Balance générale" subtitle="Total des débits, crédits et solde de chaque compte mouvementé sur la période.">
                <ExportButtons
                    csvHref={route('admin.accounting.trial-balance.export', { format: 'csv', from: filters.from ?? '', to: filters.to ?? '' })}
                    pdfHref={route('admin.accounting.trial-balance.export', { format: 'pdf', from: filters.from ?? '', to: filters.to ?? '' })}
                />
            </PageHeader>
            <AccountingTabs current="trial-balance" />

            <Card className="mb-6 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <Field label="Du">
                    <TextInput type="date" value={filters.from ?? ''} onChange={(e) => applyFilters({ from: e.target.value })} />
                </Field>
                <Field label="Au">
                    <TextInput type="date" value={filters.to ?? ''} onChange={(e) => applyFilters({ to: e.target.value })} />
                </Field>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table data-table="scroll" className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Compte</th>
                                <th className="px-5 py-3 text-right">Débit</th>
                                <th className="px-5 py-3 text-right">Crédit</th>
                                <th className="px-5 py-3 text-right">Solde</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {rows.map((row) => (
                                <tr key={row.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <span className="font-mono text-ink-900">{row.code}</span>
                                        <span className="ml-2 text-ink-600">{row.name}</span>
                                    </td>
                                    <td className="px-5 py-3 text-right text-ink-900">{formatFcfa(row.debit)}</td>
                                    <td className="px-5 py-3 text-right text-ink-900">{formatFcfa(row.credit)}</td>
                                    <td className="px-5 py-3 text-right font-medium text-ink-900">{formatFcfa(row.balance)}</td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun mouvement sur la période.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="border-t border-ink-200 bg-ink-50/60">
                            <tr>
                                <td className="px-5 py-3 font-semibold text-ink-900">Total</td>
                                <td className="px-5 py-3 text-right font-semibold text-ink-900">{formatFcfa(totalDebit)}</td>
                                <td className="px-5 py-3 text-right font-semibold text-ink-900">{formatFcfa(totalCredit)}</td>
                                <td className="px-5 py-3 text-right font-semibold text-ink-900">
                                    {Math.abs(totalDebit - totalCredit) < 0.01 ? 'Équilibrée' : formatFcfa(totalDebit - totalCredit)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
