import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import StatusBadge from '@/Components/Admin/StatusBadge';
import { Select, TextInput } from '@/Components/Admin/Field';
import { Candidature, Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Inbox, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    candidatures: Paginated<Candidature>;
    formations: { id: number; name: string }[];
    statuses: Record<string, string>;
    filters: {
        status?: string;
        formation_id?: string | number;
        search?: string;
    };
}

export default function Index({
    candidatures,
    formations,
    statuses,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const isFirstRender = useRef(true);

    const applyFilters = (overrides: Record<string, string> = {}) => {
        router.get(
            route('admin.candidatures.index'),
            {
                search,
                status: filters.status ?? '',
                formation_id: filters.formation_id ?? '',
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timeout = setTimeout(() => {
            applyFilters({ search });
        }, 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <AdminLayout>
            <Head title="Candidatures" />
            <PageHeader
                title="Candidatures"
                subtitle="Suivez et traitez les candidatures reçues en ligne."
            />

            <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <TextInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un candidat, une référence, un e-mail..."
                        className="pl-9"
                    />
                </div>
                <Select
                    value={filters.status ?? ''}
                    onChange={(e) =>
                        applyFilters({ status: e.target.value })
                    }
                    className="sm:w-56"
                >
                    <option value="">Tous les statuts</option>
                    {Object.entries(statuses).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
                <Select
                    value={filters.formation_id ?? ''}
                    onChange={(e) =>
                        applyFilters({ formation_id: e.target.value })
                    }
                    className="sm:w-56"
                >
                    <option value="">Toutes les formations</option>
                    {formations.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </Select>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Candidat</th>
                                <th className="px-5 py-3">Formation</th>
                                <th className="px-5 py-3">Contact</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3">Soumise le</th>
                                <th className="px-5 py-3 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {candidatures.data.map((c) => (
                                <tr key={c.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">
                                            {c.first_name} {c.last_name}
                                        </p>
                                        <p className="text-xs text-ink-500">
                                            {c.reference}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {c.formation?.name ?? '—'}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        <p>{c.phone}</p>
                                        <p className="text-xs text-ink-400">
                                            {c.email}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3">
                                        <StatusBadge
                                            status={c.status}
                                            label={statuses[c.status]}
                                        />
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {c.submitted_at
                                            ? new Date(
                                                  c.submitted_at,
                                              ).toLocaleDateString('fr-FR')
                                            : new Date(
                                                  c.created_at,
                                              ).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end">
                                            <Link
                                                href={route(
                                                    'admin.candidatures.show',
                                                    c.id,
                                                )}
                                                className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {candidatures.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-5 py-10 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune candidature trouvée.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={candidatures} />
            </Card>
        </AdminLayout>
    );
}
