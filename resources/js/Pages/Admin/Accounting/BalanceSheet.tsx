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
    asOf: string;
    fiscalYearStart: string;
    actif: Row[];
    passif: Row[];
    resultat: number;
    totalActif: number;
    totalPassif: number;
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function Column({ title, rows, extraRow, total }: { title: string; rows: Row[]; extraRow?: { name: string; balance: number }; total: number }) {
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
                    {extraRow && (
                        <tr className="bg-gold-50/50">
                            <td className="px-5 py-2.5 font-medium text-ink-900">{extraRow.name}</td>
                            <td className="px-5 py-2.5 text-right font-medium text-ink-900">{formatFcfa(extraRow.balance)}</td>
                        </tr>
                    )}
                    {rows.length === 0 && !extraRow && (
                        <tr>
                            <td colSpan={2} className="px-5 py-8 text-center">
                                <div className="flex flex-col items-center gap-3 text-ink-500">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                        <Inbox className="h-6 w-6" />
                                    </span>
                                    <p className="text-sm">Aucun solde.</p>
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

export default function BalanceSheet({ asOf, fiscalYearStart, actif, passif, resultat, totalActif, totalPassif }: Props) {
    const applyFilters = (overrides: Record<string, string>) => {
        router.get(route('admin.accounting.balance-sheet'), { as_of: asOf, ...overrides }, { preserveState: true, replace: true });
    };

    const equilibrated = Math.abs(totalActif - totalPassif) < 0.01;

    return (
        <AdminLayout>
            <Head title="Bilan" />
            <PageHeader title="Bilan" subtitle={`Situation patrimoniale au ${new Date(asOf).toLocaleDateString('fr-FR')} — exercice depuis le ${new Date(fiscalYearStart).toLocaleDateString('fr-FR')}.`}>
                <ExportButtons pdfHref={route('admin.accounting.balance-sheet.export', { as_of: asOf })} />
            </PageHeader>
            <AccountingTabs current="balance-sheet" />

            <Card className="mb-6 p-4 sm:w-64">
                <Field label="Situation au">
                    <TextInput type="date" value={asOf} onChange={(e) => applyFilters({ as_of: e.target.value })} />
                </Field>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Column title="Actif" rows={actif} total={totalActif} />
                <Column
                    title="Passif"
                    rows={passif}
                    extraRow={{ name: "Résultat de l'exercice", balance: resultat }}
                    total={totalPassif}
                />
            </div>

            <p className={`mt-4 text-sm ${equilibrated ? 'text-emerald-600' : 'text-red-600'}`}>
                {equilibrated ? '✓ Le bilan est équilibré.' : `⚠ Écart de ${formatFcfa(totalActif - totalPassif)} entre actif et passif.`}
            </p>
        </AdminLayout>
    );
}
