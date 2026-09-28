import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Head, Link } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AlertTriangle, Download, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

interface Props {
    kpis: {
        total_revenue: number;
        total_expenses: number;
        treasury: number;
        total_outstanding: number;
    };
    monthly: { month: string; recettes: number; depenses: number }[];
    expensesByCategory: Record<string, number>;
    categoryLabels: Record<string, string>;
    lowStockProducts: { id: number; name: string; quantity_in_stock: string | number; min_threshold: string | number; unit: string }[];
}

const fcfa = (v: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} FCFA`;

function Kpi({
    icon: Icon,
    label,
    value,
    tint,
}: {
    icon: typeof Wallet;
    label: string;
    value: string;
    tint: string;
}) {
    return (
        <Card className="p-5">
            <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tint}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xl font-bold text-ink-900">{value}</p>
                    <p className="text-sm text-ink-500">{label}</p>
                </div>
            </div>
        </Card>
    );
}

export default function Dashboard({ kpis, monthly, expensesByCategory, categoryLabels, lowStockProducts }: Props) {
    const categoryData = Object.entries(expensesByCategory).map(([key, total]) => ({
        category: categoryLabels[key] ?? key,
        total,
    }));

    return (
        <AdminLayout>
            <Head title="Finance" />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-ink-900">Tableau de bord financier</h1>
                    <p className="mt-1 text-sm text-ink-500">Vue d'ensemble des recettes, dépenses et de la trésorerie.</p>
                </div>
                <div className="flex gap-2">
                    <a
                        href={route('admin.finance.export.invoices')}
                        className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    >
                        <Download className="h-4 w-4" /> Export factures
                    </a>
                    <a
                        href={route('admin.finance.export.expenses')}
                        className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    >
                        <Download className="h-4 w-4" /> Export dépenses
                    </a>
                    <Link
                        href={route('admin.finance.cash-journal')}
                        className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                    >
                        Journal de caisse
                    </Link>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi icon={TrendingUp} label="Recettes (total)" value={fcfa(kpis.total_revenue)} tint="bg-emerald-100 text-emerald-700" />
                <Kpi icon={TrendingDown} label="Dépenses (total)" value={fcfa(kpis.total_expenses)} tint="bg-red-100 text-red-700" />
                <Kpi icon={PiggyBank} label="Trésorerie" value={fcfa(kpis.treasury)} tint="bg-gold-100 text-gold-800" />
                <Kpi icon={AlertTriangle} label="Impayés" value={fcfa(kpis.total_outstanding)} tint="bg-amber-100 text-amber-700" />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Recettes vs Dépenses (6 mois)</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip formatter={(v: number) => fcfa(v)} />
                            <Legend />
                            <Line type="monotone" dataKey="recettes" name="Recettes" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Dépenses par catégorie</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={categoryData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="#6c86a3" interval={0} angle={-15} textAnchor="end" height={60} />
                            <YAxis tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip formatter={(v: number) => fcfa(v)} />
                            <Bar dataKey="total" fill="#243a52" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 p-5">
                    <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <AlertTriangle className="h-5 w-5 text-amber-500" /> Alertes stock faible
                    </h2>
                    <Link href={route('admin.products.index', { low_stock: 1 })} className="text-sm font-medium text-gold-700 hover:underline">
                        Voir tout
                    </Link>
                </div>
                <ul className="divide-y divide-ink-100">
                    {lowStockProducts.map((p) => (
                        <li key={p.id} className="flex items-center justify-between px-5 py-3">
                            <p className="text-sm font-medium text-ink-900">{p.name}</p>
                            <p className="text-sm text-red-600">
                                {p.quantity_in_stock} / seuil {p.min_threshold} {p.unit}
                            </p>
                        </li>
                    ))}
                    {lowStockProducts.length === 0 && (
                        <li className="px-5 py-8 text-center text-ink-400">Aucune alerte de stock pour le moment.</li>
                    )}
                </ul>
            </Card>
        </AdminLayout>
    );
}
