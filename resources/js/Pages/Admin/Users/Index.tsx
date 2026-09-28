import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import ExportButtons from '@/Components/Admin/ExportButtons';
import { Select, TextInput } from '@/Components/Admin/Field';
import { Paginated, PageProps, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Pencil, Search, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';

type UserRow = User & { roles: { id: number; name: string }[] };

interface Props {
    users: Paginated<UserRow>;
    roles: string[];
    filters: { role?: string; search?: string };
}

export default function Index({ users, roles, filters }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [search, setSearch] = useState(filters.search ?? '');

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.users.index'),
            { search, role: filters.role ?? '', ...overrides },
            { preserveState: true, replace: true },
        );
    };

    const destroy = (user: UserRow) => {
        if (confirm(`Supprimer "${user.name}" du personnel ? Cette action est irréversible.`)) {
            router.delete(route('admin.users.destroy', user.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Personnel administratif" />
            <PageHeader
                title="Personnel administratif"
                subtitle="Gérez les comptes, fonctions et rôles du personnel administratif de l'école."
                action={{ label: 'Nouveau membre', href: route('admin.users.create') }}
            >
                <ExportButtons csvHref={route('admin.users.export.csv')} pdfHref={route('admin.users.export.pdf')} />
            </PageHeader>

            <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <TextInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                        placeholder="Rechercher un nom, e-mail ou fonction..."
                        className="pl-9"
                    />
                </div>
                <Select value={filters.role ?? ''} onChange={(e) => applyFilters({ role: e.target.value })} className="sm:w-56">
                    <option value="">Tous les rôles</option>
                    {roles.map((role) => (
                        <option key={role} value={role}>
                            {role}
                        </option>
                    ))}
                </Select>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Membre</th>
                                <th className="px-5 py-3">Fonction</th>
                                <th className="px-5 py-3">Rôles</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {users.data.map((u) => {
                                const isSelf = auth.user?.id === u.id;
                                return (
                                    <tr key={u.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100">
                                                    {u.avatar ? (
                                                        <img
                                                            src={`/storage/${u.avatar}`}
                                                            alt={u.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <UserRound className="h-5 w-5 text-ink-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-ink-900">
                                                        {u.name}
                                                        {isSelf && (
                                                            <span className="ml-2 text-xs font-normal text-ink-400">(vous)</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-ink-500">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">
                                            {u.position ?? '—'}
                                            {u.department && (
                                                <span className="block text-xs text-ink-400">{u.department}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {u.roles.length > 0 ? (
                                                    u.roles.map((r) => (
                                                        <span
                                                            key={r.id}
                                                            className="inline-flex rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
                                                        >
                                                            {r.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-ink-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    u.is_active
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-ink-100 text-ink-500'
                                                }`}
                                            >
                                                {u.is_active ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={route('admin.users.edit', u.id)}
                                                    className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                                {!isSelf && (
                                                    <button
                                                        onClick={() => destroy(u)}
                                                        className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <UserRound className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun membre du personnel trouvé.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={users} />
            </Card>
        </AdminLayout>
    );
}
