import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Head, Link } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Award, GraduationCap, TrendingUp, Users } from 'lucide-react';

interface Props {
    studentsPerFormation: { name: string; total: number }[];
    genderSplit: Record<string, number>;
    enrollmentTrend: { month: string; total: number }[];
    successRateByFormation: { name: string; rate: number | null; total: number }[];
    averageBySubject: { subject: string; average: number; count: number }[];
    topStudents: {
        id: number;
        average: string | number;
        rank: number;
        class_size: number;
        student?: { first_name: string; last_name: string; matricule: string };
        school_class?: { name: string };
    }[];
    teacherPerformance: { teacher: string; average: number; count: number }[];
}

const genderLabels: Record<string, string> = { M: 'Masculin', F: 'Féminin' };
const genderColors = ['#243a52', '#c8942a'];

function Tabs() {
    return (
        <div className="mb-6 flex flex-wrap gap-2">
            <Link href={route('admin.statistics.academic')} className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">
                Académique
            </Link>
            <Link href={route('admin.statistics.financial')} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
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

export default function Academic({
    studentsPerFormation,
    genderSplit,
    enrollmentTrend,
    successRateByFormation,
    averageBySubject,
    topStudents,
    teacherPerformance,
}: Props) {
    const genderData = Object.entries(genderSplit).map(([key, total]) => ({ name: genderLabels[key] ?? key, total }));

    return (
        <AdminLayout>
            <Head title="Statistiques académiques" />
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">Statistiques & pilotage</h1>
            <p className="mb-4 text-sm text-ink-500">Indicateurs académiques : effectifs, résultats et performance pédagogique.</p>
            <Tabs />

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <Users className="h-5 w-5 text-gold-600" /> Élèves par formation
                    </h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={studentsPerFormation} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} stroke="#6c86a3" />
                            <Tooltip />
                            <Bar dataKey="total" fill="#243a52" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Répartition par sexe</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={genderData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                                {genderData.map((_, i) => (
                                    <Cell key={i} fill={genderColors[i % genderColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <Card className="mb-6 p-5">
                <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                    <TrendingUp className="h-5 w-5 text-gold-600" /> Évolution des effectifs (12 mois)
                </h2>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={enrollmentTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6c86a3" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                        <Tooltip />
                        <Line type="monotone" dataKey="total" name="Nouveaux élèves" stroke="#c8942a" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
            </Card>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <Award className="h-5 w-5 text-gold-600" /> Taux de réussite par formation
                    </h2>
                    {successRateByFormation.length === 0 ? (
                        <p className="text-sm text-ink-400">Aucun bulletin généré pour le moment.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={successRateByFormation}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#6c86a3" interval={0} angle={-15} textAnchor="end" height={60} />
                                <YAxis unit="%" tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                <Tooltip formatter={(v: number) => `${v}%`} />
                                <Bar dataKey="rate" name="Taux de réussite" fill="#059669" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <GraduationCap className="h-5 w-5 text-gold-600" /> Moyenne par matière
                    </h2>
                    {averageBySubject.length === 0 ? (
                        <p className="text-sm text-ink-400">Aucune note publiée pour le moment.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={averageBySubject}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                <XAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="#6c86a3" interval={0} angle={-15} textAnchor="end" height={60} />
                                <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                <Tooltip />
                                <Bar dataKey="average" name="Moyenne /20" fill="#243a52" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="overflow-hidden">
                    <div className="border-b border-ink-100 p-5">
                        <h2 className="font-serif text-lg font-semibold text-ink-900">Classement des élèves</h2>
                    </div>
                    <ul className="divide-y divide-ink-100">
                        {topStudents.map((rc) => (
                            <li key={rc.id} className="flex items-center justify-between px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-800">
                                        {rc.rank}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-ink-900">
                                            {rc.student?.first_name} {rc.student?.last_name}
                                        </p>
                                        <p className="text-xs text-ink-500">{rc.school_class?.name}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-ink-900">{Number(rc.average).toFixed(2)}/20</p>
                            </li>
                        ))}
                        {topStudents.length === 0 && <li className="px-5 py-8 text-center text-ink-400">Aucun bulletin généré.</li>}
                    </ul>
                </Card>

                <Card className="overflow-hidden">
                    <div className="border-b border-ink-100 p-5">
                        <h2 className="font-serif text-lg font-semibold text-ink-900">Performance par enseignant</h2>
                    </div>
                    <ul className="divide-y divide-ink-100">
                        {teacherPerformance.map((t, i) => (
                            <li key={i} className="flex items-center justify-between px-5 py-3">
                                <p className="text-sm font-medium text-ink-900">{t.teacher}</p>
                                <p className="text-sm text-ink-600">
                                    {t.average}/20 <span className="text-xs text-ink-400">({t.count} notes)</span>
                                </p>
                            </li>
                        ))}
                        {teacherPerformance.length === 0 && <li className="px-5 py-8 text-center text-ink-400">Aucune donnée disponible.</li>}
                    </ul>
                </Card>
            </div>
        </AdminLayout>
    );
}
