import Card from '@/Components/Admin/Card';
import { Select } from '@/Components/Admin/Field';
import { SearchField } from '@/Components/Admin/FilterBar';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Clock, RotateCcw, UserX, Users, Wifi } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type PresenceState = 'online' | 'recent' | 'offline' | 'never' | 'no_account';

interface Row {
    id: number;
    name: string;
    matricule: string;
    class: string | null;
    formation: string | null;
    last_seen_at: string | null;
    state: PresenceState;
}

interface Filters {
    state: 'online' | 'recent' | 'all' | 'no_account';
    formation_id: number | null;
    school_class_id: number | null;
    q: string;
}

interface Props {
    students: Paginated<Row>;
    counts: { online: number; recent: number; with_account: number; without_account: number };
    filters: Filters;
    formations: { id: number; name: string }[];
    classes: { id: number; name: string; formation_id: number }[];
    minutes: { online: number; recent: number };
    serverTime: string;
}

/** Délai entre deux rafraîchissements automatiques de la liste. */
const REFRESH_MS = 20_000;

const initialsOf = (name: string) =>
    name
        .split(/[\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

/** « à l'instant », « il y a 7 min », « il y a 3 h », « le 12 oct. » : calculé sur l'heure du serveur, pas du poste. */
function ago(iso: string | null, serverTime: string, tick: number): string {
    if (!iso) return 'Jamais connecté';

    const seconds = Math.max(0, Math.round((new Date(serverTime).getTime() + tick - new Date(iso).getTime()) / 1000));

    if (seconds < 60) return 'à l’instant';
    if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86_400) return `il y a ${Math.floor(seconds / 3600)} h`;

    return `le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

function PresenceBadge({ state }: { state: PresenceState }) {
    if (state === 'online') {
        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                En ligne
            </span>
        );
    }

    const tone = state === 'recent' ? 'bg-amber-50 text-amber-800 ring-amber-600/20' : 'bg-ink-50 text-ink-600 ring-ink-500/20';
    const dot = state === 'recent' ? 'bg-amber-400' : 'bg-ink-300';
    const label = { recent: 'Actif récemment', offline: 'Hors ligne', never: 'Jamais connecté', no_account: 'Sans compte' }[state];

    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}>
            <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
            {label}
        </span>
    );
}

/** « Élèves en ligne » : qui est connecté à l'application, avec mise à jour automatique toutes les 20 secondes. */
export default function Online({ students, counts, filters, formations, classes, minutes, serverTime }: Props) {
    const [search, setSearch] = useState(filters.q);
    const [tick, setTick] = useState(0);
    const loaded = useRef(Date.now());

    const go = (overrides: Partial<Filters>) => {
        const next = { ...filters, q: search, ...overrides };
        router.get(
            route('admin.students.online'),
            Object.fromEntries(Object.entries(next).filter(([, value]) => value !== '' && value !== null)),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Rafraîchissement automatique : seules les données de la page sont rechargées, jamais la coque ; on s'arrête
    // quand l'onglet est caché pour ne pas solliciter le serveur (ni garder l'administrateur « en ligne » pour rien).
    useEffect(() => {
        loaded.current = Date.now();
        setTick(0);
        const timer = window.setInterval(() => {
            if (document.hidden) return;
            router.reload({ only: ['students', 'counts', 'serverTime'] });
        }, REFRESH_MS);
        const clock = window.setInterval(() => setTick(Date.now() - loaded.current), 15_000);

        return () => {
            window.clearInterval(timer);
            window.clearInterval(clock);
        };
    }, [serverTime]);

    // La saisie lance la recherche une demi-seconde après la dernière frappe.
    useEffect(() => {
        if (search === filters.q) return;
        const timer = window.setTimeout(() => go({ q: search }), 500);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const visibleClasses = classes.filter((item) => !filters.formation_id || item.formation_id === filters.formation_id);
    const filtered = filters.formation_id !== null || filters.school_class_id !== null || filters.q !== '';

    const tiles = [
        { key: 'online' as const, label: 'En ligne maintenant', value: counts.online, hint: `actifs depuis moins de ${minutes.online} min`, icon: Wifi, tone: 'text-emerald-700', accent: 'bg-emerald-500' },
        { key: 'recent' as const, label: 'Actifs récemment', value: counts.recent, hint: `depuis moins de ${minutes.recent} min`, icon: Clock, tone: 'text-amber-700', accent: 'bg-amber-400' },
        { key: 'all' as const, label: 'Avec un compte', value: counts.with_account, hint: 'peuvent se connecter', icon: Users, tone: 'text-ink-900', accent: 'bg-ink-300' },
        { key: 'no_account' as const, label: 'Sans compte', value: counts.without_account, hint: 'ne peuvent pas apparaître', icon: UserX, tone: 'text-ink-900', accent: 'bg-ink-300' },
    ];

    return (
        <AdminLayout>
            <Head title="Élèves en ligne" />
            <PageHeader title="Élèves en ligne" subtitle="Qui est connecté à l’application en ce moment. La liste se met à jour toute seule toutes les 20 secondes." />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map(({ key, label, value, hint, icon: Icon, tone, accent }) => {
                    const active = filters.state === key;

                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => go({ state: key })}
                            className={`group relative overflow-hidden rounded-2xl border p-4 text-left outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                active ? 'border-ink-900 bg-ink-900 text-white shadow-elevated' : 'border-ink-100 bg-white shadow-soft hover:-translate-y-0.5 hover:shadow-elevated'
                            }`}
                        >
                            <span className={`absolute inset-x-0 top-0 h-0.5 ${active ? 'bg-gold-500' : accent}`} aria-hidden="true" />
                            <span className="flex items-start justify-between gap-2">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${active ? 'text-gold-300' : 'text-ink-500'}`}>{label}</span>
                                <Icon className={`h-4 w-4 ${active ? 'text-gold-300' : 'text-ink-400'}`} aria-hidden="true" />
                            </span>
                            <span className={`mt-2 block font-serif text-4xl font-bold leading-none ${active ? 'text-white' : tone}`}>{value}</span>
                            <span className={`mt-2 block text-xs ${active ? 'text-ink-200' : 'text-ink-500'}`}>{hint}</span>
                        </button>
                    );
                })}
            </div>

            <Card className="mb-6 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève ou un matricule" />
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
                </div>
                {filtered && (
                    <div className="mt-3 flex items-center justify-end border-t border-ink-100 pt-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                go({ q: '', formation_id: null, school_class_id: null });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-600 outline-none transition hover:bg-ink-50 hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-gold-500"
                        >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Réinitialiser
                        </button>
                    </div>
                )}
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-ink-100 bg-ink-50/80 text-xs uppercase tracking-wider text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Présence</th>
                                <th className="px-5 py-3">Dernière activité</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {students.data.map((student) => (
                                <tr key={student.id}>
                                    <td className="px-5 py-3">
                                        <Link href={route('admin.students.edit', student.id)} className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
                                            <span
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                                    student.state === 'online' ? 'bg-emerald-600 text-white ring-2 ring-emerald-200' : 'bg-ink-900 text-gold-300'
                                                }`}
                                                aria-hidden="true"
                                            >
                                                {initialsOf(student.name)}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block font-medium text-ink-900">{student.name}</span>
                                                <span className="block text-xs text-ink-500">{student.matricule}</span>
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3 text-ink-700">
                                        {student.class ?? '—'}
                                        {student.formation && <span className="block text-xs text-ink-500">{student.formation}</span>}
                                    </td>
                                    <td className="px-5 py-3">
                                        <PresenceBadge state={student.state} />
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{student.state === 'no_account' ? '—' : ago(student.last_seen_at, serverTime, tick)}</td>
                                </tr>
                            ))}
                            {students.data.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-ink-500">
                                        {filters.state === 'online'
                                            ? 'Aucun élève en ligne pour le moment.'
                                            : filters.state === 'recent'
                                              ? `Aucun élève actif depuis moins de ${minutes.recent} minutes.`
                                              : 'Aucun élève ne correspond à ces critères.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={students} />
            </Card>
        </AdminLayout>
    );
}
