import AdminLayout from '@/Layouts/AdminLayout';
import useCompactChart, { axisLabel } from '@/hooks/useCompactChart';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import StatisticsTabs from '@/Components/Admin/StatisticsTabs';
import { Head } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Megaphone, Target, UserCheck } from 'lucide-react';

interface Props {
    monthly: { month: string; total: number }[];
    bySource: Record<string, number>;
    byFormation: { name: string; total: number }[];
    totalCandidatures: number;
    enrolled: number;
    conversionRate: number;
}

const sourceColors = ['#243a52', '#c8942a', '#059669', '#7c3aed', '#dc2626'];


export default function Marketing({ monthly, bySource, byFormation, totalCandidatures, enrolled, conversionRate }: Props) {
    const compact = useCompactChart();
    const sourceData = Object.entries(bySource).map(([key, total]) => ({ name: key, total }));

    return (
        <AdminLayout>
            <Head title="Statistiques marketing" />
            <PageHeader title="Statistiques & pilotage" subtitle="Indicateurs marketing : candidatures, sources et conversion." />
            <StatisticsTabs current="marketing" />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <Megaphone className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{totalCandidatures}</p>
                            <p className="text-sm text-ink-500">Candidatures reçues</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{enrolled}</p>
                            <p className="text-sm text-ink-500">Candidats inscrits</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-100 text-gold-800">
                            <Target className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{conversionRate}%</p>
                            <p className="text-sm text-ink-500">Taux de conversion</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Candidatures (12 mois)</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#6c86a3" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip />
                            <Line type="monotone" dataKey="total" name="Candidatures" stroke="#c8942a" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Candidatures par source</h2>
                    {sourceData.length === 0 ? (
                        <p className="text-sm text-ink-500">Aucune candidature enregistrée.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={sourceData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                                    {sourceData.map((_, i) => (
                                        <Cell key={i} fill={sourceColors[i % sourceColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            <Card className="p-5">
                <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Formations les plus demandées</h2>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={byFormation} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#6c86a3" />
                        <YAxis type="category" dataKey="name" width={compact ? 96 : 180} tickFormatter={(value) => axisLabel(value, compact)} tick={{ fontSize: 11 }} stroke="#6c86a3" />
                        <Tooltip />
                        <Bar dataKey="total" fill="#243a52" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
        </AdminLayout>
    );
}
