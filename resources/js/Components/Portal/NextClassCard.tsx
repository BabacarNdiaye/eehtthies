import useNow from '@/hooks/useNow';
import { formatDuration, hhmm, NextClass, subjectStyle } from '@/lib/portal';
import { Link, router } from '@inertiajs/react';
import { CalendarOff, ClipboardCheck, MapPin, User, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Props {
    next: NextClass | null;
    /** Espace enseignant : affiche la classe et le bouton « Faire l'appel ». */
    attendanceHref?: string;
    timetableHref?: string;
    /** Propriété Inertia à recharger quand le cours affiché commence ou se termine (« nextClass » par défaut). */
    reloadProp?: string;
    /** Chevauche le bas de l'en-tête de l'accueil (marge négative) ; à désactiver quand la carte n'est pas juste dessous. */
    overlap?: boolean;
}

function relativeDay(startsAt: string, now: number, dayLabel: string): string {
    const day = startsAt.slice(0, 10);

    if (day === new Date(now).toISOString().slice(0, 10)) return "Aujourd'hui";
    if (day === new Date(now + 86400000).toISOString().slice(0, 10)) return 'Demain';

    return dayLabel;
}

/**
 * Carte « Prochain cours » en tête de l'accueil : cours en cours (avec le temps restant et une barre de
 * progression) ou prochain cours (avec un compte à rebours). Le serveur choisit le cours ; le navigateur ne
 * fait que décompter, et redemande la donnée quand le cours affiché commence ou se termine.
 */
export default function NextClassCard({ next, attendanceHref, timetableHref, reloadProp = 'nextClass', overlap = true }: Props) {
    const now = useNow(15000);
    const reloadedFor = useRef<string | null>(null);
    const position = overlap ? 'relative z-10 -mt-10 lg:-mt-8' : 'relative';

    useEffect(() => {
        if (!next) return;

        const boundary = Date.parse(next.state === 'ongoing' ? next.ends_at : next.starts_at);
        const key = `${next.entry.id}:${next.state}`;

        if (now >= boundary && reloadedFor.current !== key) {
            reloadedFor.current = key;
            router.reload({ only: [reloadProp] });
        }
    }, [now, next, reloadProp]);

    if (!next) {
        return (
            <div className={`${position} flex items-center gap-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-ink-100`}>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-50 text-ink-300">
                    <CalendarOff className="h-7 w-7" />
                </span>
                <div>
                    <p className="font-serif text-base font-bold text-ink-900">Aucun cours programmé</p>
                    <p className="text-xs text-ink-500">Votre emploi du temps de la semaine est vide pour le moment.</p>
                </div>
            </div>
        );
    }

    const { entry } = next;
    const startsAt = Date.parse(next.starts_at);
    const endsAt = Date.parse(next.ends_at);
    const finished = now >= endsAt;
    const ongoing = now >= startsAt && !finished;
    const { icon: Icon, gradient } = subjectStyle(entry.subject?.name ?? '');
    const progress = ongoing ? Math.min(1, (now - startsAt) / (endsAt - startsAt)) : 0;
    const untilStart = startsAt - now;

    const status = finished
        ? 'Cours terminé'
        : ongoing
          ? `En cours · fin dans ${formatDuration(endsAt - now)}`
          : untilStart < 3 * 3600000
            ? `Prochain cours · dans ${formatDuration(untilStart)}`
            : `Prochain cours · ${relativeDay(next.starts_at, now, next.day_label)} à ${hhmm(entry.start_time)}`;

    return (
        <div className={`${position} overflow-hidden rounded-3xl bg-white p-5 shadow-soft ring-1 ring-ink-100`}>
            <p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${ongoing ? 'text-emerald-600' : 'text-ink-500'}`} aria-live="polite">
                {ongoing && (
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                )}
                {status}
            </p>

            <div className="mt-3 flex items-center gap-4">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
                    <Icon className="h-7 w-7" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-lg font-bold leading-tight text-ink-900">{entry.subject?.name ?? 'Cours'}</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-700">
                        {hhmm(entry.start_time)} – {hhmm(entry.end_time)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500">
                        {entry.room && (
                            <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {entry.room.name}
                            </span>
                        )}
                        {attendanceHref
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
                    </div>
                </div>
            </div>

            {ongoing && (
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Avancement du cours">
                    <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
                </div>
            )}

            {(attendanceHref || timetableHref) && (
                <div className="mt-4 flex gap-2">
                    {attendanceHref && !finished && (
                        <Link
                            href={attendanceHref}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white transition-colors active:bg-ink-800 lg:flex-none lg:px-8"
                        >
                            <ClipboardCheck className="h-4 w-4" /> Faire l'appel
                        </Link>
                    )}
                    {timetableHref && (
                        <Link
                            href={timetableHref}
                            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-ink-200 px-4 py-3 text-sm font-semibold text-ink-700 transition-colors active:bg-ink-50 lg:flex-none lg:px-8"
                        >
                            Voir l'agenda
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
