import Card from '@/Components/Admin/Card';
import { Select } from '@/Components/Admin/Field';
import { SearchField } from '@/Components/Admin/FilterBar';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Clock, LayoutGrid, List, Loader2, RotateCcw, UserX, Users, Wifi } from 'lucide-react';
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
    byClass: { name: string; online: number }[];
    filters: Filters;
    formations: { id: number; name: string }[];
    classes: { id: number; name: string; formation_id: number }[];
    minutes: { online: number; recent: number };
    serverTime: string;
}

/** Délai entre deux rafraîchissements automatiques de la liste. */
const REFRESH_MS = 3_000;

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

/** « Élèves en ligne » : qui est connecté à l'application, avec mise à jour automatique (REFRESH_MS, 3 secondes). */
export default function Online({ students, counts, byClass, filters, formations, classes, minutes, serverTime }: Props) {
    const [search, setSearch] = useState(filters.q);
    const [tick, setTick] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [view, setView] = useState<'cards' | 'list'>(() => {
        try {
            return window.localStorage.getItem('eeht.students-online.view') === 'list' ? 'list' : 'cards';
        } catch {
            return 'cards';
        }
    });
    const chooseView = (next: 'cards' | 'list') => {
        setView(next);
        try {
            window.localStorage.setItem('eeht.students-online.view', next);
        } catch {
            /* préférence d'affichage : sans stockage, elle ne dure que le temps de la page */
        }
    };
    const loaded = useRef(Date.now());
    const spinner = useRef<number | undefined>(undefined);

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
            router.reload({
                only: ['students', 'counts', 'byClass', 'serverTime'],
                // L'indicateur n'apparaît que si le rechargement traîne : à ce rythme, il clignoterait sans arrêt.
                onStart: () => {
                    spinner.current = window.setTimeout(() => setRefreshing(true), 700);
                },
                onFinish: () => {
                    window.clearTimeout(spinner.current);
                    setRefreshing(false);
                },
            });
        }, REFRESH_MS);
        const clock = window.setInterval(() => setTick(Date.now() - loaded.current), 1_000);

        return () => {
            window.clearInterval(timer);
            window.clearInterval(clock);
            window.clearTimeout(spinner.current);
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
    const emptyText =
        filters.state === 'online'
            ? 'Aucun élève en ligne pour le moment.'
            : filters.state === 'recent'
              ? `Aucun élève actif depuis moins de ${minutes.recent} minutes.`
              : 'Aucun élève ne correspond à ces critères.';
    const percent = counts.with_account > 0 ? Math.round((counts.online / counts.with_account) * 100) : 0;
    const topClass = Math.max(1, ...byClass.map((item) => item.online));
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
            <PageHeader title="Élèves en ligne" subtitle={`Qui est connecté à l’application en ce moment. La liste se met à jour toute seule toutes les ${REFRESH_MS / 1000} secondes.`} />

            <section aria-label="Aperçu en direct" className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-6 text-white shadow-elevated sm:p-8">
                <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />

                <div className="relative flex flex-wrap items-center gap-x-10 gap-y-6">
                    <div className="relative h-32 w-32 shrink-0" role="img" aria-label={`${percent} % des élèves avec un compte sont en ligne`}>
                        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="9" className="stroke-white/10" />
                            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(percent / 100) * 326.7} 326.7`} className="stroke-emerald-400 transition-all duration-700" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-serif text-3xl font-bold leading-none">{percent}%</span>
                            <span className="mt-1 text-[10px] uppercase tracking-widest text-ink-300">connectés</span>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 basis-60">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                            <span className="relative flex h-2 w-2" aria-hidden="true">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            En direct
                        </p>
                        <p className="mt-2 font-serif text-5xl font-bold leading-none sm:text-6xl">
                            {counts.online}
                            <span className="ml-3 text-xl font-normal text-ink-200 sm:text-2xl">élève{counts.online > 1 ? 's' : ''} en ligne</span>
                        </p>
                        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-300">
                            <span>sur {counts.with_account} avec un compte</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1.5">
                                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
                                Mis à jour à {new Date(serverTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </p>
                    </div>

                    {byClass.length > 0 && (
                        <div className="min-w-[14rem] basis-72">
                            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">Classes les plus connectées</h2>
                            <ul className="space-y-1.5">
                                {byClass.slice(0, 5).map((item) => (
                                    <li key={item.name} className="grid grid-cols-[minmax(0,1fr)_5rem_1.5rem] items-center gap-2 text-sm">
                                        <span className="truncate text-ink-100">{item.name}</span>
                                        <span className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                                            <span className="block h-full rounded-full bg-emerald-400" style={{ width: `${(item.online / topClass) * 100}%` }} />
                                        </span>
                                        <span className="text-right font-semibold tabular-nums">{item.online}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </section>

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

            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm text-ink-500">
                    {students.total} élève{students.total > 1 ? 's' : ''}
                </p>
                <div role="group" aria-label="Affichage" className="inline-flex rounded-xl bg-ink-100/70 p-1">
                    {(
                        [
                            ['cards', 'Cartes', LayoutGrid],
                            ['list', 'Liste', List],
                        ] as const
                    ).map(([key, label, Icon]) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={view === key}
                            onClick={() => chooseView(key)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${view === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                        >
                            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'cards' ? (
                students.data.length === 0 ? (
                    <Card className="px-6 py-14 text-center text-sm text-ink-500">{emptyText}</Card>
                ) : (
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {students.data.map((student) => (
                            <li key={student.id}>
                                <Link
                                    href={route('admin.students.edit', student.id)}
                                    className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-white p-4 shadow-soft outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                        student.state === 'online' ? 'border-emerald-200' : 'border-ink-100'
                                    }`}
                                >
                                    <span className={`absolute inset-y-0 left-0 w-1 ${student.state === 'online' ? 'bg-emerald-500' : student.state === 'recent' ? 'bg-amber-400' : 'bg-ink-200'}`} aria-hidden="true" />
                                    <span className="relative shrink-0">
                                        <span
                                            className={`flex h-14 w-14 items-center justify-center rounded-2xl font-serif text-lg font-bold ${
                                                student.state === 'online' ? 'bg-emerald-600 text-white' : 'bg-ink-900 text-gold-300'
                                            }`}
                                            aria-hidden="true"
                                        >
                                            {initialsOf(student.name)}
                                        </span>
                                        {student.state === 'online' && (
                                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4" aria-hidden="true">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                                <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
                                            </span>
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-ink-900">{student.name}</span>
                                        <span className="block truncate text-xs text-ink-500">
                                            {student.class ?? '—'}
                                            {student.formation && student.formation !== student.class && ` · ${student.formation}`}
                                        </span>
                                        <span className="mt-2 flex flex-wrap items-center gap-2">
                                            <PresenceBadge state={student.state} />
                                            {student.state !== 'no_account' && <span className="text-xs text-ink-500">{ago(student.last_seen_at, serverTime, tick)}</span>}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )
            ) : (
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
                                        {student.formation && student.formation !== student.class && <span className="block text-xs text-ink-500">{student.formation}</span>}
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
                                        {emptyText}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            )}

            {students.last_page > 1 && (
                <Card className="mt-4 overflow-hidden">
                    <Pagination data={students} />
                </Card>
            )}
        </AdminLayout>
    );
}
