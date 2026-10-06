<?php

namespace App\Support;

use App\Models\TimetableEntry;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Calculs sur un emploi du temps hebdomadaire : cours du jour, cours en cours ou prochain cours. Fonctions
 * pures (l'heure est passée en paramètre) pour que l'accueil des espaces élève, parent et enseignant soit
 * testable.
 */
class ClassSchedule
{
    /**
     * @param  Collection<int, TimetableEntry>  $entries
     * @return Collection<int, TimetableEntry> cours du jour de $now, triés par heure de début
     */
    public static function today(Collection $entries, CarbonInterface $now): Collection
    {
        return $entries
            ->where('day_of_week', $now->dayOfWeekIso)
            ->sortBy('start_time')
            ->values();
    }

    /**
     * Cours en cours (de son début, inclus, à sa fin, exclue) ou, à défaut, prochain cours : aujourd'hui, puis
     * les jours suivants, jusqu'à la même journée de la semaine suivante.
     *
     * @param  Collection<int, TimetableEntry>  $entries
     * @return array{state: 'ongoing'|'upcoming', entry: TimetableEntry, starts_at: string, ends_at: string, day_label: string}|null
     */
    public static function next(Collection $entries, CarbonInterface $now): ?array
    {
        for ($offset = 0; $offset <= 7; $offset++) {
            $day = $now->copy()->startOfDay()->addDays($offset);
            $isoDay = $day->dayOfWeekIso;

            foreach ($entries->where('day_of_week', $isoDay)->sortBy('start_time') as $entry) {
                $start = $day->copy()->setTimeFromTimeString($entry->start_time);
                $end = $day->copy()->setTimeFromTimeString($entry->end_time);

                if ($end->lessThanOrEqualTo($now)) {
                    continue;
                }

                return [
                    'state' => $start->lessThanOrEqualTo($now) ? 'ongoing' : 'upcoming',
                    'entry' => $entry,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end->toIso8601String(),
                    'day_label' => TimetableEntry::DAYS[$isoDay],
                ];
            }
        }

        return null;
    }
}
