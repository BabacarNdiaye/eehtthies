import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Head, Link } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, LogIn, UserCheck, UserX } from 'lucide-react';

interface Props {
    daily: { day: string; total: number }[];
    byRole: { name: string; total: number }[];
    totalUsers: number;
    activeUsers30d: number;
    neverLoggedIn: number;
    logins30d: number;
    recent: {
        id: number;
        ip_address?: string | null;
        created_at: string;
        user?: { id: number; name: string } | null;
    }[];
}

function Tabs() {
    return (
        <div className="mb-6 flex flex-wrap gap-2">
            <Link href={route('admin.statistics.academic')} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
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
            <Link href={route('admin.statistics.traffic')} className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white">
                Trafic
            </Link>
        </div>
    );
}

export default function Traffic({ daily, byRole, totalUsers, activeUsers30d, neverLoggedIn, logins30d, recent }: Props) {
    return (
        <AdminLayout>
            <Head title="Trafic" />
            <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">Statistiques & pilotage</h1>
            <p className="mb-4 text-sm text-ink-500">
                Utilisation de la plateforme : connexions au fil du temps, par profil.
            </p>
            <Tabs />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <LogIn className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{logins30d}</p>
                            <p className="text-sm text-ink-500">Connexions (30j)</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{activeUsers30d}</p>
                            <p className="text-sm text-ink-500">Comptes actifs (30j)</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-100 text-gold-800">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{totalUsers}</p>
                            <p className="text-sm text-ink-500">Comptes au total</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-red-700">
                            <UserX className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{neverLoggedIn}</p>
                            <p className="text-sm text-ink-500">Jamais connectés</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Connexions (30 derniers jours)</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6c86a3" interval={3} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip />
                            <Line type="monotone" dataKey="total" name="Connexions" stroke="#c8942a" strokeWidth={2.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Comptes actifs par profil (30j)</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={byRole}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6c86a3" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip />
                            <Bar dataKey="total" fill="#243a52" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">Dernières connexions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Utilisateur</th>
                                <th className="px-5 py-3">Adresse IP</th>
                                <th className="px-5 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {recent.map((r) => (
                                <tr key={r.id}>
                                    <td className="px-5 py-3 font-medium text-ink-900">{r.user?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-500">{r.ip_address ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-500">
                                        {new Date(r.created_at).toLocaleString('fr-FR')}
                                    </td>
                                </tr>
                            ))}
                            {recent.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-5 py-10 text-center text-sm text-ink-500">
                                        Aucune connexion enregistrée pour le moment.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
