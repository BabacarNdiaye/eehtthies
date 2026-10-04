import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Head, Link } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, PiggyBank, TrendingUp } from 'lucide-react';

interface Props {
    revenueByFormation: { name: string; total: number }[];
    totalExpected: number;
    totalCollected: number;
    monthly: { month: string; recettes: number; depenses: number }[];
    comparison: {
        revenue_this_year: number;
        revenue_last_year: number;
        expenses_this_year: number;
        expenses_last_year: number;
    };
}

const fcfa = (v: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} FCFA`;

function Tabs() {
    return (
        <div className="mb-6 flex flex-wrap gap-2">
            <Link href={route('admin.statistics.academic')} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                Académique
            </Link>
            <Link href={route('admin.statistics.financial')} className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">
                Financier
            </Link>
            <Link href={route('admin.statistics.marketing')} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                Marketing
            </Link>
            <Link href={route('admin.statistics.at-risk')} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                Élèves à risque
            </Link>
            <Link href={route('admin.statistics.traffic')} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                Trafic
            </Link>
        </div>
    );
}

function YoyCard({ label, current, previous }: { label: string; current: number; previous: number }) {
    const diff = previous > 0 ? ((current - previous) / previous) * 100 : null;
    const isUp = diff !== null && diff >= 0;

    return (
        <Card className="p-5">
            <p className="text-sm text-ink-500">{label}</p>
            <p className="mt-1 font-serif text-2xl font-bold text-ink-900">{fcfa(current)}</p>
            <p className="mt-1 text-xs text-ink-500">
                Année précédente : {fcfa(previous)}
                {diff !== null && (
                    <span className={`ml-2 inline-flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {Math.abs(diff).toFixed(1)}%
                    </span>
                )}
            </p>
        </Card>
    );
}

export default function Financial({ revenueByFormation, totalExpected, totalCollected, monthly, comparison }: Props) {
    const outstanding = Math.max(0, totalExpected - totalCollected);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return (
        <AdminLayout>
            <Head title="Statistiques financières" />
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">Statistiques & pilotage</h1>
            <p className="mb-4 text-sm text-ink-500">Indicateurs financiers : recettes, dépenses et recouvrement.</p>
            <Tabs />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{fcfa(totalExpected)}</p>
                            <p className="text-sm text-ink-500">Frais attendus</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <PiggyBank className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{fcfa(totalCollected)}</p>
                            <p className="text-sm text-ink-500">Encaissé ({collectionRate}%)</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-red-700">
                            <ArrowDown className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{fcfa(outstanding)}</p>
                            <p className="text-sm text-ink-500">Reste à recouvrer</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <YoyCard label="Recettes — année en cours" current={comparison.revenue_this_year} previous={comparison.revenue_last_year} />
                <YoyCard label="Dépenses — année en cours" current={comparison.expenses_this_year} previous={comparison.expenses_last_year} />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Recettes vs Dépenses (12 mois)</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#6c86a3" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip formatter={(v: number) => fcfa(v)} />
                            <Legend />
                            <Line type="monotone" dataKey="recettes" name="Recettes" stroke="#059669" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#dc2626" strokeWidth={2.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Recettes par formation</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={revenueByFormation} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#6c86a3" />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} stroke="#6c86a3" />
                            <Tooltip formatter={(v: number) => fcfa(v)} />
                            <Bar dataKey="total" fill="#c8942a" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </AdminLayout>
    );
}
