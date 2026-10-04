import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput } from '@/Components/Admin/Field';
import { Head, router } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, Inbox } from 'lucide-react';

interface Entry {
    date: string;
    type: 'recette' | 'depense';
    label: string;
    amount: number;
    balance: number;
}

interface Props {
    entries: Entry[];
    from: string;
    to: string;
    totalIn: number;
    totalOut: number;
}

const fcfa = (v: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} FCFA`;

export default function CashJournal({ entries, from, to, totalIn, totalOut }: Props) {
    const updateFilters = (patch: Partial<{ from: string; to: string }>) => {
        router.get(route('admin.finance.cash-journal'), { from, to, ...patch }, { preserveState: true });
    };

    return (
        <AdminLayout>
            <Head title="Journal de caisse" />
            <PageHeader title="Journal de caisse" subtitle="Chronologie des recettes et dépenses avec solde cumulé." />

            <Card className="mb-6 grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
                <Field label="Du">
                    <TextInput type="date" value={from} onChange={(e) => updateFilters({ from: e.target.value })} />
                </Field>
                <Field label="Au">
                    <TextInput type="date" value={to} onChange={(e) => updateFilters({ to: e.target.value })} />
                </Field>
                <div className="flex flex-col justify-end gap-1 text-sm">
                    <p className="text-emerald-700">Entrées : {fcfa(totalIn)}</p>
                    <p className="text-red-600">Sorties : {fcfa(totalOut)}</p>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Libellé</th>
                                <th className="px-5 py-3 text-right">Montant</th>
                                <th className="px-5 py-3 text-right">Solde cumulé</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {entries.map((entry, i) => (
                                <tr key={i}>
                                    <td className="px-5 py-3 text-ink-600">
                                        {new Date(entry.date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="inline-flex items-center gap-2 text-ink-800">
                                            {entry.type === 'recette' ? (
                                                <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <ArrowDownCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            {entry.label}
                                        </span>
                                    </td>
                                    <td
                                        className={`px-5 py-3 text-right font-medium ${
                                            entry.type === 'recette' ? 'text-emerald-700' : 'text-red-600'
                                        }`}
                                    >
                                        {entry.type === 'recette' ? '+' : '-'}
                                        {fcfa(entry.amount)}
                                    </td>
                                    <td className="px-5 py-3 text-right font-semibold text-ink-900">
                                        {fcfa(entry.balance)}
                                    </td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun mouvement sur cette période.</p>
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
