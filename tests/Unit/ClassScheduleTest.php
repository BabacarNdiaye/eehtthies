<?php

namespace Tests\Unit;

use App\Models\TimetableEntry;
use App\Support\ClassSchedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Tests\TestCase;

/**
 * Verrouille le calcul du « prochain cours » affiché en tête de l'accueil des espaces élève, parent et
 * enseignant : un cours est en cours de son début (inclus) à sa fin (exclue), puis on cherche le suivant
 * aujourd'hui, les jours d'après, et jusqu'à la même journée de la semaine suivante.
 */
class ClassScheduleTest extends TestCase
{
    private const MONDAY = '2026-10-05';

    private function entry(int $day, string $start, string $end): TimetableEntry
    {
        return (new TimetableEntry)->forceFill(['day_of_week' => $day, 'start_time' => $start, 'end_time' => $end]);
    }

    private function at(string $dateTime): Carbon
    {
        return Carbon::parse($dateTime);
    }

    private function week(): Collection
    {
        return collect([
            $this->entry(1, '14:00:00', '16:00:00'),
            $this->entry(1, '09:00:00', '11:00:00'),
            $this->entry(2, '08:00:00', '10:00:00'),
        ]);
    }

    public function test_a_class_in_progress_is_reported_as_ongoing(): void
    {
        $next = ClassSchedule::next($this->week(), $this->at(self::MONDAY.' 09:30:00'));

        $this->assertSame('ongoing', $next['state']);
        $this->assertSame('Lundi', $next['day_label']);
        $this->assertSame('09:00:00', $next['entry']->start_time);
        $this->assertSame('2026-10-05T09:00:00+00:00', $next['starts_at']);
        $this->assertSame('2026-10-05T11:00:00+00:00', $next['ends_at']);
    }

    public function test_the_start_time_is_inclusive_and_the_end_time_exclusive(): void
    {
        $atStart = ClassSchedule::next($this->week(), $this->at(self::MONDAY.' 09:00:00'));
        $atEnd = ClassSchedule::next($this->week(), $this->at(self::MONDAY.' 11:00:00'));

        $this->assertSame('ongoing', $atStart['state']);
        $this->assertSame('upcoming', $atEnd['state']);
        $this->assertSame('14:00:00', $atEnd['entry']->start_time);
    }

    public function test_between_two_classes_the_next_one_today_is_upcoming(): void
    {
        $next = ClassSchedule::next($this->week(), $this->at(self::MONDAY.' 12:00:00'));

        $this->assertSame('upcoming', $next['state']);
        $this->assertSame('14:00:00', $next['entry']->start_time);
        $this->assertSame('2026-10-05T14:00:00+00:00', $next['starts_at']);
    }

    public function test_after_the_last_class_of_the_day_it_rolls_over_to_the_next_day(): void
    {
        $next = ClassSchedule::next($this->week(), $this->at(self::MONDAY.' 17:00:00'));

        $this->assertSame('upcoming', $next['state']);
        $this->assertSame('Mardi', $next['day_label']);
        $this->assertSame('2026-10-06T08:00:00+00:00', $next['starts_at']);
    }

    public function test_it_wraps_to_the_same_day_of_next_week_when_nothing_else_remains(): void
    {
        $entries = collect([$this->entry(1, '09:00:00', '11:00:00')]);

        $next = ClassSchedule::next($entries, $this->at(self::MONDAY.' 12:00:00'));

        $this->assertSame('upcoming', $next['state']);
        $this->assertSame('2026-10-12T09:00:00+00:00', $next['starts_at']);
    }

    public function test_sunday_leads_to_monday(): void
    {
        $next = ClassSchedule::next($this->week(), $this->at('2026-10-04 10:00:00'));

        $this->assertSame('upcoming', $next['state']);
        $this->assertSame('Lundi', $next['day_label']);
        $this->assertSame('2026-10-05T09:00:00+00:00', $next['starts_at']);
    }

    public function test_an_empty_timetable_has_no_next_class(): void
    {
        $this->assertNull(ClassSchedule::next(collect(), $this->at(self::MONDAY.' 09:30:00')));
    }

    public function test_times_without_seconds_are_accepted(): void
    {
        $entries = collect([$this->entry(1, '09:00', '11:00')]);

        $next = ClassSchedule::next($entries, $this->at(self::MONDAY.' 10:00:00'));

        $this->assertSame('ongoing', $next['state']);
        $this->assertSame('2026-10-05T11:00:00+00:00', $next['ends_at']);
    }

    public function test_today_returns_only_todays_classes_in_chronological_order(): void
    {
        $today = ClassSchedule::today($this->week(), $this->at(self::MONDAY.' 08:00:00'));

        $this->assertSame(['09:00:00', '14:00:00'], $today->pluck('start_time')->all());
    }
}
