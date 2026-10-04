import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Select } from '@/Components/Admin/Field';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Expense, Paginated } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router } from '@inertiajs/react';
import { Inbox, Pencil, Trash2 } from 'lucide-react';

interface Props {
    expenses: Paginated<Expense>;
    categories: Record<string, string>;
    filters: { category?: string };
}

const fcfa = (v: number | string) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(v)))} FCFA`;

export default function Index({ expenses, categories, filters }: Props) {
    const applyFilters = (overrides: Record<string, string>) => {
        router.get(route('admin.expenses.index'), { category: filters.category ?? '', ...overrides }, { preserveState: true, replace: true });
    };

    const destroy = async (expense: Expense) => {
        if (await confirmAction(`Supprimer la dépense "${expense.label}" ?`)) {
            router.delete(route('admin.expenses.destroy', expense.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Dépenses" />
            <PageHeader title="Dépenses" subtitle="Suivez les charges et dépenses de l'établissement." action={{ label: 'Nouvelle dépense', href: route('admin.expenses.create') }} />

            <Card className="mb-6 p-4">
                <Select aria-label="Filtrer par catégorie" value={filters.category ?? ''} onChange={(e) => applyFilters({ category: e.target.value })} className="sm:w-64">
                    <option value="">Toutes les catégories</option>
                    {Object.entries(categories).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Catégorie</th>
                                <th className="px-5 py-3">Libellé</th>
                                <th className="px-5 py-3">Montant</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {expenses.data.map((exp) => (
                                <tr key={exp.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 text-ink-600">{new Date(exp.expense_date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-5 py-3 text-ink-600">{categories[exp.category] ?? exp.category}</td>
                                    <td className="px-5 py-3 font-medium text-ink-900">{exp.label}</td>
                                    <td className="px-5 py-3 font-medium text-red-600">{fcfa(exp.amount)}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconLink href={route('admin.expenses.edit', exp.id)} label="Modifier">
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton onClick={() => destroy(exp)} label="Supprimer" tone="danger">
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {expenses.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune dépense enregistrée.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={expenses} />
            </Card>
        </AdminLayout>
    );
}
