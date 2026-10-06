import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Select, TextInput } from '@/Components/Admin/Field';
import { qty } from '@/lib/economat';
import { fcfa } from '@/lib/money';
import { PageProps } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
    products: { id: number; name: string; category: string; unit: string; quantity_in_stock: string | number; unit_cost: string | number }[];
    categories: Record<string, string>;
    filters: { category?: string };
}

export default function Index({ products, categories, filters }: Props) {
    const canEdit = usePage<PageProps>().props.auth.permissions.includes('modifier_stocks');
    const form = useForm({ label: '', counted: {} as Record<number, string> });

    const gaps = useMemo(
        () =>
            products
                .map((p) => {
                    const raw = form.data.counted[p.id];

                    return raw === undefined || raw === '' ? null : { id: p.id, gap: Number(raw) - Number(p.quantity_in_stock), cost: Number(p.unit_cost) };
                })
                .filter((g): g is { id: number; gap: number; cost: number } => g !== null && Math.abs(g.gap) >= 0.005),
        [products, form.data.counted],
    );
    const gapValue = gaps.reduce((sum, g) => sum + g.gap * g.cost, 0);
    const grouped = Object.entries(categories)
        .map(([key, label]) => ({ key, label, items: products.filter((p) => p.category === key) }))
        .filter((g) => g.items.length > 0);

    return (
        <AdminLayout>
            <Head title="Inventaire" />
            <PageHeader title="Inventaire" subtitle="Comptez le stock réel, saisissez les quantités constatées : seuls les écarts sont régularisés, avec une trace dans les mouvements.">
                <Select aria-label="Catégorie" value={filters.category ?? ''} onChange={(e) => router.get(route('admin.inventory.index'), { category: e.target.value }, { preserveState: false })} className="max-w-[16rem]">
                    <option value="">Toutes les catégories</option>
                    {Object.entries(categories).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </PageHeader>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post(route('admin.inventory.store'), { preserveScroll: true, onSuccess: () => form.setData('counted', {}) });
                }}
            >
                <div className="space-y-6">
                    {grouped.map((g) => (
                        <Card key={g.key} className="overflow-hidden">
                            <h2 className="border-b border-ink-100 px-5 py-3 font-serif text-base font-semibold text-ink-900">{g.label}</h2>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-2.5">Article</th>
                                        <th className="px-5 py-2.5 text-right">Stock théorique</th>
                                        <th className="w-44 px-5 py-2.5">Quantité comptée</th>
                                        <th className="px-5 py-2.5 text-right">Écart</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {g.items.map((p) => {
                                        const raw = form.data.counted[p.id];
                                        const gap = raw === undefined || raw === '' ? null : Number(raw) - Number(p.quantity_in_stock);

                                        return (
                                            <tr key={p.id}>
                                                <td className="px-5 py-2.5 font-medium text-ink-900">{p.name}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-ink-600">{qty(Number(p.quantity_in_stock))} {p.unit}</td>
                                                <td className="px-5 py-2">
                                                    <TextInput aria-label={`Quantité comptée : ${p.name}`} type="number" min="0" step="0.01" disabled={!canEdit} value={raw ?? ''} onChange={(e) => form.setData('counted', { ...form.data.counted, [p.id]: e.target.value })} />
                                                </td>
                                                <td className={`px-5 py-2.5 text-right font-semibold tabular-nums ${gap === null || Math.abs(gap) < 0.005 ? 'text-ink-300' : gap < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                    {gap === null ? '—' : Math.abs(gap) < 0.005 ? '0' : `${gap > 0 ? '+' : '−'}${qty(Math.abs(gap))}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </Card>
                    ))}
                    {grouped.length === 0 && <Card className="p-10 text-center text-sm text-ink-500">Aucun article à inventorier.</Card>}
                </div>

                {canEdit && grouped.length > 0 && (
                    <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white/95 p-4 shadow-elevated backdrop-blur">
                        <div>
                            <p className="text-sm font-semibold text-ink-900">{gaps.length} écart(s) à régulariser</p>
                            <p className={`text-xs ${gapValue < 0 ? 'text-rose-700' : 'text-ink-500'}`}>Valeur des écarts : {gapValue === 0 ? '0 FCFA' : `${gapValue > 0 ? '+' : '−'}${fcfa(Math.abs(gapValue))}`}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <TextInput aria-label="Libellé de l'inventaire" placeholder="Libellé (ex. Inventaire de fin de trimestre)" value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} className="w-72" />
                            <button type="submit" disabled={form.processing || gaps.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-800 disabled:opacity-40">
                                <Save className="h-4 w-4" aria-hidden="true" /> Valider l'inventaire
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </AdminLayout>
    );
}
