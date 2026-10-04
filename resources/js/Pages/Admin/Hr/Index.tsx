import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Head, Link } from '@inertiajs/react';
import { Users, UsersRound, Building2, Wallet, CheckCircle2, XCircle, Network, Coins, ShieldCheck, ChevronRight } from 'lucide-react';

interface DirectoryEntry {
    id: string;
    name: string;
    photo: string | null;
    role: string;
    detail: string;
    email: string | null;
    phone: string | null;
    active: boolean;
    editUrl: string;
}

interface Props {
    directory: DirectoryEntry[];
    summary: {
        total: number;
        adminStaff: number;
        teachers: number;
        active: number;
        inactive: number;
        departmentsCount: number;
        monthlyPayroll: number;
        paidThisMonth: number;
    };
}

const fcfa = (v: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} FCFA`;

const quickLinks = [
    { label: 'Personnel administratif', href: 'admin.users.index', icon: Users, description: 'Comptes, fonctions et rattachement hiérarchique' },
    { label: 'Enseignants', href: 'admin.teachers.index', icon: UsersRound, description: 'Spécialités, matières et classes assignées' },
    { label: 'Salaires', href: 'admin.salaries.index', icon: Coins, description: 'Paiements mensuels et export comptable' },
    { label: 'Organigramme', href: 'admin.org-chart.index', icon: Network, description: 'Hiérarchie du personnel administratif' },
    { label: 'Rôles & permissions', href: 'admin.roles.index', icon: ShieldCheck, description: "Droits d'accès par rôle" },
];

export default function Index({ directory, summary }: Props) {
    return (
        <AdminLayout>
            <Head title="Ressources humaines" />
            <PageHeader
                title="Ressources humaines"
                subtitle="Vue d'ensemble de tout le personnel de l'établissement — administratif et enseignant."
            />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{summary.total}</p>
                            <p className="text-sm text-ink-500">Effectif total</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <UsersRound className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{summary.teachers}</p>
                            <p className="text-sm text-ink-500">Enseignants ({summary.adminStaff} administratif)</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{fcfa(summary.monthlyPayroll)}</p>
                            <p className="text-sm text-ink-500">Masse salariale / mois</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-100 text-gold-800">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{summary.departmentsCount}</p>
                            <p className="text-sm text-ink-500">Services / départements</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
                {quickLinks.map((q) => (
                    <Link
                        key={q.label}
                        href={route(q.href)}
                        className="group flex flex-col gap-2 rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:border-ink-300 hover:shadow-md"
                    >
                        <q.icon className="h-5 w-5 text-gold-700" />
                        <span className="flex items-center gap-1 text-sm font-semibold text-ink-900">
                            {q.label}
                            <ChevronRight className="h-3.5 w-3.5 text-ink-300 transition group-hover:translate-x-0.5" />
                        </span>
                        <span className="text-xs text-ink-500">{q.description}</span>
                    </Link>
                ))}
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">Annuaire du personnel</h2>
                    <p className="mt-1 text-xs text-ink-500">
                        {summary.active} actif(s), {summary.inactive} inactif(s) — personnel administratif et enseignants réunis.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Nom</th>
                                <th className="px-5 py-3">Rôle</th>
                                <th className="px-5 py-3">Fonction / spécialité</th>
                                <th className="px-5 py-3">Contact</th>
                                <th className="px-5 py-3">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {directory.map((person) => (
                                <tr key={person.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <Link href={person.editUrl} className="flex items-center gap-3 font-medium text-ink-900 hover:underline">
                                            {person.photo ? (
                                                <img src={`/storage/${person.photo}`} alt={person.name} className="h-8 w-8 rounded-full object-cover" />
                                            ) : (
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-500">
                                                    {person.name.charAt(0)}
                                                </span>
                                            )}
                                            {person.name}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{person.role}</td>
                                    <td className="px-5 py-3 text-ink-600">{person.detail}</td>
                                    <td className="px-5 py-3 text-ink-500">
                                        {person.email ?? '—'}
                                        {person.phone ? ` · ${person.phone}` : ''}
                                    </td>
                                    <td className="px-5 py-3">
                                        {person.active ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Actif
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-500">
                                                <XCircle className="h-3.5 w-3.5" /> Inactif
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {directory.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Users className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun membre du personnel enregistré.</p>
                                        </div>
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
