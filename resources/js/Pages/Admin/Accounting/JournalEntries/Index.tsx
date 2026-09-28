import AdminLayout from '@/Layouts/AdminLayout';
import AccountingTabs from '@/Components/Admin/AccountingTabs';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox, Lock } from 'lucide-react';

interface EntryRow {
    id: number;
    entry_date: string;
    reference: string;
    description: string;
    is_auto: boolean;
    lines_count: number;
    journal: { code: string; name: string };
    lines: { debit: string | number; credit: string | number }[];
}

interface Props {
    entries: Paginated<EntryRow>;
    journals: { id: number; code: string; name: string }[];
    filters: { journal_id?: string; from?: string; to?: string };
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function Index({ entries, journals, filters }: Props) {
    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.accounting.journal-entries.index'),
            { journal_id: filters.journal_id ?? '', from: filters.from ?? '', to: filters.to ?? '', ...overrides },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AdminLayout>
            <Head title="Écritures comptables" />
            <PageHeader
                title="Écritures comptables"
                subtitle="Journal des écritures en partie double — générées automatiquement ou saisies manuellement."
                action={{ label: 'Nouvelle écriture', href: route('admin.accounting.journal-entries.create') }}
            />
            <AccountingTabs current="journal-entries" />

            <Card className="mb-6 grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
                <Field label="Journal">
                    <Select value={filters.journal_id ?? ''} onChange={(e) => applyFilters({ journal_id: e.target.value })}>
                        <option value="">Tous les journaux</option>
                        {journals.map((j) => (
                            <option key={j.id} value={j.id}>{j.code} — {j.name}</option>
                        ))}
                    </Select>
                </Field>
                <Field label="Du">
                    <TextInput type="date" value={filters.from ?? ''} onChange={(e) => applyFilters({ from: e.target.value })} />
                </Field>
                <Field label="Au">
                    <TextInput type="date" value={filters.to ?? ''} onChange={(e) => applyFilters({ to: e.target.value })} />
                </Field>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Journal</th>
                                <th className="px-5 py-3">Référence</th>
                                <th className="px-5 py-3">Libellé</th>
                                <th className="px-5 py-3 text-right">Montant</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {entries.data.map((entry) => {
                                const total = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
                                return (
                                    <tr key={entry.id} className="cursor-pointer transition-colors duration-150 hover:bg-ink-50/60" onClick={() => router.get(route('admin.accounting.journal-entries.show', entry.id))}>
                                        <td className="px-5 py-3 text-ink-600">{new Date(entry.entry_date).toLocaleDateString('fr-FR')}</td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">{entry.journal.code}</span>
                                        </td>
                                        <td className="px-5 py-3 font-mono text-xs text-ink-500">{entry.reference}</td>
                                        <td className="px-5 py-3 text-ink-900">
                                            {entry.description}
                                            {entry.is_auto && (
                                                <Lock className="ml-2 inline h-3 w-3 text-ink-300" />
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium text-ink-900">{formatFcfa(total)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <Link href={route('admin.accounting.journal-entries.show', entry.id)} className="text-xs font-medium text-brand-600 hover:underline">
                                                Voir
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            {entries.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune écriture trouvée.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={entries} />
            </Card>
        </AdminLayout>
    );
}
