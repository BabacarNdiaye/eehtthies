<?php

namespace App\Services\Council;

use App\Models\AlertThreshold;
use App\Models\Attendance;
use App\Models\Council;
use App\Models\DisciplineRecord;
use App\Models\Internship;
use App\Models\ReportCard;
use App\Models\Subject;
use App\Models\SubjectGroup;
use App\Models\TimetableEntry;
use App\Services\ReportCardCalculator;
use App\Support\CouncilSettings;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * La photo des données de chaque élève du conseil (FIG-01) : moyennes par matière et par groupe, rang, moyenne de la
 * période précédente et progression, heures d'absence, retards, sanctions, stage, puis la pastille d'alerte.
 *
 * RG-01 : moyennes et rangs viennent du calculateur des bulletins (ReportCardCalculator), jamais d'un calcul propre au
 * conseil. Une fois la séance ouverte, la photo ne bouge plus (FIG-03) : take() n'y touche pas.
 */
class SnapshotService
{
    public function __construct(
        private readonly ReportCardCalculator $calculator,
        private readonly CouncilRoster $roster,
        private readonly AlertService $alerts,
    ) {}

    public function take(Council $council): void
    {
        if ($council->isSnapshotFrozen()) {
            return;
        }

        $this->roster->populateStudents($council);
        $council->loadMissing(['schoolClass', 'academicYear']);

        $rows = $council->students()->get();
        $studentIds = $rows->pluck('student_id');
        $class = $council->schoolClass;
        $year = $council->academicYear;

        $detail = $this->calculator->computeDetailedForClass($class, $year->id, $council->term, $studentIds);
        $ranking = collect($this->calculator->computeForClass($class, $year->id, $council->term))
            ->keyBy(fn (array $result) => $result['student']->id);
        $previous = $this->previousAverages($council, $studentIds);

        $groups = SubjectGroup::orderBy('sort_order')->get()->keyBy('id');
        $subjectGroups = Subject::whereIn('id', collect($detail)->flatMap(fn ($d) => collect($d['subjects'])->pluck('subject_id'))->unique())
            ->pluck('subject_group_id', 'id');

        $window = $this->calculator->termDateRange($year, $council->term);
        $attendance = $this->attendance($council, $studentIds, $window);
        $discipline = $this->discipline($studentIds, $window);
        $internships = $this->internships($studentIds);
        $thresholds = AlertThreshold::resolve($class->formation_id);

        DB::transaction(function () use ($rows, $detail, $ranking, $previous, $groups, $subjectGroups, $attendance, $discipline, $internships, $thresholds, $window, $council) {
            foreach ($rows as $row) {
                $studentDetail = $detail[$row->student_id] ?? ['subjects' => [], 'overall' => null];
                $ranked = $ranking->get($row->student_id);
                $average = $ranked['average'] ?? $studentDetail['overall'];
                $previousAverage = $previous[$row->student_id] ?? null;
                $progression = $average !== null && $previousAverage !== null ? round($average - $previousAverage, 2) : null;

                $subjects = collect($studentDetail['subjects'])->map(function (array $subject) use ($groups, $subjectGroups) {
                    $group = $groups->get($subjectGroups[$subject['subject_id']] ?? null);

                    return [
                        'id' => $subject['subject_id'],
                        'name' => $subject['subject'],
                        'group' => $group?->code,
                        'coefficient' => $subject['coefficient'],
                        'moy20' => $subject['moy20'],
                        'rank' => $subject['rank'] ?? null,
                        'class_size' => $subject['class_size'] ?? null,
                        'status' => $subject['status'],
                        'appreciation' => $subject['appreciation'],
                    ];
                })->values();

                $failed = $subjects->filter(fn (array $subject) => $subject['moy20'] !== null && $subject['moy20'] < 10)->count();
                $hours = $attendance[$row->student_id] ?? ['unjustified_hours' => 0.0, 'justified_hours' => 0.0, 'late_count' => 0, 'unjustified_count' => 0, 'justified_count' => 0];
                $sanctions = $discipline[$row->student_id] ?? collect();
                $maxSanction = $sanctions->sortByDesc(fn (array $record) => DisciplineRecord::rank($record['level']))->first()['level'] ?? null;

                $alert = $this->alerts->evaluate([
                    'average' => $average,
                    'unjustified_hours' => $hours['unjustified_hours'],
                    'failed_subjects' => $failed,
                    'progression' => $progression,
                    'max_sanction' => $maxSanction,
                ], $thresholds);

                $row->update([
                    'snapshot' => [
                        'period' => $window ? ['from' => $window[0]->toDateString(), 'to' => $window[1]->toDateString()] : null,
                        'averages' => [
                            'general' => $average,
                            'previous' => $previousAverage,
                            'progression' => $progression,
                            'rank' => $ranked['rank'] ?? null,
                            'class_size' => $ranked['class_size'] ?? null,
                            'class_average' => $ranked['class_average'] ?? null,
                        ],
                        'subjects' => $subjects->all(),
                        'groups' => $this->groupAverages($subjects, $groups),
                        'attendance' => $hours + ['class_exclusions' => $sanctions->where('level', 'exclusion_cours')->count()],
                        'discipline' => [
                            'count' => $sanctions->count(),
                            'max_level' => $maxSanction,
                            'records' => $sanctions->values()->all(),
                        ],
                        'internship' => $internships[$row->student_id] ?? null,
                    ],
                    'general_average' => $average,
                    'rank' => $ranked['rank'] ?? null,
                    'class_size' => $ranked['class_size'] ?? null,
                    'previous_average' => $previousAverage,
                    'progression' => $progression,
                    'failed_subjects_count' => $failed,
                    'unjustified_absence_hours' => $hours['unjustified_hours'],
                    'alert_level' => $alert['level'],
                    'alert_reasons' => $alert['reasons'],
                ]);
            }

            $council->update(['snapshot_taken_at' => now()]);
        });
    }

    /**
     * RG-02 : moyenne de la période précédente de la même année. Le bulletin déjà généré fait foi ; à défaut, le
     * calculateur. Vide pour la première période.
     *
     * @return array<int, float|null>
     */
    private function previousAverages(Council $council, Collection $studentIds): array
    {
        $terms = config('eeht.terms');
        $index = array_search($council->term, $terms, true);

        if ($index === false || $index === 0) {
            return [];
        }

        $previousTerm = $terms[$index - 1];
        $cards = ReportCard::whereIn('student_id', $studentIds)
            ->where('academic_year_id', $council->academic_year_id)
            ->where('term', $previousTerm)
            ->whereNotNull('average')
            ->pluck('average', 'student_id');

        $missing = $studentIds->reject(fn ($id) => $cards->has($id))->values();
        $computed = $missing->isEmpty() ? [] : $this->calculator->computeDetailedForClass($council->schoolClass, $council->academic_year_id, $previousTerm, $missing);

        $averages = [];
        foreach ($studentIds as $id) {
            $averages[$id] = $cards->has($id) ? (float) $cards[$id] : ($computed[$id]['overall'] ?? null);
        }

        return $averages;
    }

    /**
     * RG-03 : moyenne d'un groupe = moyenne pondérée par coefficient de ses matières évaluées. Le stage est une
     * appréciation : il n'a jamais de moyenne. Une matière sans groupe compte dans « Autres matières ».
     *
     * @return list<array{code: string, label: string, average: float|null, qualitative: bool}>
     */
    private function groupAverages(Collection $subjects, Collection $groups): array
    {
        $result = [];
        $byGroup = $subjects->groupBy(fn (array $subject) => $subject['group'] ?? 'autres');

        foreach ($groups as $group) {
            if ($byGroup->has($group->code)) {
                $result[] = $this->groupAverage($group->code, $group->label, $byGroup->get($group->code), $group->code === SubjectGroup::INTERNSHIP);
            }
        }

        if ($byGroup->has('autres')) {
            $result[] = $this->groupAverage('autres', 'Autres matières', $byGroup->get('autres'), false);
        }

        return $result;
    }

    private function groupAverage(string $code, string $label, Collection $subjects, bool $qualitative): array
    {
        $evaluated = $subjects->filter(fn (array $subject) => $subject['moy20'] !== null);
        $weight = $evaluated->sum('coefficient');

        return [
            'code' => $code,
            'label' => $label,
            'average' => ! $qualitative && $weight > 0 ? round($evaluated->sum(fn (array $subject) => $subject['moy20'] * $subject['coefficient']) / $weight, 2) : null,
            'qualitative' => $qualitative,
        ];
    }

    /**
     * RG-05 : heures d'absence justifiées et non justifiées et retards sur la période du conseil. Une absence vaut la durée
     * de son cours (créneau lié, sinon le créneau de la même matière ce jour-là), à défaut la durée réglée par l'école.
     *
     * @param  array{0: Carbon, 1: Carbon}|null  $window
     * @return array<int, array{unjustified_hours: float, justified_hours: float, late_count: int, unjustified_count: int, justified_count: int}>
     */
    private function attendance(Council $council, Collection $studentIds, ?array $window): array
    {
        if ($window === null) {
            return [];
        }

        $records = Attendance::whereIn('student_id', $studentIds)
            ->whereBetween('date', [$window[0]->toDateString(), $window[1]->toDateString()])
            ->whereIn('status', ['absent', 'absence_justifiee', 'retard'])
            ->get(['student_id', 'school_class_id', 'subject_id', 'timetable_entry_id', 'date', 'status']);

        $entries = TimetableEntry::whereIn('id', $records->pluck('timetable_entry_id')->filter()->unique())
            ->orWhereIn('school_class_id', $records->pluck('school_class_id')->unique())
            ->get(['id', 'school_class_id', 'subject_id', 'day_of_week', 'start_time', 'end_time']);
        $duration = fn (TimetableEntry $entry) => max(0, (strtotime($entry->end_time) - strtotime($entry->start_time)) / 3600);
        $default = CouncilSettings::defaultAbsenceHours();

        $hoursOf = function (Attendance $record) use ($entries, $duration, $default): float {
            $entry = $record->timetable_entry_id ? $entries->firstWhere('id', $record->timetable_entry_id) : null;
            $entry ??= $entries->first(fn (TimetableEntry $candidate) => $candidate->school_class_id === $record->school_class_id
                && $candidate->subject_id === $record->subject_id
                && $candidate->day_of_week === $record->date->dayOfWeekIso);

            return $entry ? $duration($entry) : $default;
        };

        $totals = [];
        foreach ($records as $record) {
            $totals[$record->student_id] ??= ['unjustified_hours' => 0.0, 'justified_hours' => 0.0, 'late_count' => 0, 'unjustified_count' => 0, 'justified_count' => 0];
            $total = &$totals[$record->student_id];

            if ($record->status === 'retard') {
                $total['late_count']++;
            } elseif ($record->status === 'absent') {
                $total['unjustified_hours'] = round($total['unjustified_hours'] + $hoursOf($record), 2);
                $total['unjustified_count']++;
            } else {
                $total['justified_hours'] = round($total['justified_hours'] + $hoursOf($record), 2);
                $total['justified_count']++;
            }
            unset($total);
        }

        return $totals;
    }

    /**
     * Sanctions de la période (registre de la vie scolaire). Le motif est interne : il ne sort que vers les vues qui
     * ont le droit de voir le détail disciplinaire.
     *
     * @return array<int, Collection<int, array{date: string, level: string, label: string, reason: string, days: int|null}>>
     */
    private function discipline(Collection $studentIds, ?array $window): array
    {
        if ($window === null) {
            return [];
        }

        return DisciplineRecord::whereIn('student_id', $studentIds)
            ->whereBetween('occurred_on', [$window[0]->toDateString(), $window[1]->toDateString()])
            ->orderBy('occurred_on')
            ->get()
            ->groupBy('student_id')
            ->map(fn (Collection $records) => $records->map(fn (DisciplineRecord $record) => [
                'date' => $record->occurred_on->toDateString(),
                'level' => $record->level,
                'label' => $record->level_label,
                'reason' => $record->reason,
                'days' => $record->days,
            ])->values())
            ->all();
    }

    /** @return array<int, array<string, mixed>> le stage le plus récent de chaque élève */
    private function internships(Collection $studentIds): array
    {
        return Internship::with('partner:id,name')
            ->whereIn('student_id', $studentIds)
            ->orderByDesc('start_date')
            ->get()
            ->unique('student_id')
            ->mapWithKeys(fn (Internship $internship) => [$internship->student_id => [
                'title' => $internship->title,
                'company' => $internship->partner?->name,
                'status' => $internship->status,
                'start_date' => $internship->start_date?->toDateString(),
                'end_date' => $internship->end_date?->toDateString(),
                'score' => $internship->evaluation_score !== null ? (float) $internship->evaluation_score : null,
                'appreciation' => $internship->evaluation_appreciation,
            ]])
            ->all();
    }
}
