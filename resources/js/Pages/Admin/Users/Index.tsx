import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FilterBar, { SearchField } from '@/Components/Admin/FilterBar';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import ExportButtons from '@/Components/Admin/ExportButtons';
import { Select } from '@/Components/Admin/Field';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Paginated, PageProps, User } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router, usePage } from '@inertiajs/react';
import { Pencil, Trash2, UserRound } from 'lucide-react';
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

    const destroy = async (user: UserRow) => {
        if (await confirmAction(`Supprimer "${user.name}" du personnel ? Cette action est irréversible.`)) {
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

            <FilterBar
                search={
                    <SearchField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                        placeholder="Rechercher un nom, e-mail ou fonction..."
                    />
                }
                activeCount={[filters.role].filter(Boolean).length}
            >
                <Select aria-label="Filtrer par rôle" value={filters.role ?? ''} onChange={(e) => applyFilters({ role: e.target.value })}>
                    <option value="">Tous les rôles</option>
                    {roles.map((role) => (
                        <option key={role} value={role}>
                            {role}
                        </option>
                    ))}
                </Select>
            </FilterBar>

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
                                                            <span className="ml-2 text-xs font-normal text-ink-500">(vous)</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-ink-500">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">
                                            {u.position ?? '—'}
                                            {u.department && (
                                                <span className="block text-xs text-ink-500">{u.department}</span>
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
                                                    <span className="text-ink-500">—</span>
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
                                                <IconLink
                                                    href={route('admin.users.edit', u.id)}
                                                    label="Modifier"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </IconLink>
                                                {!isSelf && (
                                                    <IconButton
                                                        onClick={() => destroy(u)}
                                                        label="Supprimer"
                                                        tone="danger"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </IconButton>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
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
