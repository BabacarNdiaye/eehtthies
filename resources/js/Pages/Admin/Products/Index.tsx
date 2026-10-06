import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FilterBar, { SearchField } from '@/Components/Admin/FilterBar';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Select } from '@/Components/Admin/Field';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Paginated, Product } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeftRight, Inbox, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    products: Paginated<Product>;
    suppliers: { id: number; name: string }[];
    categories: Record<string, string>;
    filters: { category?: string; low_stock?: string; search?: string };
    lowStockCount: number;
}

const fcfa = (v: number | string) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(v)))} FCFA`;

export default function Index({ products, categories, filters, lowStockCount }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.products.index'),
            { search, category: filters.category ?? '', low_stock: filters.low_stock ?? '', ...overrides },
            { preserveState: true, replace: true },
        );
    };

    const destroy = async (product: Product) => {
        if (await confirmAction(`Supprimer le produit "${product.name}" ?`)) {
            router.delete(route('admin.products.destroy', product.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Produits & stocks" />
            <PageHeader title="Produits & stocks" subtitle="Gérez les articles en stock et leurs seuils d'alerte." action={{ label: 'Nouveau produit', href: route('admin.products.create') }}>
                <Link href={route('admin.products.movements')} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                    <ArrowLeftRight className="h-4 w-4" /> Mouvements de stock
                </Link>
            </PageHeader>

            {lowStockCount > 0 && (
                <div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> {lowStockCount} produit(s) en stock faible.
                </div>
            )}

            <FilterBar
                search={
                    <SearchField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                        placeholder="Rechercher un produit..."
                    />
                }
                activeCount={[filters.category, filters.low_stock].filter(Boolean).length}
            >
                <Select aria-label="Filtrer par catégorie" value={filters.category ?? ''} onChange={(e) => applyFilters({ category: e.target.value })}>
                    <option value="">Toutes les catégories</option>
                    {Object.entries(categories).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
                <label className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                        type="checkbox"
                        checked={!!filters.low_stock}
                        onChange={(e) => applyFilters({ low_stock: e.target.checked ? '1' : '' })}
                        className="rounded border-ink-300 text-gold-700 focus:ring-gold-500"
                    />
                    Stock faible uniquement
                </label>
            </FilterBar>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Produit</th>
                                <th className="px-5 py-3">Catégorie</th>
                                <th className="px-5 py-3">Stock</th>
                                <th className="px-5 py-3">Coût unitaire</th>
                                <th className="px-5 py-3">Valorisation</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {products.data.map((p) => (
                                <tr key={p.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{p.name}</p>
                                        <p className="text-xs text-ink-500">{p.supplier?.name ?? '—'}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{categories[p.category] ?? p.category}</td>
                                    <td className="px-5 py-3">
                                        <span className={`font-medium ${p.is_low_stock ? 'text-red-600' : 'text-ink-900'}`}>
                                            {p.quantity_in_stock} {p.unit}
                                        </span>
                                        {p.is_low_stock && <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5 text-red-500" />}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{fcfa(p.unit_cost)}</td>
                                    <td className="px-5 py-3 text-ink-600">{fcfa(p.valuation ?? 0)}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconLink href={route('admin.products.edit', p.id)} label="Modifier">
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton onClick={() => destroy(p)} label="Supprimer" tone="danger">
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {products.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun produit trouvé.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={products} />
            </Card>
        </AdminLayout>
    );
}
