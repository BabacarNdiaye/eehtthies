import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import StatisticsTabs from '@/Components/Admin/StatisticsTabs';
import { Head } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Globe, LogIn, UserCheck, UserX } from 'lucide-react';

interface Visitors {
    total: number;
    unique: number;
    byCountry: { name: string; total: number; visitors: number }[];
    byRegion: { country: string; region: string; total: number }[];
    topPages: { path: string; total: number }[];
    recent: { id: number; ip_address?: string | null; country?: string | null; region?: string | null; city?: string | null; path: string; created_at: string }[];
}

interface Props {
    visitors: Visitors;
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


export default function Traffic({ visitors, daily, byRole, totalUsers, activeUsers30d, neverLoggedIn, logins30d, recent }: Props) {
    return (
        <AdminLayout>
            <Head title="Trafic" />
            <PageHeader title="Statistiques & pilotage" subtitle="Utilisation de la plateforme : connexions au fil du temps, par profil." />
            <StatisticsTabs current="traffic" />

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

            <div className="mb-3 flex items-center gap-2">
                <Globe className="h-5 w-5 text-gold-800" />
                <h2 className="font-serif text-xl font-semibold text-ink-900">Visiteurs du site public (30 jours)</h2>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-4">
                <Card className="p-5">
                    <p className="text-xl font-bold text-ink-900">{visitors.total}</p>
                    <p className="text-sm text-ink-500">Pages vues</p>
                </Card>
                <Card className="p-5">
                    <p className="text-xl font-bold text-ink-900">{visitors.unique}</p>
                    <p className="text-sm text-ink-500">Visiteurs uniques (par adresse IP)</p>
                </Card>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="overflow-hidden">
                    <div className="border-b border-ink-100 p-5"><h3 className="font-serif text-lg font-semibold text-ink-900">Par pays</h3></div>
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-ink-100">
                            {visitors.byCountry.map((c) => (
                                <tr key={c.name}>
                                    <td className="px-5 py-3 font-medium text-ink-900">{c.name}</td>
                                    <td className="px-5 py-3 text-right text-ink-500">{c.visitors} visiteur(s) · {c.total} vue(s)</td>
                                </tr>
                            ))}
                            {visitors.byCountry.length === 0 && (
                                <tr><td className="px-5 py-8 text-center text-ink-500">Aucune visite enregistrée.</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
                <Card className="overflow-hidden">
                    <div className="border-b border-ink-100 p-5"><h3 className="font-serif text-lg font-semibold text-ink-900">Par région</h3></div>
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-ink-100">
                            {visitors.byRegion.map((r) => (
                                <tr key={`${r.country}-${r.region}`}>
                                    <td className="px-5 py-3 font-medium text-ink-900">{r.region} <span className="font-normal text-ink-500">({r.country})</span></td>
                                    <td className="px-5 py-3 text-right text-ink-500">{r.total}</td>
                                </tr>
                            ))}
                            {visitors.byRegion.length === 0 && (
                                <tr><td className="px-5 py-8 text-center text-ink-500">Aucune visite enregistrée.</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
                <Card className="overflow-hidden">
                    <div className="border-b border-ink-100 p-5"><h3 className="font-serif text-lg font-semibold text-ink-900">Pages les plus vues</h3></div>
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-ink-100">
                            {visitors.topPages.map((p) => (
                                <tr key={p.path}>
                                    <td className="px-5 py-3 font-medium text-ink-900">{p.path}</td>
                                    <td className="px-5 py-3 text-right text-ink-500">{p.total}</td>
                                </tr>
                            ))}
                            {visitors.topPages.length === 0 && (
                                <tr><td className="px-5 py-8 text-center text-ink-500">Aucune visite enregistrée.</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            </div>

            <Card className="mb-6 overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                    <h3 className="font-serif text-lg font-semibold text-ink-900">Dernières visites du site</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Pays</th>
                                <th className="px-5 py-3">Région</th>
                                <th className="px-5 py-3">Ville</th>
                                <th className="px-5 py-3">Page</th>
                                <th className="px-5 py-3">Adresse IP</th>
                                <th className="px-5 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {visitors.recent.map((v) => (
                                <tr key={v.id}>
                                    <td className="px-5 py-3 font-medium text-ink-900">{v.country ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-500">{v.region ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-500">{v.city ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-500">{v.path}</td>
                                    <td className="px-5 py-3 text-ink-500">{v.ip_address ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-500">{new Date(v.created_at).toLocaleString('fr-FR')}</td>
                                </tr>
                            ))}
                            {visitors.recent.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-500">
                                        Aucune visite du site public enregistrée pour le moment.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

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
