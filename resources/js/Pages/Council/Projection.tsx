import { Head } from '@inertiajs/react';
import { Clock, Gavel, TrendingDown, TrendingUp, UserX, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProjectedStudent {
    name: string;
    average: number | null;
    rank: number | null;
    class_size: number | null;
    progression: number | null;
    groups: { label: string; average: number | null; qualitative?: boolean }[];
    subjects: { name: string; moy20: number | null }[];
    attendance: { unjustified_hours: number; justified_hours: number; late_count: number };
    general_appreciation: string | null;
    appreciations?: { subject: string | null; appreciation: string }[];
    decisions: string[];
}

interface State {
    version: number;
    changed: boolean;
    status?: string;
    student?: ProjectedStudent | null;
    summary?: { count: number; average: number | null; pass_rate: number | null; min: number | null; max: number | null };
}

const fr = (value: number | null | undefined, digits = 2) => (value === null || value === undefined ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: digits }));

const initialsOf = (name: string) =>
    name
        .split(/[\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

/** Horloge de la salle : l'heure se lit de loin pendant les débats. */
function useClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 15_000);
        return () => window.clearInterval(timer);
    }, []);

    return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Jauge de la moyenne sur 20 : l'anneau se remplit, la valeur reste écrite au centre (rouge sous 10, or dessous de 14). */
function Gauge({ value }: { value: number | null }) {
    const ratio = value === null ? 0 : Math.max(0, Math.min(1, value / 20));
    const tone = value === null ? 'stroke-white/20' : value < 10 ? 'stroke-red-400' : value >= 14 ? 'stroke-emerald-400' : 'stroke-gold-400';
    const text = value !== null && value < 10 ? 'text-red-300' : 'text-white';
    const circumference = 2 * Math.PI * 52;

    return (
        <div className="relative aspect-square w-[clamp(9rem,min(16vw,28vh),19rem)] shrink-0" role="img" aria-label={`Moyenne : ${fr(value)} sur 20`}>
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-white/10" />
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${ratio * circumference} ${circumference}`} className={`${tone} transition-all duration-1000 ease-out`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-serif text-[clamp(2.4rem,min(5.6vw,9.5vh),6.5rem)] font-bold leading-none ${text}`}>{fr(value)}</span>
                <span className="mt-1 text-[clamp(0.9rem,1.2vw,1.4rem)] uppercase tracking-[0.25em] text-ink-300">sur 20</span>
            </div>
        </div>
    );
}

/** Barre d'une matière sur 20, avec le repère de la moyenne (10) : lisible depuis le fond de la salle. */
function SubjectBar({ name, value }: { name: string; value: number | null }) {
    const low = value !== null && value < 10;

    return (
        <li className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_auto] items-center gap-4">
            <span className="text-[clamp(1.05rem,min(1.5vw,2.8vh),1.9rem)] leading-tight text-ink-100">{name}</span>
            <span className="relative h-3 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <span className={`absolute inset-y-0 left-0 rounded-full ${low ? 'bg-red-400' : 'bg-gradient-to-r from-gold-500 to-gold-300'}`} style={{ width: `${value === null ? 0 : Math.max(2, Math.min(100, (value / 20) * 100))}%` }} />
                <span className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
            </span>
            <span className={`w-[4.5ch] text-right font-serif text-[clamp(1.2rem,min(1.8vw,3.4vh),2.3rem)] font-bold tabular-nums ${low ? 'text-red-300' : 'text-white'}`}>{fr(value)}</span>
        </li>
    );
}

/**
 * Vue projetée (E06) : l'écran de la salle suit l'élève affiché par le président en interrogeant le serveur toutes les
 * 3 secondes. Elle ne reçoit QUE des données publiables (CouncilPresenter::projection) ; texte de 20 px au moins.
 */
export default function Projection({ council, state: initial }: { council: { id: number; class: string | null; term: string }; state: State }) {
    const [state, setState] = useState<State>(initial);
    const [connected, setConnected] = useState(true);
    const version = useRef(initial.version);
    const clock = useClock();

    useEffect(() => {
        const poll = async () => {
            try {
                const { data } = await window.axios.get<State>(route('council.projection.state', council.id), { params: { since: version.current } });
                setConnected(true);
                if (data.changed) {
                    version.current = data.version;
                    setState(data);
                }
            } catch {
                setConnected(false);
            }
        };
        const timer = window.setInterval(poll, 3000);
        return () => window.clearInterval(timer);
    }, [council.id]);

    const student = state.student ?? null;
    const live = state.status === 'in_session';

    return (
        <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-950 text-white">
            <Head title={`Projection — ${council.class ?? ''}`} />
            <div className="pointer-events-none absolute -right-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-gold-500/10 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-52 -left-40 h-[36rem] w-[36rem] rounded-full bg-brand-500/10 blur-3xl" aria-hidden="true" />

            {/* Annonce pour les lecteurs d'écran quand l'élève affiché change. */}
            <p role="status" aria-live="polite" className="sr-only">
                {student ? `Élève affiché : ${student.name}` : 'Aucun élève affiché'}
            </p>

            <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-[clamp(1.5rem,3vw,4rem)] py-[clamp(0.9rem,1.6vw,1.8rem)]">
                <div className="flex items-center gap-4">
                    <span className="flex h-[clamp(2.6rem,3.4vw,4rem)] w-[clamp(2.6rem,3.4vw,4rem)] items-center justify-center rounded-xl bg-gold-500 font-serif text-[clamp(1.1rem,1.6vw,1.9rem)] font-bold text-ink-950" aria-hidden="true">
                        E
                    </span>
                    <div>
                        <p className="text-[clamp(0.8rem,1vw,1.15rem)] font-semibold uppercase tracking-[0.3em] text-gold-300">Conseil de classe</p>
                        <p className="font-serif text-[clamp(1.4rem,2.2vw,2.6rem)] font-bold leading-tight">
                            {council.class} <span className="font-normal text-ink-300">· {council.term}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[clamp(1rem,1.4vw,1.6rem)]">
                    {!connected && (
                        <span role="alert" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-white">
                            <WifiOff className="h-5 w-5" aria-hidden="true" /> Connexion perdue — nouvel essai…
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${live ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-ink-200'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${live ? 'animate-pulse bg-emerald-400' : 'bg-ink-400'}`} aria-hidden="true" />
                        {live ? 'En séance' : 'Hors séance'}
                    </span>
                    <span className="inline-flex items-center gap-2 tabular-nums text-ink-100">
                        <Clock className="h-[1.1em] w-[1.1em] text-gold-300" aria-hidden="true" /> {clock}
                    </span>
                </div>
            </header>

            {student ? (
                <div key={student.name} className="relative z-10 grid flex-1 animate-fade-in-up gap-[clamp(1.5rem,2.5vw,3.5rem)] px-[clamp(1.5rem,3vw,4rem)] py-[clamp(1.2rem,2.2vw,3rem)] xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                    <section className="min-w-0" aria-label="Résultats de l’élève">
                        <div className="flex items-center gap-[clamp(1rem,1.6vw,2rem)]">
                            <span className="flex h-[clamp(3.5rem,min(5.5vw,10vh),7.5rem)] w-[clamp(3.5rem,min(5.5vw,10vh),7.5rem)] shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 font-serif text-[clamp(1.6rem,2.6vw,3.2rem)] font-bold text-ink-950 shadow-elevated" aria-hidden="true">
                                {initialsOf(student.name)}
                            </span>
                            <h1 className="min-w-0 font-serif text-[clamp(2.2rem,min(5vw,9vh),6rem)] font-bold leading-[1.05]">{student.name}</h1>
                        </div>

                        <div className="mt-[clamp(0.8rem,min(2vw,3vh),3rem)] flex flex-wrap items-center gap-[clamp(1.5rem,3vw,4rem)]">
                            <Gauge value={student.average} />
                            <dl className="grid grid-cols-2 gap-[clamp(1.5rem,3vw,4rem)]">
                                <div>
                                    <dt className="text-[clamp(0.9rem,1.2vw,1.4rem)] uppercase tracking-[0.2em] text-ink-300">Rang</dt>
                                    <dd className="font-serif text-[clamp(2.2rem,min(4.8vw,8.5vh),5.5rem)] font-bold leading-none">
                                        {student.rank ?? '—'}
                                        {student.rank && <span className="ml-2 text-[0.4em] font-normal text-ink-300">/ {student.class_size}</span>}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[clamp(0.9rem,1.2vw,1.4rem)] uppercase tracking-[0.2em] text-ink-300">Progression</dt>
                                    <dd
                                        className={`flex items-center gap-2 font-serif text-[clamp(2.2rem,min(4.8vw,8.5vh),5.5rem)] font-bold leading-none ${student.progression === null ? '' : student.progression < 0 ? 'text-red-300' : 'text-emerald-300'}`}
                                    >
                                        {student.progression !== null && (student.progression < 0 ? <TrendingDown className="h-[0.8em] w-[0.8em]" aria-hidden="true" /> : <TrendingUp className="h-[0.8em] w-[0.8em]" aria-hidden="true" />)}
                                        {student.progression === null ? '—' : `${student.progression > 0 ? '+' : ''}${fr(student.progression)}`}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {student.groups.length > 0 && (
                            <ul className="mt-[clamp(0.8rem,min(1.6vw,2.5vh),2.5rem)] flex flex-wrap gap-3">
                                {student.groups.map((group) => (
                                    <li key={group.label} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-[clamp(0.95rem,min(1.3vw,2.4vh),1.6rem)]">
                                        <span className="text-ink-200">{group.label} : </span>
                                        <strong className="font-serif text-[1.15em]">{group.qualitative ? 'appréciation' : fr(group.average)}</strong>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {student.subjects.length > 0 && (
                            <div className="mt-[clamp(1.2rem,2vw,2.5rem)]">
                                <h2 className="mb-4 flex items-center gap-3 text-[clamp(0.9rem,1.1vw,1.3rem)] font-semibold uppercase tracking-[0.25em] text-gold-300">
                                    Moyennes par matière <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
                                </h2>
                                <ul className="grid gap-x-[clamp(1.5rem,3vw,4rem)] gap-y-[clamp(0.6rem,min(1.1vw,2vh),1.4rem)] xl:grid-cols-2">
                                    {student.subjects.map((subject) => (
                                        <SubjectBar key={subject.name} name={subject.name} value={subject.moy20} />
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>

                    <aside className="flex min-w-0 flex-col gap-[clamp(1rem,1.6vw,2rem)]" aria-label="Assiduité et décision">
                        <section className="rounded-3xl border border-white/10 bg-white/5 p-[clamp(1.2rem,2vw,2.4rem)] backdrop-blur">
                            <h2 className="mb-4 flex items-center gap-3 text-[clamp(0.9rem,1.1vw,1.3rem)] font-semibold uppercase tracking-[0.25em] text-gold-300">
                                <UserX className="h-[1.2em] w-[1.2em]" aria-hidden="true" /> Assiduité
                            </h2>
                            <dl className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <dd className={`font-serif text-[clamp(2rem,3.6vw,4rem)] font-bold leading-none ${student.attendance.unjustified_hours > 0 ? 'text-red-300' : ''}`}>{fr(student.attendance.unjustified_hours, 1)}<span className="text-[0.4em] font-normal"> h</span></dd>
                                    <dt className="mt-2 text-[clamp(0.85rem,1.05vw,1.2rem)] leading-tight text-ink-300">non justifiées</dt>
                                </div>
                                <div>
                                    <dd className="font-serif text-[clamp(2rem,3.6vw,4rem)] font-bold leading-none">{fr(student.attendance.justified_hours, 1)}<span className="text-[0.4em] font-normal"> h</span></dd>
                                    <dt className="mt-2 text-[clamp(0.85rem,1.05vw,1.2rem)] leading-tight text-ink-300">justifiées</dt>
                                </div>
                                <div>
                                    <dd className="font-serif text-[clamp(2rem,3.6vw,4rem)] font-bold leading-none">{student.attendance.late_count}</dd>
                                    <dt className="mt-2 text-[clamp(0.85rem,1.05vw,1.2rem)] leading-tight text-ink-300">retard(s)</dt>
                                </div>
                            </dl>
                        </section>

                        <section className={`rounded-3xl border p-[clamp(1.2rem,2vw,2.4rem)] ${student.decisions.length > 0 ? 'border-gold-400/50 bg-gradient-to-br from-gold-500/20 to-gold-500/5 shadow-elevated' : 'border-white/10 bg-white/5'}`}>
                            <h2 className="mb-4 flex items-center gap-3 text-[clamp(0.9rem,1.1vw,1.3rem)] font-semibold uppercase tracking-[0.25em] text-gold-300">
                                <Gavel className="h-[1.2em] w-[1.2em]" aria-hidden="true" /> Décision du conseil
                            </h2>
                            {student.decisions.length > 0 ? (
                                <ul className="space-y-2">
                                    {student.decisions.map((decision) => (
                                        <li key={decision} className="font-serif text-[clamp(1.5rem,2.6vw,3rem)] font-bold leading-tight">
                                            {decision}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="flex items-center gap-3 text-[clamp(1.2rem,1.8vw,2.1rem)] text-ink-200">
                                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold-400" aria-hidden="true" /> En délibération
                                </p>
                            )}
                            {student.general_appreciation && <p className="mt-5 whitespace-pre-line border-t border-white/10 pt-5 text-[clamp(1.05rem,1.5vw,1.7rem)] leading-snug text-ink-100">{student.general_appreciation}</p>}
                        </section>

                        {(student.appreciations?.length ?? 0) > 0 && (
                            <section className="rounded-3xl border border-white/10 bg-white/5 p-[clamp(1.2rem,2vw,2.4rem)]">
                                <h2 className="mb-4 text-[clamp(0.9rem,1.1vw,1.3rem)] font-semibold uppercase tracking-[0.25em] text-gold-300">Appréciations des enseignants</h2>
                                <ul className="space-y-3 text-[clamp(1rem,1.4vw,1.6rem)] leading-snug">
                                    {student.appreciations!.map((item, index) => (
                                        <li key={index} className="line-clamp-3">
                                            <span className="font-semibold text-gold-200">{item.subject} : </span>
                                            <span className="text-ink-100">{item.appreciation}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </aside>
                </div>
            ) : (
                <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center">
                    <p className="text-[clamp(0.9rem,1.2vw,1.4rem)] font-semibold uppercase tracking-[0.4em] text-gold-300">Élite École Hôtelière et Touristique · Thiès</p>
                    <h1 className="mt-5 font-serif text-[clamp(3rem,8vw,9rem)] font-bold leading-none">{council.class}</h1>
                    <p className="mt-3 font-serif text-[clamp(1.4rem,2.6vw,3rem)] text-ink-200">{council.term}</p>

                    {state.summary && (
                        <dl className="mt-[clamp(2rem,4vw,5rem)] grid grid-cols-3 gap-[clamp(1.5rem,4vw,6rem)]">
                            <div>
                                <dd className="font-serif text-[clamp(2.4rem,5vw,5.5rem)] font-bold leading-none">{state.summary.count}</dd>
                                <dt className="mt-2 text-[clamp(0.9rem,1.2vw,1.4rem)] uppercase tracking-[0.2em] text-ink-300">élèves</dt>
                            </div>
                            <div>
                                <dd className="font-serif text-[clamp(2.4rem,5vw,5.5rem)] font-bold leading-none">{fr(state.summary.average)}</dd>
                                <dt className="mt-2 text-[clamp(0.9rem,1.2vw,1.4rem)] uppercase tracking-[0.2em] text-ink-300">moyenne de classe</dt>
                            </div>
                            <div>
                                <dd className="font-serif text-[clamp(2.4rem,5vw,5.5rem)] font-bold leading-none">{state.summary.pass_rate === null ? '—' : `${fr(state.summary.pass_rate, 0)} %`}</dd>
                                <dt className="mt-2 text-[clamp(0.9rem,1.2vw,1.4rem)] uppercase tracking-[0.2em] text-ink-300">taux ≥ 10</dt>
                            </div>
                        </dl>
                    )}

                    <p className="mt-[clamp(2.5rem,5vw,6rem)] inline-flex items-center gap-3 rounded-full border border-white/15 px-6 py-2.5 text-[clamp(1rem,1.5vw,1.8rem)] text-ink-200">
                        <span className={`h-2.5 w-2.5 rounded-full ${live ? 'animate-pulse bg-gold-400' : 'bg-ink-400'}`} aria-hidden="true" />
                        {live ? 'En attente de l’élève suivant…' : 'La séance n’est pas en cours.'}
                    </p>
                </div>
            )}
        </main>
    );
}
