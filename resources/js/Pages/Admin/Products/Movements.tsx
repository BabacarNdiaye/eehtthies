import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Paginated, StockMovement } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox } from 'lucide-react';
import { useState } from 'react';

interface Props {
    movements: Paginated<StockMovement>;
    products: { id: number; name: string }[];
    types: Record<string, string>;
    filters: { product_id?: string; type?: string };
}

const typeStyles: Record<string, string> = {
    entree: 'bg-emerald-100 text-emerald-700',
    sortie: 'bg-red-100 text-red-700',
    ajustement: 'bg-blue-100 text-blue-700',
};

export default function Movements({ movements, products, types, filters }: Props) {
    const [showForm, setShowForm] = useState(false);

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(route('admin.products.movements'), { product_id: filters.product_id ?? '', type: filters.type ?? '', ...overrides }, { preserveState: true });
    };

    const form = useForm({
        product_id: '' as number | '',
        type: 'entree',
        quantity: '' as number | '',
        unit_cost: '' as number | '',
        reference: '',
        reason: '',
        movement_date: new Date().toISOString().slice(0, 10),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.data.product_id) return;
        form.post(route('admin.products.movements.store', form.data.product_id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setShowForm(false);
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Mouvements de stock" />
            <PageHeader title="Mouvements de stock" subtitle="Historique des entrées, sorties et ajustements de stock.">
                <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
                    {showForm ? 'Fermer' : 'Nouveau mouvement'}
                </button>
            </PageHeader>

            {showForm && (
                <Card className="mb-6 p-6">
                    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <Field label="Produit" required error={form.errors.product_id}>
                            <Select value={form.data.product_id} onChange={(e) => form.setData('product_id', e.target.value ? Number(e.target.value) : '')}>
                                <option value="">Sélectionner...</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Type" required error={form.errors.type}>
                            <Select value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                                {Object.entries(types).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Quantité" required error={form.errors.quantity}>
                            <TextInput type="number" step="0.01" value={form.data.quantity} onChange={(e) => form.setData('quantity', e.target.value ? Number(e.target.value) : '')} />
                        </Field>
                        {form.data.type === 'entree' && (
                            <Field label="Coût unitaire" error={form.errors.unit_cost}>
                                <TextInput type="number" step="0.01" value={form.data.unit_cost} onChange={(e) => form.setData('unit_cost', e.target.value ? Number(e.target.value) : '')} />
                            </Field>
                        )}
                        <Field label="Date" required error={form.errors.movement_date}>
                            <TextInput type="date" value={form.data.movement_date} onChange={(e) => form.setData('movement_date', e.target.value)} />
                        </Field>
                        <Field label="Référence / motif" error={form.errors.reason}>
                            <TextInput value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
                        </Field>
                        <div className="sm:col-span-3 lg:col-span-6">
                            <button type="submit" disabled={form.processing} className="rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50">
                                Enregistrer le mouvement
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Select aria-label="Filtrer par produit" value={filters.product_id ?? ''} onChange={(e) => applyFilters({ product_id: e.target.value })} className="sm:w-64">
                    <option value="">Tous les produits</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Filtrer par type" value={filters.type ?? ''} onChange={(e) => applyFilters({ type: e.target.value })} className="sm:w-56">
                    <option value="">Tous les types</option>
                    {Object.entries(types).map(([key, label]) => (
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
                                <th className="px-5 py-3">Produit</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">Quantité</th>
                                <th className="px-5 py-3">Motif</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {movements.data.map((m) => (
                                <tr key={m.id}>
                                    <td className="px-5 py-3 text-ink-600">{new Date(m.movement_date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-5 py-3 font-medium text-ink-900">{m.product?.name}</td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeStyles[m.type]}`}>{types[m.type]}</span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {m.quantity} {m.product?.unit}
                                    </td>
                                    <td className="px-5 py-3 text-ink-500">{m.reason ?? '—'}</td>
                                </tr>
                            ))}
                            {movements.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun mouvement enregistré.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={movements} />
            </Card>
        </AdminLayout>
    );
}
