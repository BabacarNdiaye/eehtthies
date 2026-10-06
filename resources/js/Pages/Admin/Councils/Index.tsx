import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Select } from '@/Components/Admin/Field';
import { IconLink } from '@/Components/Admin/IconButton';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import CouncilStatusBadge from '@/Components/Council/CouncilStatusBadge';
import { Paginated } from '@/types';
import { Head, router, Link } from '@inertiajs/react';

import { Eye, Inbox } from 'lucide-react';

interface CouncilRow {
    id: number;
    class: string | null;
    formation: string | null;
    term: string;
    year: string | null;
    scheduled_at: string | null;
    president: string | null;
    status: string;
    status_label: string;
    is_end_of_year: boolean;
    students_count: number;
    red_count: number;
    orange_count: number;
}

interface Filters {
    year: number | null;
    term: string;
    formation_id: number | null;
    school_class_id: number | null;
    status: string;
    group: string;
}

interface Props {
    councils: Paginated<CouncilRow>;
    counts: Record<'upcoming' | 'ongoing' | 'pending' | 'closed', number>;
    filters: Filters;
    years: { id: number; label: string }[];
    terms: string[];
    formations: { id: number; name: string }[];
    classes: { id: number; name: string; formation_id: number }[];
    statuses: Record<string, string>;
    canCreate: boolean;
}

const GROUPS = [
    { key: 'upcoming', label: 'À venir' },
    { key: 'ongoing', label: 'En cours' },
    { key: 'pending', label: 'À valider' },
    { key: 'closed', label: 'Clôturés' },
] as const;

const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date à fixer';

export default function Index({ councils, counts, filters, years, terms, formations, classes, statuses, canCreate }: Props) {
    const go = (overrides: Partial<Filters>) => {
        const next = { ...filters, ...overrides };
        router.get(
            route('admin.councils.index'),
            { year: next.year ?? '', ...Object.fromEntries(Object.entries(next).filter(([key, value]) => key !== 'year' && value !== '' && value !== null)) },
            { preserveState: true, replace: true },
        );
    };

    const visibleClasses = classes.filter((item) => !filters.formation_id || item.formation_id === filters.formation_id);
    const filtered = filters.term !== '' || filters.formation_id || filters.school_class_id || filters.status !== '' || filters.group !== '';

    return (
        <AdminLayout>
            <Head title="Conseils de classe" />
            <PageHeader
                title="Conseils de classe"
                subtitle="Préparation, séance, procès-verbal et suivi des décisions, classe par classe."
                action={canCreate ? { label: 'Nouveau conseil', href: route('admin.councils.create') } : undefined}
            >
                {canCreate && (
                    <Link href={route('admin.council-sittings.create')} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                        Séance commune (plusieurs classes)
                    </Link>
                )}
            </PageHeader>

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {GROUPS.map(({ key, label }) => {
                    const active = filters.group === key;

                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => go({ group: active ? '' : key, status: '' })}
                            className={`rounded-xl border p-4 text-left shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                active ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-100 bg-white hover:shadow-elevated'
                            }`}
                        >
                            <span className={`block text-sm ${active ? 'text-ink-100' : 'text-ink-500'}`}>{label}</span>
                            <span className="block font-serif text-3xl font-bold">{counts[key]}</span>
                        </button>
                    );
                })}
            </div>

            <Card className="mb-6 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <Select aria-label="Année scolaire" value={filters.year ?? ''} onChange={(e) => go({ year: e.target.value ? Number(e.target.value) : null, school_class_id: null })}>
                    <option value="">Toutes les années</option>
                    {years.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.label}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Période" value={filters.term} onChange={(e) => go({ term: e.target.value })}>
                    <option value="">Toutes les périodes</option>
                    {terms.map((term) => (
                        <option key={term} value={term}>
                            {term}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Formation" value={filters.formation_id ?? ''} onChange={(e) => go({ formation_id: e.target.value ? Number(e.target.value) : null, school_class_id: null })}>
                    <option value="">Toutes les formations</option>
                    {formations.map((formation) => (
                        <option key={formation.id} value={formation.id}>
                            {formation.name}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Classe" value={filters.school_class_id ?? ''} onChange={(e) => go({ school_class_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Toutes les classes</option>
                    {visibleClasses.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Statut" value={filters.status} onChange={(e) => go({ status: e.target.value, group: '' })}>
                    <option value="">Tous les statuts</option>
                    {Object.entries(statuses).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Période</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Président</th>
                                <th className="px-5 py-3">Élèves</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {councils.data.map((council) => (
                                <tr key={council.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">
                                        {council.class}
                                        <p className="text-xs font-normal text-ink-500">{council.formation}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {council.term} · {council.year}
                                        {council.is_end_of_year && <p className="text-xs text-ink-500">Fin d’année</p>}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{when(council.scheduled_at)}</td>
                                    <td className="px-5 py-3 text-ink-600">{council.president ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {council.students_count}
                                        {(council.red_count > 0 || council.orange_count > 0) && (
                                            <p className="text-xs text-ink-500">
                                                {council.red_count > 0 && <span className="font-medium text-red-700">{council.red_count} en attention</span>}
                                                {council.red_count > 0 && council.orange_count > 0 && ' · '}
                                                {council.orange_count > 0 && <span className="font-medium text-amber-800">{council.orange_count} en vigilance</span>}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <CouncilStatusBadge status={council.status} label={council.status_label} />
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end">
                                            <IconLink href={route('admin.councils.show', council.id)} label={`Ouvrir le conseil de ${council.class}`}>
                                                <Eye className="h-4 w-4" />
                                            </IconLink>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {councils.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">{filtered ? 'Aucun conseil ne correspond à ces critères.' : 'Aucun conseil pour cette année.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={councils} />
            </Card>
        </AdminLayout>
    );
}
