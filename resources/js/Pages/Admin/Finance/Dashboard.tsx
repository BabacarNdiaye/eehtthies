import AdminLayout from '@/Layouts/AdminLayout';
import useCompactChart, { axisLabel } from '@/hooks/useCompactChart';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Head, Link } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BookOpen,
    ChevronRight,
    Download,
    HandCoins,
    Landmark,
    Percent,
    ReceiptText,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';

interface Props {
    kpis: {
        total_revenue: number;
        total_expenses: number;
        treasury: number;
        total_outstanding: number;
    };
    insight: {
        thisMonth: number;
        lastMonth: number;
        todayTotal: number;
        todayCount: number;
        invoiced: number;
        collectionRate: number | null;
        overdueTotal: number;
        overdueCount: number;
        overdueStudents: number;
        toCollect: number;
        byType: { key: string; label: string; total: number }[];
        byMethod: { key: string; label: string; total: number }[];
        topOverdue: { name: string; matricule: string | null; balance: number; invoices: number; days: number }[];
        recent: { id: number; receipt: string | null; student: string; label: string | null; method: string; amount: number; date: string | null }[];
    };
    monthly: { month: string; recettes: number; depenses: number }[];
    expensesByCategory: Record<string, number>;
    categoryLabels: Record<string, string>;
    lowStockProducts: { id: number; name: string; quantity_in_stock: string | number; min_threshold: string | number; unit: string }[];
}

const nf = new Intl.NumberFormat('fr-FR');
const fcfa = (v: number) => `${nf.format(Math.round(v))} FCFA`;
const short = (v: number) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace('.0', '')} M` : Math.abs(v) >= 1_000 ? `${Math.round(v / 1_000)} k` : String(Math.round(v)));
const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—');

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

function Bars({ rows, tone = 'from-gold-500 to-gold-300' }: { rows: { label: string; total: number }[]; tone?: string }) {
    const max = Math.max(1, ...rows.map((r) => r.total));
    const sum = rows.reduce((a, r) => a + r.total, 0);

    return (
        <ul className="space-y-3 px-5 py-4">
            {rows.map((r) => (
                <li key={r.label}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-ink-800">{r.label}</span>
                        <span className="whitespace-nowrap tabular-nums text-ink-500">
                            {fcfa(r.total)}
                            <span className="ml-2 text-xs text-ink-400">{sum > 0 ? Math.round((r.total / sum) * 100) : 0} %</span>
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                        <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${(r.total / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function Dashboard({ kpis, insight, monthly, expensesByCategory, categoryLabels, lowStockProducts }: Props) {
    const compact = useCompactChart();
    const categoryData = Object.entries(expensesByCategory).map(([key, total]) => ({ category: categoryLabels[key] ?? key, total: Number(total) }));
    const series = monthly.map((m) => ({ ...m, net: m.recettes - m.depenses }));

    const delta = insight.lastMonth > 0 ? Math.round(((insight.thisMonth - insight.lastMonth) / insight.lastMonth) * 100) : null;
    const up = (delta ?? 0) >= 0;
    const rate = insight.collectionRate;
    const rateTone = rate === null ? 'bg-ink-300' : rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500';

    return (
        <AdminLayout>
            <Head title="Finance" />

            <PageHeader title="Tableau de bord financier" subtitle="Encaissements, recouvrement et trésorerie de l'école, en un coup d'œil.">
                <a
                    href={route('admin.finance.export.invoices')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 outline-none transition hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    <Download className="h-4 w-4" aria-hidden="true" /> Export factures
                </a>
                <a
                    href={route('admin.finance.export.expenses')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 outline-none transition hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    <Download className="h-4 w-4" aria-hidden="true" /> Export dépenses
                </a>
                <Link
                    href={route('admin.finance.cash-journal')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                >
                    <BookOpen className="h-4 w-4" aria-hidden="true" /> Journal de caisse
                </Link>
            </PageHeader>

            <section aria-label="Trésorerie" className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-6 text-white shadow-elevated sm:p-8">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />
                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Trésorerie nette</p>
                        <p className={`mt-2 font-serif text-4xl font-bold tabular-nums sm:text-5xl ${kpis.treasury < 0 ? 'text-rose-300' : ''}`}>{fcfa(kpis.treasury)}</p>
                        <p className="mt-2 text-sm text-white/60">Recettes encaissées moins dépenses enregistrées.</p>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <Link
                                href={route('admin.cashier.create')}
                                className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-ink-900 shadow-sm outline-none transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
                            >
                                <HandCoins className="h-4 w-4" aria-hidden="true" /> Encaisser un paiement
                            </Link>
                            <Link
                                href={route('admin.invoices.overdue')}
                                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-gold-400"
                            >
                                Voir les impayés
                            </Link>
                        </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Encaissé aujourd'hui</dt>
                            <dd className="mt-1 text-lg font-bold tabular-nums">{fcfa(insight.todayTotal)}</dd>
                            <dd className="text-xs text-white/50">{insight.todayCount} reçu(s)</dd>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Encaissé ce mois</dt>
                            <dd className="mt-1 text-lg font-bold tabular-nums">{fcfa(insight.thisMonth)}</dd>
                            {delta !== null && (
                                <dd className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
                                    {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
                                    {up ? '+' : ''}
                                    {delta} % vs mois dernier
                                </dd>
                            )}
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Reste à encaisser</dt>
                            <dd className="mt-1 text-lg font-bold tabular-nums">{fcfa(insight.toCollect)}</dd>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Dont en retard</dt>
                            <dd className="mt-1 text-lg font-bold tabular-nums text-amber-300">{fcfa(insight.overdueTotal)}</dd>
                            <dd className="text-xs text-white/50">{insight.overdueStudents} élève(s)</dd>
                        </div>
                    </dl>
                </div>
            </section>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card hoverable className="p-5">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <TrendingUp className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xl font-bold tabular-nums text-ink-900">{fcfa(kpis.total_revenue)}</p>
                            <p className="text-sm font-medium text-ink-700">Recettes encaissées</p>
                            <p className="truncate text-xs text-ink-500">sur {fcfa(insight.invoiced)} facturés</p>
                        </div>
                    </div>
                </Card>
                <Card hoverable className="p-5">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                            <TrendingDown className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xl font-bold tabular-nums text-ink-900">{fcfa(kpis.total_expenses)}</p>
                            <p className="text-sm font-medium text-ink-700">Dépenses</p>
                            <p className="truncate text-xs text-ink-500">toutes catégories</p>
                        </div>
                    </div>
                </Card>
                <Card hoverable className="p-5">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-800">
                            <Percent className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xl font-bold tabular-nums text-ink-900">{rate !== null ? `${rate} %` : '—'}</p>
                            <p className="text-sm font-medium text-ink-700">Taux de recouvrement</p>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`Recouvrement ${rate ?? 0} %`}>
                                <div className={`h-full rounded-full ${rateTone}`} style={{ width: `${rate ?? 0}%` }} />
                            </div>
                        </div>
                    </div>
                </Card>
                <Card hoverable className="p-5">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xl font-bold tabular-nums text-ink-900">{insight.overdueCount}</p>
                            <p className="text-sm font-medium text-ink-700">Échéances dépassées</p>
                            <p className="truncate text-xs text-ink-500">{fcfa(kpis.total_outstanding)} d'impayés au total</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="p-5 lg:col-span-2">
                    <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                            <h2 className="font-serif text-lg font-semibold text-ink-900">Recettes et dépenses</h2>
                            <p className="text-xs text-ink-500">6 derniers mois, avec le solde net</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                        <ComposedChart data={series} margin={{ left: 0, right: 8, top: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#6c86a3" tickFormatter={(v) => short(Number(v))} width={48} />
                            <Tooltip formatter={(v: number) => fcfa(v)} />
                            <Legend />
                            <Bar dataKey="recettes" name="Recettes" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
                            <Bar dataKey="depenses" name="Dépenses" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={28} />
                            <Line type="monotone" dataKey="net" name="Solde net" stroke="#0b1728" strokeWidth={2.5} dot={{ r: 3 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Card>

                <div className="flex flex-col gap-6">
                    <Section title="Recettes par nature" hint="Inscriptions, scolarité, mensualités…">
                        <Bars rows={insight.byType} />
                    </Section>
                    <Section title="Modes de paiement">
                        {insight.byMethod.length === 0 ? <p className="px-5 py-6 text-center text-sm text-ink-500">Aucun encaissement.</p> : <Bars rows={insight.byMethod} tone="from-ink-700 to-ink-400" />}
                    </Section>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section title="Derniers encaissements" action={{ label: 'Journal de caisse', href: route('admin.finance.cash-journal') }}>
                    {insight.recent.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-ink-500">Aucun encaissement pour le moment.</p>
                    ) : (
                        <ul className="divide-y divide-ink-100">
                            {insight.recent.map((p) => (
                                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                        <ReceiptText className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-ink-900">{p.student}</p>
                                        <p className="truncate text-xs text-ink-500">
                                            {p.label ?? 'Paiement'} · {p.method}
                                            {p.receipt ? ` · ${p.receipt}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold tabular-nums text-emerald-700">+ {fcfa(p.amount)}</p>
                                        <p className="text-xs text-ink-400">{dateFr(p.date)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title="Élèves en retard de paiement" hint="Classés par montant dû après échéance" action={{ label: 'Tous les impayés', href: route('admin.invoices.overdue') }}>
                    {insight.topOverdue.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-emerald-700">Aucun retard : tout est à jour.</p>
                    ) : (
                        <ul className="divide-y divide-ink-100">
                            {insight.topOverdue.map((o) => (
                                <li key={`${o.name}${o.matricule}`} className="flex items-center gap-3 px-5 py-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 font-serif text-xs font-bold text-gold-300">
                                        {o.name
                                            .split(/\s+/)
                                            .slice(0, 2)
                                            .map((w) => w[0])
                                            .join('')
                                            .toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-ink-900">{o.name}</p>
                                        <p className="truncate text-xs text-ink-500">
                                            {o.matricule ?? '—'} · {o.invoices} échéance(s)
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold tabular-nums text-rose-700">{fcfa(o.balance)}</p>
                                        <p className="text-xs text-amber-700">{o.days} j de retard</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <Landmark className="h-5 w-5 text-gold-700" aria-hidden="true" /> Dépenses par catégorie
                    </h2>
                    {categoryData.length === 0 ? (
                        <p className="py-10 text-center text-sm text-ink-500">Aucune dépense enregistrée.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={categoryData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" vertical={false} />
                                <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="#6c86a3" interval={0} tickFormatter={(value) => axisLabel(value, compact, 12)} angle={compact ? -40 : -15} textAnchor="end" height={compact ? 80 : 60} />
                                <YAxis tick={{ fontSize: 12 }} stroke="#6c86a3" tickFormatter={(v) => short(Number(v))} width={48} />
                                <Tooltip formatter={(v: number) => fcfa(v)} />
                                <Bar dataKey="total" fill="#243a52" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Section title="Alertes de stock" action={{ label: 'Voir tout', href: route('admin.products.index', { low_stock: 1 }) }}>
                    <ul className="divide-y divide-ink-100">
                        {lowStockProducts.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                                <p className="text-sm font-medium text-ink-900">{p.name}</p>
                                <p className="whitespace-nowrap text-sm font-semibold text-rose-600">
                                    {p.quantity_in_stock} / seuil {p.min_threshold} {p.unit}
                                </p>
                            </li>
                        ))}
                        {lowStockProducts.length === 0 && <li className="px-5 py-8 text-center text-sm text-ink-500">Aucune alerte de stock pour le moment.</li>}
                    </ul>
                </Section>
            </div>
        </AdminLayout>
    );
}
