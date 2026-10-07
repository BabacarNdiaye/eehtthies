import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import StatusBadge from '@/Components/Admin/StatusBadge';
import useCompactChart, { axisLabel } from '@/hooks/useCompactChart';
import { visibleQuickActions } from '@/lib/adminNav';
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
    CalendarOff,
    CheckCircle2,
    ChevronRight,
    GraduationCap,
    LayoutDashboard,
    LucideIcon,
    Mail,
    Megaphone,
    Receipt,
    UserPlus,
    Users,
    UsersRound,
} from 'lucide-react';
import { Candidature, PageProps } from '@/types';

interface Todo {
    candidatures_to_review?: number;
    invoices_outstanding?: { count: number; amount: number };
    leave_pending?: number;
    messages_unread?: number;
}

interface Props {
    todo: Todo | [];
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

const fcfa = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;

/** Carte de chiffre clé : compacte sur téléphone (deux par ligne), aérée à partir de sm. */
function Kpi({ icon: Icon, label, value, tint }: { icon: LucideIcon; label: string; value: number | string; tint: string }) {
    return (
        <Card hoverable className="relative overflow-hidden p-3.5 sm:p-5">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-500/70 to-transparent" aria-hidden="true" />
            <div className="flex items-center gap-3 sm:gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 sm:h-12 sm:w-12 ${tint}`}>
                    <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className="font-serif text-2xl font-bold leading-none text-ink-900 sm:text-3xl">{value}</p>
                    <p className="mt-1 text-xs leading-tight text-ink-500 sm:text-sm">{label}</p>
                </div>
            </div>
        </Card>
    );
}

/** Une ligne du bloc « À traiter » : renvoie vers la page qui permet de traiter la demande. */
function TodoRow({ href, icon: Icon, label, value, tone }: { href: string; icon: LucideIcon; label: string; value: string; tone: string }) {
    return (
        <li>
            <Link
                href={href}
                className="flex min-h-14 items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500 sm:px-5"
            >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-ink-800">{label}</span>
                <span className="shrink-0 text-base font-bold text-ink-900">{value}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
            </Link>
        </li>
    );
}

export default function Dashboard({
    todo: todoProp,
    kpis,
    candidaturesByStatus,
    studentsPerFormation,
    monthlyCandidatures,
    latestNews,
    latestCandidatures,
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const compact = useCompactChart();
    // Un tableau PHP vide arrive en JavaScript sous forme de [] : on en fait un objet sans rien dedans.
    const todo: Todo = Array.isArray(todoProp) ? {} : todoProp;
    const statusData = Object.entries(candidaturesByStatus ?? {}).map(([status, total]) => ({
        status: statusLabels[status] ?? status,
        total,
    }));

    const firstName = auth.user?.name?.split(' ')[0] ?? '';
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const quickActions = visibleQuickActions(auth.permissions);

    const todoRows = [
        todo.invoices_outstanding && todo.invoices_outstanding.count > 0
            ? {
                  key: 'invoices',
                  href: route('admin.invoices.overdue'),
                  icon: Receipt,
                  label: `Facture${todo.invoices_outstanding.count > 1 ? 's' : ''} impayée${todo.invoices_outstanding.count > 1 ? 's' : ''} (${todo.invoices_outstanding.count})`,
                  value: fcfa(todo.invoices_outstanding.amount),
                  tone: 'bg-red-100 text-red-700',
              }
            : null,
        todo.candidatures_to_review
            ? {
                  key: 'candidatures',
                  href: route('admin.candidatures.index'),
                  icon: Megaphone,
                  label: `Candidature${todo.candidatures_to_review > 1 ? 's' : ''} à étudier`,
                  value: String(todo.candidatures_to_review),
                  tone: 'bg-amber-100 text-amber-800',
              }
            : null,
        todo.leave_pending
            ? {
                  key: 'leave',
                  href: route('admin.leave.index'),
                  icon: CalendarOff,
                  label: `Demande${todo.leave_pending > 1 ? 's' : ''} de congé à valider`,
                  value: String(todo.leave_pending),
                  tone: 'bg-purple-100 text-purple-700',
              }
            : null,
        todo.messages_unread
            ? {
                  key: 'messages',
                  href: route('admin.messages.index'),
                  icon: Mail,
                  label: `Message${todo.messages_unread > 1 ? 's' : ''} du site non lu${todo.messages_unread > 1 ? 's' : ''}`,
                  value: String(todo.messages_unread),
                  tone: 'bg-blue-100 text-blue-700',
              }
            : null,
    ].filter((row): row is NonNullable<typeof row> => row !== null);

    // Le bloc existe dès que le rôle a le droit de voir au moins une des familles : vide, il dit que tout est à jour.
    const hasTodo = Object.keys(todo).length > 0;
    const hasAnyKpi = Object.keys(kpis).length > 0;
    const hasAnyContent =
        hasTodo || quickActions.length > 0 || hasAnyKpi || candidaturesByStatus || studentsPerFormation || monthlyCandidatures || latestNews || latestCandidatures;

    return (
        <AdminLayout>
            <Head title="Tableau de bord" />

            <header className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-6 text-white shadow-elevated sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />
                <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-gold-300">{today}</p>
                <h1 className="relative mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">
                    Bonjour{firstName ? ` ${firstName}` : ''}
                </h1>
                <p className="relative mt-2 max-w-2xl text-sm text-ink-200 sm:text-base">Tableau de bord — vue d’ensemble de l’activité de l’EEHT de Thiès.</p>
            </header>

            {!hasAnyContent && (
                <Card className="flex flex-col items-center gap-3 p-12 text-center">
                    <LayoutDashboard className="h-10 w-10 text-ink-300" aria-hidden="true" />
                    <p className="font-medium text-ink-700">Bienvenue, {firstName}.</p>
                    <p className="max-w-sm text-sm text-ink-500">
                        Utilisez le menu pour accéder aux modules auxquels vous avez accès.
                    </p>
                </Card>
            )}

            {(hasTodo || quickActions.length > 0) && (
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
                    {hasTodo && (
                        <Card className={`overflow-hidden ${quickActions.length > 0 ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
                            <h2 className="flex items-center gap-2 border-b border-ink-100 px-4 py-3.5 font-serif text-lg font-bold text-ink-900 sm:px-5">
                                <span className="h-4 w-1 rounded-full bg-gold-500" aria-hidden="true" />
                                À traiter
                            </h2>
                            {todoRows.length > 0 ? (
                                <ul className="divide-y divide-ink-100">
                                    {todoRows.map((row) => (
                                        <TodoRow key={row.key} href={row.href} icon={row.icon} label={row.label} value={row.value} tone={row.tone} />
                                    ))}
                                </ul>
                            ) : (
                                <p className="flex items-center gap-3 px-4 py-6 text-sm text-ink-700 sm:px-5">
                                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
                                    Rien à traiter pour le moment : tout est à jour.
                                </p>
                            )}
                        </Card>
                    )}

                    {quickActions.length > 0 && (
                        <Card className={`p-4 sm:p-5 ${hasTodo ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
                            <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                                <span className="h-4 w-1 rounded-full bg-gold-500" aria-hidden="true" />
                                Actions rapides
                            </h2>
                            <ul className="grid grid-cols-2 gap-2.5">
                                {quickActions.map((action) => (
                                    <li key={action.href}>
                                        <Link
                                            href={route(action.href)}
                                            className="flex min-h-12 items-center gap-2.5 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2 text-sm font-medium text-ink-800 outline-none transition-colors hover:border-gold-300 hover:bg-gold-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                                        >
                                            <action.icon className="h-[18px] w-[18px] shrink-0 text-gold-700" aria-hidden="true" />
                                            <span className="min-w-0 leading-tight">{action.label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            )}

            {hasAnyKpi && (
                <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
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
                        <Card className="p-4 sm:p-5">
                            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                                <span className="h-4 w-1 rounded-full bg-gold-500" aria-hidden="true" />
                                Candidatures — 6 derniers mois
                            </h2>
                            <ResponsiveContainer width="100%" height={compact ? 210 : 260}>
                                <LineChart data={monthlyCandidatures} margin={compact ? { left: -20, right: 8 } : undefined}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                    <XAxis dataKey="month" tick={{ fontSize: compact ? 10 : 12 }} stroke="#6c86a3" interval={compact ? 1 : 0} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="total" stroke="#c8942a" strokeWidth={2.5} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    )}

                    {studentsPerFormation && (
                        <Card className="p-4 sm:p-5">
                            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                                <span className="h-4 w-1 rounded-full bg-gold-500" aria-hidden="true" />
                                Élèves par formation
                            </h2>
                            <ResponsiveContainer width="100%" height={compact ? Math.max(210, studentsPerFormation.length * 34) : 260}>
                                <BarChart data={studentsPerFormation} layout="vertical" margin={{ left: compact ? 0 : 20, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={compact ? 100 : 140}
                                        tickFormatter={(value) => axisLabel(value, compact, 16)}
                                        tick={{ fontSize: 11 }}
                                        stroke="#6c86a3"
                                    />
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
                    <Card className="p-4 sm:p-5">
                        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                            <span className="h-4 w-1 rounded-full bg-gold-500" aria-hidden="true" />
                            Répartition des candidatures par statut
                        </h2>
                        <ResponsiveContainer width="100%" height={compact ? Math.max(200, statusData.length * 36) : 220}>
                            {compact ? (
                                <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                    <YAxis type="category" dataKey="status" width={110} tick={{ fontSize: 11 }} stroke="#6c86a3" />
                                    <Tooltip />
                                    <Bar dataKey="total" fill="#c8942a" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            ) : (
                                <BarChart data={statusData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                                    <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#6c86a3" interval={0} angle={-15} textAnchor="end" height={60} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                                    <Tooltip />
                                    <Bar dataKey="total" fill="#c8942a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {(latestCandidatures || latestNews) && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {latestCandidatures && (
                        <Card>
                            <div className="flex items-center justify-between border-b border-ink-100 p-4 sm:p-5">
                                <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                                    <span className="h-4 w-1 rounded-full bg-gold-500" aria-hidden="true" />
                                    Dernières candidatures
                                </h2>
                                <Link href={route('admin.candidatures.index')} className="text-sm font-medium text-gold-700 hover:underline">
                                    Voir tout
                                </Link>
                            </div>
                            <ul className="divide-y divide-ink-100">
                                {latestCandidatures.map((c) => (
                                    <li key={c.id}>
                                        <Link
                                            href={route('admin.candidatures.show', c.id)}
                                            className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 outline-none hover:bg-ink-50 focus-visible:bg-ink-50 sm:px-5"
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-medium text-ink-900">
                                                    {c.first_name} {c.last_name}
                                                </span>
                                                <span className="block truncate text-xs text-ink-500">{c.formation?.name}</span>
                                            </span>
                                            <StatusBadge status={c.status} label={statusLabels[c.status]} />
                                        </Link>
                                    </li>
                                ))}
                                {latestCandidatures.length === 0 && (
                                    <li className="px-5 py-6 text-center text-sm text-ink-500">Aucune candidature pour le moment.</li>
                                )}
                            </ul>
                        </Card>
                    )}

                    {latestNews && (
                        <Card>
                            <div className="flex items-center justify-between border-b border-ink-100 p-4 sm:p-5">
                                <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                                    <span className="h-4 w-1 rounded-full bg-gold-500" aria-hidden="true" />
                                    Dernières actualités
                                </h2>
                                <Link href={route('admin.news.index')} className="text-sm font-medium text-gold-700 hover:underline">
                                    Voir tout
                                </Link>
                            </div>
                            <ul className="divide-y divide-ink-100">
                                {latestNews.map((n) => (
                                    <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                                        <p className="min-w-0 text-sm font-medium text-ink-900">{n.title}</p>
                                        <span className={`shrink-0 text-xs font-medium ${n.is_published ? 'text-emerald-700' : 'text-ink-500'}`}>
                                            {n.is_published ? 'Publié' : 'Brouillon'}
                                        </span>
                                    </li>
                                ))}
                                {latestNews.length === 0 && (
                                    <li className="px-5 py-6 text-center text-sm text-ink-500">Aucun article pour le moment.</li>
                                )}
                            </ul>
                        </Card>
                    )}
                </div>
            )}
        </AdminLayout>
    );
}
