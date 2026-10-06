import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Select } from '@/Components/Admin/Field';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import CouncilStatusBadge from '@/Components/Council/CouncilStatusBadge';
import { Paginated } from '@/types';
import { Head, router, Link } from '@inertiajs/react';

import { CalendarDays, CalendarClock, ChevronRight, ClipboardCheck, GraduationCap, Inbox, Lock, RotateCcw, UserRound, Users, Video } from 'lucide-react';
import { CouncilTabs } from '@/Components/Admin/ClusterTabs';

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
    { key: 'upcoming', label: 'À venir', hint: 'Programmés et brouillons', icon: CalendarClock },
    { key: 'ongoing', label: 'En cours', hint: 'Séance ouverte ou PV en rédaction', icon: Video },
    { key: 'pending', label: 'À valider', hint: 'Procès-verbal à approuver', icon: ClipboardCheck },
    { key: 'closed', label: 'Clôturés', hint: 'Verrouillés, consultables', icon: Lock },
] as const;

/** Couleur du liseré de chaque état (App\Models\Council::STATUSES). */
const ACCENTS: Record<string, string> = {
    draft: 'bg-ink-300',
    scheduled: 'bg-sky-500',
    in_session: 'bg-violet-500',
    drafting_minutes: 'bg-amber-500',
    pending_validation: 'bg-orange-500',
    closed: 'bg-emerald-500',
};

const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date à fixer';

const initials = (name: string | null) =>
    (name ?? '?')
        .split(/[\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

/** Répartition des élèves : une barre rouge / orange / vert, lisible aussi en texte pour les lecteurs d'écran. */
function Distribution({ total, red, orange }: { total: number; red: number; orange: number }) {
    const green = Math.max(0, total - red - orange);
    const pct = (value: number) => (total > 0 ? (value / total) * 100 : 0);

    return (
        <div className="w-full shrink-0 sm:w-48">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <Users className="h-4 w-4 text-ink-400" aria-hidden="true" />
                {total} élève{total > 1 ? 's' : ''}
            </p>
            {total > 0 && (
                <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                    <span className="bg-red-500" style={{ width: `${pct(red)}%` }} />
                    <span className="bg-amber-400" style={{ width: `${pct(orange)}%` }} />
                    <span className="bg-emerald-500" style={{ width: `${pct(green)}%` }} />
                </div>
            )}
            <p className="mt-1 text-xs text-ink-500">
                {red === 0 && orange === 0 ? (
                    'Aucune alerte'
                ) : (
                    <>
                        {red > 0 && <span className="font-medium text-red-700">{red} en attention</span>}
                        {red > 0 && orange > 0 && ' · '}
                        {orange > 0 && <span className="font-medium text-amber-800">{orange} en vigilance</span>}
                    </>
                )}
            </p>
        </div>
    );
}

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
                    <Link href={route('admin.council-sittings.create')} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-ink-300 hover:bg-ink-50">
                        Séance commune (plusieurs classes)
                    </Link>
                )}
            </PageHeader>
            <CouncilTabs current="councils" />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {GROUPS.map(({ key, label, hint, icon: Icon }) => {
                    const active = filters.group === key;

                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => go({ group: active ? '' : key, status: '' })}
                            className={`group relative overflow-hidden rounded-2xl border p-4 text-left outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                active ? 'border-ink-900 bg-ink-900 text-white shadow-elevated' : 'border-ink-100 bg-white shadow-soft hover:-translate-y-0.5 hover:shadow-elevated'
                            }`}
                        >
                            <span className={`absolute inset-x-0 top-0 h-0.5 ${active ? 'bg-gold-500' : 'bg-transparent group-hover:bg-gold-400'}`} aria-hidden="true" />
                            <span className="flex items-start justify-between gap-2">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${active ? 'text-gold-300' : 'text-ink-500'}`}>{label}</span>
                                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-white/10 text-gold-300' : 'bg-ink-50 text-ink-500 group-hover:text-gold-600'}`}>
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                            </span>
                            <span className="mt-2 block font-serif text-4xl font-bold leading-none">{counts[key]}</span>
                            <span className={`mt-2 block text-xs ${active ? 'text-ink-200' : 'text-ink-500'}`}>{hint}</span>
                        </button>
                    );
                })}
            </div>

            <Card className="mb-6 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                </div>
                {filtered && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-100 pt-3 text-sm">
                        <p className="text-ink-500">
                            {councils.total} conseil{councils.total > 1 ? 's' : ''} correspond{councils.total > 1 ? 'ent' : ''} à ces critères.
                        </p>
                        <button
                            type="button"
                            onClick={() => go({ term: '', formation_id: null, school_class_id: null, status: '', group: '' })}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-ink-600 outline-none transition hover:bg-ink-50 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-gold-500"
                        >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            Réinitialiser
                        </button>
                    </div>
                )}
            </Card>

            {councils.data.length === 0 ? (
                <Card className="px-6 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-ink-500">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-50 text-ink-400">
                            <Inbox className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <p className="font-serif text-lg font-semibold text-ink-800">{filtered ? 'Aucun résultat' : 'Aucun conseil pour le moment'}</p>
                        <p className="text-sm">{filtered ? 'Aucun conseil ne correspond à ces critères.' : 'Aucun conseil pour cette année.'}</p>
                    </div>
                </Card>
            ) : (
                <ul className="space-y-3">
                    {councils.data.map((council) => (
                        <li key={council.id}>
                            <div className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-ink-100 bg-white p-4 pl-6 shadow-soft transition duration-200 focus-within:ring-2 focus-within:ring-gold-500 hover:-translate-y-0.5 hover:shadow-elevated sm:flex-row sm:items-center sm:gap-6 sm:p-5 sm:pl-7">
                                <span className={`absolute inset-y-0 left-0 w-1.5 ${ACCENTS[council.status] ?? ACCENTS.draft}`} aria-hidden="true" />

                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-900 font-serif text-base font-bold text-gold-300 ring-1 ring-gold-500/30" aria-hidden="true">
                                        {initials(council.class)}
                                    </span>
                                    <div className="min-w-0">
                                        <Link href={route('admin.councils.show', council.id)} aria-label={`Ouvrir le conseil de ${council.class}`} className="rounded font-serif text-lg font-bold leading-tight text-ink-900 outline-none after:absolute after:inset-0 after:content-['']">
                                            {council.class}
                                        </Link>
                                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-500">
                                            <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                            {council.formation ?? 'Sans formation'}
                                        </p>
                                        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                                            <div className="flex items-center gap-1.5">
                                                <dt className="sr-only">Date</dt>
                                                <CalendarDays className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                                                <dd>{when(council.scheduled_at)}</dd>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <dt className="sr-only">Période</dt>
                                                <dd>
                                                    {council.term} · {council.year}
                                                    {council.is_end_of_year && <span className="ml-1.5 rounded bg-gold-100 px-1.5 py-0.5 font-medium text-gold-800">Fin d’année</span>}
                                                </dd>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <dt className="sr-only">Président</dt>
                                                <UserRound className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                                                <dd>{council.president ?? 'Président à désigner'}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>

                                <Distribution total={council.students_count} red={council.red_count} orange={council.orange_count} />

                                <div className="flex items-center justify-between gap-3 sm:justify-end">
                                    <CouncilStatusBadge status={council.status} label={council.status_label} />
                                    <ChevronRight className="h-5 w-5 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-gold-600" aria-hidden="true" />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {councils.last_page > 1 && (
                <Card className="mt-4 overflow-hidden">
                    <Pagination data={councils} />
                </Card>
            )}
        </AdminLayout>
    );
}
