import useNow from '@/hooks/useNow';
import { hhmm, PortalEntry } from '@/lib/portal';
import { MapPin, User, Users } from 'lucide-react';

interface Props {
    entries: PortalEntry[];
    /** Espace enseignant : on affiche la classe plutôt que l'enseignant. */
    showClass?: boolean;
    emptyLabel?: string;
}

/** « 09:00 » ou « 09:00:00 » → secondes depuis minuit, pour comparer à l'heure courante (UTC = heure de Dakar). */
function seconds(time: string): number {
    const [h, m, s] = time.split(':').map(Number);

    return h * 3600 + m * 60 + (s || 0);
}

/**
 * Frise horaire des cours du jour : passé grisé, cours en cours mis en évidence (point animé), à venir en
 * doré. L'état se met à jour toutes les minutes. Les cours passés sont grisés par leur fond, jamais par une
 * opacité : elle ferait tomber le contraste du texte sous le seuil de lisibilité.
 */
export default function DayTimeline({ entries, showClass = false, emptyLabel = "Aucun cours aujourd'hui." }: Props) {
    const now = useNow(60000);

    if (entries.length === 0) {
        return <p className="rounded-2xl bg-ink-50 px-4 py-5 text-center text-sm text-ink-400">{emptyLabel}</p>;
    }

    const current = seconds(new Date(now).toISOString().slice(11, 19));

    return (
        <ol className="space-y-3">
            {entries.map((entry) => {
                const start = seconds(entry.start_time);
                const end = seconds(entry.end_time);
                const state = current >= end ? 'past' : current >= start ? 'ongoing' : 'upcoming';

                return (
                    <li key={entry.id} className="flex gap-3">
                        <div className="w-11 shrink-0 pt-3 text-right">
                            <p className={`text-sm font-bold ${state === 'past' ? 'text-ink-500' : 'text-ink-800'}`}>{hhmm(entry.start_time)}</p>
                            <p className="text-[11px] text-ink-500">{hhmm(entry.end_time)}</p>
                        </div>
                        <div className="relative flex flex-col items-center">
                            <span
                                className={`mt-4 h-3 w-3 rounded-full ring-4 ring-white ${
                                    state === 'ongoing' ? 'bg-emerald-500' : state === 'upcoming' ? 'bg-gold-500' : 'bg-ink-200'
                                }`}
                            />
                            <span className="mt-1 w-px flex-1 bg-ink-100" />
                        </div>
                        <div
                            className={`min-w-0 flex-1 rounded-2xl border p-3.5 ${
                                state === 'ongoing'
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : state === 'past'
                                      ? 'border-ink-100 bg-ink-100/60'
                                      : 'border-ink-100 bg-white'
                            }`}
                        >
                            <p className={`line-clamp-2 text-sm font-semibold leading-snug ${state === 'past' ? 'text-ink-600' : 'text-ink-900'}`}>
                                {entry.subject?.name ?? 'Cours'}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                                {state === 'ongoing' && (
                                    <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">En cours</span>
                                )}
                                {entry.room && (
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" /> {entry.room.name}
                                    </span>
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
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
