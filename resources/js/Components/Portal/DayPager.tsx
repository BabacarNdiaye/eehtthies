import useNow from '@/hooks/useNow';
import { haptic, hhmm, PortalEntry, subjectStyle } from '@/lib/portal';
import { CalendarOff, MapPin, User, Users } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface Props {
    entries: PortalEntry[];
    days: Record<string, string>;
    /** Espace enseignant : affiche la classe plutôt que l'enseignant. */
    showClass?: boolean;
}

const SHORT_DAYS: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' };

/** « 09:00 » ou « 09:00:00 » → secondes depuis minuit. */
function seconds(time: string): number {
    const [h, m, s] = time.split(':').map(Number);

    return h * 3600 + m * 60 + (s || 0);
}

/**
 * Agenda de la semaine. Téléphone : pastilles de jours et un jour par « page » qu'on balaie au doigt (CSS
 * scroll-snap, sans bibliothèque) ; ordinateur : grille de toutes les journées. Le cours en cours est mis en
 * évidence, les cours passés du jour sont grisés (par leur fond : une opacité ferait tomber le contraste du
 * texte sous le seuil de lisibilité). Heures lues en UTC = heure de Dakar.
 */
export default function DayPager({ entries, days, showClass = false }: Props) {
    const now = useNow(30000);
    const nowDate = new Date(now);
    const todayIso = nowDate.getUTCDay() === 0 ? 7 : nowDate.getUTCDay();
    const secondsNow = nowDate.getUTCHours() * 3600 + nowDate.getUTCMinutes() * 60 + nowDate.getUTCSeconds();

    const byDay = useMemo(
        () =>
            Object.keys(days)
                .map(Number)
                .sort((a, b) => a - b)
                .filter((day) => day <= 6 || entries.some((entry) => entry.day_of_week === day))
                .map((day) => ({
                    day,
                    label: days[day],
                    items: entries.filter((entry) => entry.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time)),
                })),
        [days, entries],
    );

    const initial = useMemo(() => {
        const today = byDay.findIndex((d) => d.day === todayIso);

        if (today >= 0) return today;

        return Math.max(0, byDay.findIndex((d) => d.items.length > 0));
        // Le jour initial n'est calculé qu'une fois, au premier affichage.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const track = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(initial);

    // Place le défilement sur le jour initial, sans animation (téléphone seulement : sur ordinateur, tout est visible).
    useLayoutEffect(() => {
        const el = track.current;

        if (el && !window.matchMedia('(min-width: 1024px)').matches) el.scrollLeft = initial * el.clientWidth;
    }, [initial]);

    const onScroll = () => {
        const el = track.current;

        if (!el || el.clientWidth === 0) return;

        const next = Math.min(Math.max(Math.round(el.scrollLeft / el.clientWidth), 0), byDay.length - 1);

        if (next !== index) setIndex(next);
    };

    const goTo = (target: number) => {
        const el = track.current;

        haptic();
        setIndex(target);
        el?.scrollTo({ left: target * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };

    return (
        <div>
            <div role="tablist" aria-label="Jours de la semaine" className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:hidden">
                {byDay.map(({ day, label, items }, i) => {
                    const active = i === index;
                    const date = new Date(now + (day - todayIso) * 86400000).getUTCDate();

                    return (
                        <button
                            key={day}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => goTo(i)}
                            className={`relative flex min-h-[4rem] min-w-[3.25rem] flex-1 flex-col items-center justify-center rounded-2xl border px-2 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                active ? 'border-ink-900 bg-ink-900 text-white shadow-md' : 'border-ink-100 bg-white text-ink-600 active:bg-ink-50'
                            }`}
                        >
                            {/* Le nom accessible vient du contenu (jour en toutes lettres, date, cours du jour) : il contient donc le texte visible. */}
                            <span aria-hidden="true" className={`text-[11px] font-semibold uppercase tracking-wide ${active ? 'text-gold-300' : 'text-ink-400'}`}>
                                {SHORT_DAYS[day]}
                            </span>
                            <span className="sr-only">{label}</span>
                            <span className="text-lg font-bold leading-tight">{date}</span>
                            <span
                                aria-hidden="true"
                                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                                    day === todayIso ? 'bg-emerald-500' : items.length > 0 ? (active ? 'bg-white/60' : 'bg-gold-500') : 'bg-transparent'
                                }`}
                            />
                            <span className="sr-only">{[day === todayIso ? 'aujourd’hui' : null, items.length ? `${items.length} cours` : 'aucun cours'].filter(Boolean).join(', ')}</span>
                        </button>
                    );
                })}
            </div>

            <div
                ref={track}
                onScroll={onScroll}
                className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible"
            >
                {byDay.map(({ day, label, items }) => (
                    <section
                        key={day}
                        role="tabpanel"
                        aria-label={label}
                        className="w-full shrink-0 snap-center snap-always px-0.5 lg:w-auto lg:rounded-2xl lg:bg-white lg:p-4 lg:ring-1 lg:ring-ink-100"
                    >
                        <h2 className="mb-3 hidden items-center gap-2 font-serif text-base font-bold text-ink-900 lg:flex">
                            {label}
                            {day === todayIso && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-sans text-[11px] font-semibold text-emerald-700">Aujourd'hui</span>}
                        </h2>

                        {items.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-4 py-10 text-center ring-1 ring-ink-100 lg:bg-ink-50 lg:py-6 lg:ring-0">
                                <CalendarOff className="h-8 w-8 text-ink-300" />
                                <p className="text-sm text-ink-400">Aucun cours ce jour-là.</p>
                            </div>
                        ) : (
                            <ol className="space-y-3">
                                {items.map((entry) => {
                                    const { icon: Icon, gradient } = subjectStyle(entry.subject?.name ?? '');
                                    const start = seconds(entry.start_time);
                                    const end = seconds(entry.end_time);
                                    const state = day !== todayIso ? 'other' : secondsNow >= end ? 'past' : secondsNow >= start ? 'ongoing' : 'upcoming';

                                    return (
                                        <li key={entry.id} className="flex gap-3">
                                            <div className="w-12 shrink-0 pt-3.5 text-right">
                                                <p className={`text-sm font-bold ${state === 'past' ? 'text-ink-500' : 'text-ink-800'}`}>{hhmm(entry.start_time)}</p>
                                                <p className="text-[11px] text-ink-500">{hhmm(entry.end_time)}</p>
                                            </div>
                                            <div
                                                className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border p-3 ${
                                                    state === 'ongoing'
                                                        ? 'border-emerald-200 bg-emerald-50'
                                                        : state === 'past'
                                                          ? 'border-ink-100 bg-ink-100/60'
                                                          : 'border-ink-100 bg-white'
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm ${
                                                        state === 'past' ? 'grayscale' : ''
                                                    }`}
                                                >
                                                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`line-clamp-2 text-sm font-semibold leading-snug ${state === 'past' ? 'text-ink-600' : 'text-ink-900'}`}>
                                                        {entry.subject?.name ?? 'Cours'}
                                                    </p>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
                                                        {state === 'ongoing' && (
                                                            <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">En cours</span>
                                                        )}
                                                        {showClass
                                                            ? entry.school_class && (
                                                                  <span className="inline-flex items-center gap-1">
                                                                      <Users className="h-3.5 w-3.5" /> {entry.school_class.name}
                                                                  </span>
                                                              )
                                                            : entry.teacher && (
                                                                  <span className="inline-flex items-center gap-1">
                                                                      <User className="h-3.5 w-3.5" /> {entry.teacher.first_name} {entry.teacher.last_name}
                                                                  </span>
                                                              )}
                                                        {entry.room && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <MapPin className="h-3.5 w-3.5" /> {entry.room.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>
                ))}
            </div>
        </div>
    );
}
