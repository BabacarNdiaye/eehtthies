import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Select } from '@/Components/Admin/Field';
import { dateFr, ORDER_TONES } from '@/lib/economat';
import { fcfa } from '@/lib/money';
import { Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

interface Row {
    id: number;
    number: string;
    supplier: string;
    status: string;
    ordered_at: string | null;
    expected_at: string | null;
    late: boolean;
    total: number;
    received: number;
    lines: number;
}

interface Props {
    orders: Paginated<Row>;
    counts: Record<string, number>;
    suppliers: { id: number; name: string }[];
    statuses: Record<string, string>;
    filters: { status?: string; supplier_id?: string };
}

export default function Index({ orders, counts, suppliers, statuses, filters }: Props) {
    const go = (overrides: Record<string, string>) =>
        router.get(route('admin.purchase-orders.index'), { status: filters.status ?? '', supplier_id: filters.supplier_id ?? '', ...overrides }, { preserveState: true, replace: true });
    const total = Object.values(counts).reduce((a, b) => a + Number(b), 0);
    const tabs = [{ key: '', label: 'Tous', count: total }, ...Object.entries(statuses).map(([key, label]) => ({ key, label, count: Number(counts[key] ?? 0) }))];

    return (
        <AdminLayout>
            <Head title="Bons de commande" />
            <PageHeader title="Bons de commande" subtitle="Commandez aux fournisseurs, suivez les livraisons et mettez le stock à jour à la réception." action={{ label: 'Nouveau bon de commande', href: route('admin.purchase-orders.create') }} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div role="tablist" aria-label="Filtrer par statut" className="inline-flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1">
                    {tabs.map((t) => {
                        const active = (filters.status ?? '') === t.key;

                        return (
                            <button
                                key={t.key || 'all'}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => go({ status: t.key })}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                            >
                                {t.label}
                                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-ink-900 text-white' : 'bg-ink-200/70 text-ink-600'}`}>{t.count}</span>
                            </button>
                        );
                    })}
                </div>
                <Select aria-label="Fournisseur" value={filters.supplier_id ?? ''} onChange={(e) => go({ supplier_id: e.target.value })} className="max-w-[14rem]">
                    <option value="">Tous les fournisseurs</option>
                    {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </Select>
            </div>

            <Card className="overflow-hidden">
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Bon</th>
                                <th className="px-5 py-3">Fournisseur</th>
                                <th className="px-5 py-3">Livraison prévue</th>
                                <th className="px-5 py-3 text-right">Montant</th>
                                <th className="px-5 py-3">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {orders.data.map((o) => (
                                <tr key={o.id} className="transition-colors hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <Link href={route('admin.purchase-orders.show', o.id)} className="font-mono font-semibold text-ink-900 hover:underline">
                                            {o.number}
                                        </Link>
                                        <span className="block text-xs text-ink-500">{o.lines} article(s)</span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-800">{o.supplier}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {dateFr(o.expected_at)}
                                        {o.late && <span className="block text-xs font-semibold text-rose-600">en retard</span>}
                                    </td>
                                    <td className="px-5 py-3 text-right tabular-nums">
                                        <span className="font-semibold text-ink-900">{fcfa(o.total)}</span>
                                        {o.received > 0 && o.received < o.total && <span className="block text-xs text-ink-500">{fcfa(o.received)} reçus</span>}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_TONES[o.status]}`}>{statuses[o.status]}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ul className="divide-y divide-ink-100 md:hidden">
                    {orders.data.map((o) => (
                        <li key={o.id}>
                            <Link href={route('admin.purchase-orders.show', o.id)} className="block px-4 py-3.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-ink-900">{o.supplier}</p>
                                        <p className="font-mono text-xs text-ink-500">{o.number}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_TONES[o.status]}`}>{statuses[o.status]}</span>
                                </div>
                                <p className="mt-2 flex justify-between text-sm">
                                    <span className="text-ink-500">Prévu le {dateFr(o.expected_at)}</span>
                                    <span className="font-bold tabular-nums text-ink-900">{fcfa(o.total)}</span>
                                </p>
                            </Link>
                        </li>
                    ))}
                </ul>
                {orders.data.length === 0 && (
                    <div className="flex flex-col items-center gap-3 px-5 py-12 text-ink-500">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <p className="text-sm">Aucun bon de commande.</p>
                    </div>
                )}
                <Pagination data={orders} />
            </Card>
        </AdminLayout>
    );
}
