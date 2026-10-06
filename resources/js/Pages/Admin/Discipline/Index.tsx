import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import ExportButtons from '@/Components/Admin/ExportButtons';
import FilterBar, { SearchField } from '@/Components/Admin/FilterBar';
import { Select, TextInput } from '@/Components/Admin/Field';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import LevelBadge from '@/Components/Discipline/LevelBadge';
import { confirmAction } from '@/lib/confirm';
import { PageProps, Paginated } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Inbox, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DisciplineRow {
    id: number;
    occurred_on: string;
    level: string;
    level_label: string;
    reason: string;
    days: number | null;
    student: { id: number; name: string; matricule: string } | null;
    school_class: { id: number; name: string } | null;
    recorded_by_name: string | null;
}

interface Filters {
    q: string;
    school_class_id: number | null;
    level: string;
    from: string;
    to: string;
}

interface Props {
    records: Paginated<DisciplineRow>;
    filters: Filters;
    classes: { id: number; name: string; label: string }[];
    levels: Record<string, string>;
    summary: { total: number; by_level: Record<string, number> };
}

const day = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');

export default function Index({ records, filters, classes, levels, summary }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canCreate = permissions.includes('ajouter_discipline');
    const canEdit = permissions.includes('modifier_discipline');
    const canDelete = permissions.includes('supprimer_discipline');
    const canExport = permissions.includes('exporter_discipline');

    const [search, setSearch] = useState(filters.q);

    const query = (overrides: Partial<Filters>) =>
        Object.fromEntries(Object.entries({ ...filters, ...overrides }).filter(([, value]) => value !== '' && value !== null));

    const go = (overrides: Partial<Filters>) =>
        router.get(route('admin.discipline.index'), query(overrides), { preserveState: true, replace: true });

    useEffect(() => {
        if (search === filters.q) return;
        const timeout = window.setTimeout(() => go({ q: search }), 300);

        return () => window.clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const activeCount = [filters.school_class_id, filters.level, filters.from, filters.to].filter(Boolean).length;
    const filtered = activeCount > 0 || filters.q !== '';

    const destroy = async (record: DisciplineRow) => {
        const who = record.student?.name ?? 'cet élève';
        if (await confirmAction(`Supprimer la sanction « ${record.level_label} » de ${who} ? Cette action est irréversible.`)) {
            router.delete(route('admin.discipline.destroy', record.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Discipline" />
            <PageHeader
                title="Discipline"
                subtitle="Registre des sanctions de la vie scolaire. Le conseil de classe le lit pour éclairer la situation de chaque élève."
                action={canCreate ? { label: 'Nouvelle sanction', href: route('admin.discipline.create') } : undefined}
            >
                {canExport && <ExportButtons csvHref={route('admin.discipline.export.csv', query({}))} />}
            </PageHeader>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Card className="p-4">
                    <p className="text-sm text-ink-500">Sanctions</p>
                    <p className="font-serif text-3xl font-bold text-ink-900">{summary.total}</p>
                </Card>
                {Object.entries(levels).map(([key, label]) => {
                    const active = filters.level === key;

                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => go({ level: active ? '' : key })}
                            className={`rounded-xl border p-4 text-left shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                active ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-100 bg-white hover:shadow-elevated'
                            }`}
                        >
                            <span className={`block text-sm ${active ? 'text-ink-100' : 'text-ink-500'}`}>{label}</span>
                            <span className="block font-serif text-3xl font-bold">{summary.by_level[key] ?? 0}</span>
                        </button>
                    );
                })}
            </div>

            <FilterBar
                activeCount={activeCount}
                search={<SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève ou un matricule" />}
            >
                <Select aria-label="Filtrer par classe" value={filters.school_class_id ?? ''} onChange={(e) => go({ school_class_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Toutes les classes</option>
                    {classes.map((schoolClass) => (
                        <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.label}
                        </option>
                    ))}
                </Select>
                <TextInput type="date" aria-label="Faits depuis le" value={filters.from} onChange={(e) => go({ from: e.target.value })} />
                <TextInput type="date" aria-label="Faits jusqu'au" value={filters.to} onChange={(e) => go({ to: e.target.value })} />
            </FilterBar>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Niveau</th>
                                <th className="px-5 py-3">Motif</th>
                                <th className="px-5 py-3">Saisi par</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {records.data.map((record) => (
                                <tr key={record.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="whitespace-nowrap px-5 py-3 text-ink-600">{day(record.occurred_on)}</td>
                                    <td className="px-5 py-3 font-medium text-ink-900">
                                        {record.student?.name ?? '—'}
                                        <p className="text-xs font-normal text-ink-500">
                                            {record.student?.matricule}
                                            {record.school_class ? ` · ${record.school_class.name}` : ''}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3">
                                        <LevelBadge level={record.level} label={record.level_label} days={record.days} />
                                    </td>
                                    <td className="max-w-md px-5 py-3 text-ink-600">
                                        <p className="line-clamp-2">{record.reason}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-500">{record.recorded_by_name ?? '—'}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            {canEdit && (
                                                <IconLink href={route('admin.discipline.edit', record.id)} label="Modifier">
                                                    <Pencil className="h-4 w-4" />
                                                </IconLink>
                                            )}
                                            {canDelete && (
                                                <IconButton onClick={() => destroy(record)} label="Supprimer" tone="danger">
                                                    <Trash2 className="h-4 w-4" />
                                                </IconButton>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {records.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">{filtered ? 'Aucune sanction ne correspond à ces critères.' : 'Aucune sanction enregistrée pour le moment.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={records} />
            </Card>
        </AdminLayout>
    );
}
