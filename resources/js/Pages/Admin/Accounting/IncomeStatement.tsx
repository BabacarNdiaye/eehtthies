import AdminLayout from '@/Layouts/AdminLayout';
import AccountingTabs from '@/Components/Admin/AccountingTabs';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import ExportButtons from '@/Components/Admin/ExportButtons';
import { Field, TextInput } from '@/Components/Admin/Field';
import { Head, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

interface Row {
    code: string;
    name: string;
    balance: number;
}

interface Props {
    from: string;
    to: string;
    charges: Row[];
    produits: Row[];
    totalCharges: number;
    totalProduits: number;
    resultat: number;
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function Column({ title, rows, total }: { title: string; rows: Row[]; total: number }) {
    return (
        <Card className="overflow-hidden">
            <div className="bg-ink-900 px-5 py-3">
                <h2 className="font-serif text-base font-bold text-white">{title}</h2>
            </div>
            <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-ink-100">
                    {rows.map((row) => (
                        <tr key={row.code} className="transition-colors duration-150 hover:bg-ink-50/60">
                            <td className="px-5 py-2.5">
                                <span className="font-mono text-ink-500">{row.code}</span>
                                <span className="ml-2 text-ink-900">{row.name}</span>
                            </td>
                            <td className="px-5 py-2.5 text-right text-ink-900">{formatFcfa(row.balance)}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={2} className="px-5 py-8 text-center">
                                <div className="flex flex-col items-center gap-3 text-ink-400">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                        <Inbox className="h-6 w-6" />
                                    </span>
                                    <p className="text-sm">Aucun mouvement.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
                <tfoot className="border-t border-ink-200 bg-ink-50/60">
                    <tr>
                        <td className="px-5 py-3 font-semibold text-ink-900">Total</td>
                        <td className="px-5 py-3 text-right font-semibold text-ink-900">{formatFcfa(total)}</td>
                    </tr>
                </tfoot>
            </table>
        </Card>
    );
}

export default function IncomeStatement({ from, to, charges, produits, totalCharges, totalProduits, resultat }: Props) {
    const applyFilters = (overrides: Record<string, string>) => {
        router.get(route('admin.accounting.income-statement'), { from, to, ...overrides }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout>
            <Head title="Compte de résultat" />
            <PageHeader title="Compte de résultat" subtitle="Charges et produits de la période, et résultat net (bénéfice ou perte).">
                <ExportButtons pdfHref={route('admin.accounting.income-statement.export', { from, to })} />
            </PageHeader>
            <AccountingTabs current="income-statement" />

            <Card className="mb-6 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:w-96">
                <Field label="Du">
                    <TextInput type="date" value={from} onChange={(e) => applyFilters({ from: e.target.value })} />
                </Field>
                <Field label="Au">
                    <TextInput type="date" value={to} onChange={(e) => applyFilters({ to: e.target.value })} />
                </Field>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Column title="Charges" rows={charges} total={totalCharges} />
                <Column title="Produits" rows={produits} total={totalProduits} />
            </div>

            <Card className={`mt-6 flex items-center justify-between p-5 ${resultat >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className="font-serif text-lg font-bold text-ink-900">
                    {resultat >= 0 ? 'Résultat net — Bénéfice' : 'Résultat net — Perte'}
                </p>
                <p className={`text-xl font-bold ${resultat >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatFcfa(resultat)}
                </p>
            </Card>
        </AdminLayout>
    );
}
