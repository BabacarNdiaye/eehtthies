import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import StatusBadge from '@/Components/Admin/StatusBadge';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    AlertCircle,
    GraduationCap,
    LayoutDashboard,
    Mail,
    UserPlus,
    Users,
    UsersRound,
} from 'lucide-react';
import { Candidature, PageProps } from '@/types';

interface Props {
    kpis: {
        students?: number;
        new_students_30d?: number;
        candidatures_received?: number;
        candidatures_pending?: number;
        teachers_active?: number;
        unread_messages?: number;
    };
    candidaturesByStatus: Record<string, number> | null;
    studentsPerFormation: { name: string; total: number }[] | null;
    monthlyCandidatures: { month: string; total: number }[] | null;
    latestNews: { id: number; title: string; is_published: boolean }[] | null;
    latestCandidatures: Candidature[] | null;
}

const statusLabels: Record<string, string> = {
    brouillon: 'Brouillon',
    soumise: 'Soumise',
    en_cours_etude: "En cours d'étude",
    dossier_incomplet: 'Dossier incomplet',
    preselectionnee: 'Présélectionnée',
    acceptee: 'Acceptée',
    refusee: 'Refusée',
    inscription_finalisee: 'Inscription finalisée',
};

function Kpi({
    icon: Icon,
    label,
    value,
    tint,
}: {
    icon: typeof Users;
    label: string;
    value: number | string;
    tint: string;
}) {
    return (
        <Card className="p-5">
            <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tint}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-ink-900">{value}</p>
                    <p className="text-sm text-ink-500">{label}</p>
                </div>
            </div>
        </Card>
    );
}

export default function Dashboard({
    kpis,
    candidaturesByStatus,
    studentsPerFormation,
    monthlyCandidatures,
    latestNews,
    latestCandidatures,
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const statusData = Object.entries(candidaturesByStatus ?? {}).map(([status, total]) => ({
        status: statusLabels[status] ?? status,
        total,
    }));

    const hasAnyKpi = Object.keys(kpis).length > 0;
    const hasAnyContent =
        hasAnyKpi || candidaturesByStatus || studentsPerFormation || monthlyCandidatures || latestNews || latestCandidatures;

    return (
        <AdminLayout>
            <Head title="Tableau de bord" />

            <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">
                Tableau de bord
            </h1>
            <p className="mb-6 text-sm text-ink-500">
                Vue d'ensemble de l'activité de l'EEHT de Thiès.
            </p>

            {!hasAnyContent && (
                <Card className="flex flex-col items-center gap-3 p-12 text-center">
                    <LayoutDashboard className="h-10 w-10 text-ink-300" />
                    <p className="font-medium text-ink-700">Bienvenue, {auth.user?.name?.split(' ')[0]}.</p>
                    <p className="max-w-sm text-sm text-ink-500">
                        Utilisez le menu à gauche pour accéder aux modules auxquels vous avez accès.
                    </p>
                </Card>
            )}

            {hasAnyKpi && (
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {kpis.students !== undefined && (
                        <Kpi icon={Users} label="Élèves actifs" value={kpis.students} tint="bg-blue-100 text-blue-700" />
                    )}
                    {kpis.new_students_30d !== undefined && (
                        <Kpi icon={UserPlus} label="Nouveaux élèves (30j)" value={kpis.new_students_30d} tint="bg-emerald-100 text-emerald-700" />
                    )}
                    {kpis.candidatures_received !== undefined && (
                        <Kpi icon={GraduationCap} label="Candidatures reçues" value={kpis.candidatures_received} tint="bg-gold-100 text-gold-800" />
                    )}
                    {kpis.candidatures_pending !== undefined && (
                        <Kpi icon={AlertCircle} label="Candidatures en attente" value={kpis.candidatures_pending} tint="bg-amber-100 text-amber-700" />
                    )}
                    {kpis.teachers_active !== undefined && (
                        <Kpi icon={UsersRound} label="Enseignants actifs" value={kpis.teachers_active} tint="bg-purple-100 text-purple-700" />
                    )}
                    {kpis.unread_messages !== undefined && (
                        <Kpi icon={Mail} label="Messages non lus" value={kpis.unread_messages} tint="bg-red-100 text-red-700" />
                    )}
                </div>
            )}

            {(monthlyCandidatures || studentsPerFormation) && (
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {monthlyCandidatures && (
                        <Card className="p-5">
                            <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">
                                Candidatures — 6 derniers mois
                            </h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={monthlyCandidatures}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="total" stroke="#c8942a" strokeWidth={2.5} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    )}

                    {studentsPerFormation && (
                        <Card className="p-5">
                            <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">
                                Élèves par formation
                            </h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={studentsPerFormation} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} stroke="#6c86a3" />
                                    <Tooltip />
                                    <Bar dataKey="total" fill="#243a52" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    )}
                </div>
            )}

            {candidaturesByStatus && (
                <div className="mb-6">
                    <Card className="p-5">
                        <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">
                            Répartition des candidatures par statut
                        </h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#6c86a3" interval={0} angle={-15} textAnchor="end" height={60} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                <Tooltip />
                                <Bar dataKey="total" fill="#c8942a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {(latestCandidatures || latestNews) && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {latestCandidatures && (
                        <Card>
                            <div className="flex items-center justify-between border-b border-ink-100 p-5">
                                <h2 className="font-serif text-lg font-semibold text-ink-900">
                                    Dernières candidatures
                                </h2>
                                <Link href={route('admin.candidatures.index')} className="text-sm font-medium text-gold-700 hover:underline">
                                    Voir tout
                                </Link>
                            </div>
                            <ul className="divide-y divide-ink-100">
                                {latestCandidatures.map((c) => (
                                    <li key={c.id} className="flex items-center justify-between px-5 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-ink-900">
                                                {c.first_name} {c.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{c.formation?.name}</p>
                                        </div>
                                        <StatusBadge status={c.status} label={statusLabels[c.status]} />
                                    </li>
                                ))}
                                {latestCandidatures.length === 0 && (
                                    <li className="px-5 py-6 text-center text-sm text-ink-400">Aucune candidature pour le moment.</li>
                                )}
                            </ul>
                        </Card>
                    )}

                    {latestNews && (
                        <Card>
                            <div className="flex items-center justify-between border-b border-ink-100 p-5">
                                <h2 className="font-serif text-lg font-semibold text-ink-900">
                                    Dernières actualités
                                </h2>
                                <Link href={route('admin.news.index')} className="text-sm font-medium text-gold-700 hover:underline">
                                    Voir tout
                                </Link>
                            </div>
                            <ul className="divide-y divide-ink-100">
                                {latestNews.map((n) => (
                                    <li key={n.id} className="flex items-center justify-between px-5 py-3">
                                        <p className="text-sm font-medium text-ink-900">{n.title}</p>
                                        <span className={`text-xs font-medium ${n.is_published ? 'text-emerald-600' : 'text-ink-400'}`}>
                                            {n.is_published ? 'Publié' : 'Brouillon'}
                                        </span>
                                    </li>
                                ))}
                                {latestNews.length === 0 && (
                                    <li className="px-5 py-6 text-center text-sm text-ink-400">Aucun article pour le moment.</li>
                                )}
                            </ul>
                        </Card>
                    )}
                </div>
            )}
        </AdminLayout>
    );
}
