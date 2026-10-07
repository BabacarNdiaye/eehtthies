import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { dateFr, ORDER_TONES, qty, REQUEST_TONES } from '@/lib/economat';
import { fcfa } from '@/lib/money';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ChevronRight, ClipboardCheck, PackageX, Plus, ShoppingCart, SlidersHorizontal, Warehouse } from 'lucide-react';

interface Props {
    kpis: {
        stockValue: number;
        items: number;
        low: number;
        empty: number;
        ordersOpen: number;
        ordersValue: number;
        requestsPending: number;
        requestsToDeliver: number;
    };
    toReorder: { id: number; name: string; unit: string; quantity_in_stock: string | number; min_threshold: string | number; supplier?: { id: number; name: string } | null }[];
    byCategory: { label: string; items: number; value: number }[];
    openOrders: { id: number; number: string; supplier: string; status: string; expected_at: string | null; late: boolean; total: number }[];
    pendingRequests: { id: number; number: string; status: string; purpose: string; requester: string | null; class: string | null; needed_at: string | null }[];
    movements: { id: number; product: string | null; unit: string | null; type: string; quantity: number; reason: string | null; date: string | null }[];
    statuses: { orders: Record<string, string>; requests: Record<string, string> };
}

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: { label: string; href: string }; children: React.ReactNode }) {
    return (
        <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <div>
                    <h2 className="font-serif text-lg font-semibold text-ink-900">{title}</h2>
                    {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
                </div>
                {action && (
                    <Link href={action.href} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-gold-700 hover:underline">
                        {action.label}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                )}
            </div>
            {children}
        </Card>
    );
}

const Empty = ({ text }: { text: string }) => <p className="px-5 py-8 text-center text-sm text-ink-500">{text}</p>;

export default function Dashboard({ kpis, toReorder, byCategory, openOrders, pendingRequests, movements, statuses }: Props) {
    const maxValue = Math.max(1, ...byCategory.map((c) => c.value));
    const alerts = kpis.low + kpis.empty;

    const tiles = [
        { label: 'Articles en alerte', value: String(alerts), hint: `${kpis.empty} en rupture · ${kpis.low} sous le seuil`, icon: AlertTriangle, tone: alerts ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700', href: route('admin.products.index', { low_stock: 1 }) },
        { label: 'Commandes en cours', value: String(kpis.ordersOpen), hint: kpis.ordersOpen ? `${fcfa(kpis.ordersValue)} à recevoir` : 'rien en attente', icon: ShoppingCart, tone: 'bg-sky-100 text-sky-700', href: route('admin.purchase-orders.index', { status: 'envoye' }) },
        { label: 'Demandes à traiter', value: String(kpis.requestsPending), hint: kpis.requestsToDeliver ? `${kpis.requestsToDeliver} à livrer` : 'aucune à livrer', icon: ClipboardCheck, tone: kpis.requestsPending ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-600', href: route('admin.supply-requests.index', { status: 'en_attente' }) },
        { label: 'Articles suivis', value: String(kpis.items), hint: 'références au catalogue', icon: Warehouse, tone: 'bg-ink-900 text-gold-300', href: route('admin.products.index') },
    ];

    return (
        <AdminLayout>
            <Head title="Économat" />
            <PageHeader title="Économat" subtitle="Stocks, achats et matériel de l'école : ce qui manque, ce qui arrive et ce qui est demandé par les ateliers.">
                <Link
                    href={route('admin.supply-requests.create')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 outline-none transition hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Demande de matériel
                </Link>
                <Link
                    href={route('admin.purchase-orders.create')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Bon de commande
                </Link>
            </PageHeader>

            <section aria-label="Valeur du stock" className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-6 text-white shadow-elevated sm:p-8">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />
                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Valeur du stock</p>
                        <p className="mt-2 font-serif text-4xl font-bold tabular-nums sm:text-5xl">{fcfa(kpis.stockValue)}</p>
                        <p className="mt-2 text-sm text-white/60">{kpis.items} article(s), valorisés au coût moyen pondéré.</p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link href={route('admin.inventory.index')} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-ink-900 outline-none transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900">
                                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Faire l'inventaire
                            </Link>
                            <Link href={route('admin.products.movements')} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white outline-none ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-gold-400">
                                Mouvements de stock
                            </Link>
                        </div>
                    </div>
                    <ul className="space-y-2.5">
                        {byCategory.slice(0, 5).map((c) => (
                            <li key={c.label}>
                                <div className="mb-1 flex items-baseline justify-between text-sm">
                                    <span className="truncate text-white/80">{c.label}</span>
                                    <span className="tabular-nums text-white/60">{fcfa(c.value)}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300" style={{ width: `${(c.value / maxValue) * 100}%` }} />
                                </div>
                            </li>
                        ))}
                        {byCategory.length === 0 && <li className="text-sm text-white/60">Aucun article enregistré.</li>}
                    </ul>
                </div>
            </section>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {tiles.map((t) => (
                    <Link key={t.label} href={t.href} className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
                        <Card hoverable className="h-full p-5">
                            <div className="flex items-center gap-4">
                                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${t.tone}`}>
                                    <t.icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-2xl font-bold tabular-nums text-ink-900">{t.value}</p>
                                    <p className="text-sm font-medium text-ink-700">{t.label}</p>
                                    <p className="truncate text-xs text-ink-500">{t.hint}</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section title="À réapprovisionner" hint="Articles à ou sous leur seuil d'alerte" action={{ label: 'Nouveau bon de commande', href: route('admin.purchase-orders.create') }}>
                    {toReorder.length === 0 ? (
                        <Empty text="Tous les stocks sont au-dessus de leur seuil." />
                    ) : (
                        <ul className="divide-y divide-ink-100">
                            {toReorder.map((p) => {
                                const out = Number(p.quantity_in_stock) <= 0;

                                return (
                                    <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${out ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {out ? <PackageX className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                                            <p className="truncate text-xs text-ink-500">{p.supplier?.name ?? 'Sans fournisseur'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold tabular-nums ${out ? 'text-rose-700' : 'text-amber-700'}`}>
                                                {qty(Number(p.quantity_in_stock))} {p.unit}
                                            </p>
                                            <p className="text-xs text-ink-400">seuil {qty(Number(p.min_threshold))}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Section>

                <Section title="Commandes en cours" hint="Envoyées aux fournisseurs, en attente de réception" action={{ label: 'Toutes les commandes', href: route('admin.purchase-orders.index') }}>
                    {openOrders.length === 0 ? (
                        <Empty text="Aucune commande en attente de réception." />
                    ) : (
                        <ul className="divide-y divide-ink-100">
                            {openOrders.map((o) => (
                                <li key={o.id}>
                                    <Link href={route('admin.purchase-orders.show', o.id)} className="flex items-center gap-3 px-5 py-3 transition hover:bg-ink-50/70">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-ink-900">{o.supplier}</p>
                                            <p className="text-xs text-ink-500">
                                                {o.number} · prévu le {dateFr(o.expected_at)}
                                                {o.late && <span className="ml-1 font-semibold text-rose-600">en retard</span>}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold tabular-nums text-ink-800">{fcfa(o.total)}</span>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_TONES[o.status]}`}>{statuses.orders[o.status]}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section title="Demandes des ateliers et classes" hint="À approuver ou à livrer" action={{ label: 'Toutes les demandes', href: route('admin.supply-requests.index') }}>
                    {pendingRequests.length === 0 ? (
                        <Empty text="Aucune demande en attente." />
                    ) : (
                        <ul className="divide-y divide-ink-100">
                            {pendingRequests.map((r) => (
                                <li key={r.id}>
                                    <Link href={route('admin.supply-requests.show', r.id)} className="flex items-center gap-3 px-5 py-3 transition hover:bg-ink-50/70">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-ink-900">{r.purpose}</p>
                                            <p className="truncate text-xs text-ink-500">
                                                {r.number} · {[r.class, r.requester].filter(Boolean).join(' · ') || '—'}
                                                {r.needed_at ? ` · pour le ${dateFr(r.needed_at)}` : ''}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REQUEST_TONES[r.status]}`}>{statuses.requests[r.status]}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title="Derniers mouvements" action={{ label: 'Historique', href: route('admin.products.movements') }}>
                    {movements.length === 0 ? (
                        <Empty text="Aucun mouvement de stock." />
                    ) : (
                        <ul className="divide-y divide-ink-100">
                            {movements.map((m) => (
                                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.type === 'entree' ? 'bg-emerald-100 text-emerald-700' : m.type === 'sortie' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
                                        {m.type === 'entree' ? <ArrowDownToLine className="h-4 w-4" aria-hidden="true" /> : m.type === 'sortie' ? <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" /> : <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-ink-900">{m.product}</p>
                                        <p className="truncate text-xs text-ink-500">{m.reason ?? '—'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold tabular-nums text-ink-800">
                                            {m.type === 'entree' ? '+' : m.type === 'sortie' ? '−' : '='} {qty(m.quantity)} {m.unit}
                                        </p>
                                        <p className="text-xs text-ink-400">{dateFr(m.date)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>
        </AdminLayout>
    );
}
