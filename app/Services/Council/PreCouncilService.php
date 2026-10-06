<?php

namespace App\Services\Council;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Models\CouncilObservation;
use App\Models\CouncilStudent;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Pré-conseil (PRE-01 à PRE-07) : chaque enseignant renseigne, pour les élèves de la classe et SES matières, une
 * appréciation publiable, une observation interne, une difficulté et une recommandation. Ouvert tant que le conseil
 * n'est pas en séance et que la date limite n'est pas passée.
 */
class PreCouncilService
{
    /** @return Collection<int, Subject> matières que l'enseignant enseigne à la classe du conseil (emploi du temps) */
    public function subjectsOf(Teacher $teacher, Council $council): Collection
    {
        $ids = TimetableEntry::where('teacher_id', $teacher->id)->where('school_class_id', $council->school_class_id)->distinct()->pluck('subject_id');

        return Subject::whereIn('id', $ids)->orderBy('name')->get();
    }

    /** PRE-07 : après la date limite, ou une fois la séance ouverte, les saisies passent en lecture seule. */
    public function isOpen(Council $council): bool
    {
        return in_array($council->status, [Council::DRAFT, Council::SCHEDULED], true)
            && ($council->preconseil_deadline === null || now()->lte($council->preconseil_deadline));
    }

    /**
     * Enregistre un lot de saisies (tableau ou fiche par élève). Verrou optimiste par ligne : une ligne modifiée
     * entre-temps est renvoyée en conflit avec sa version en base, les autres sont enregistrées.
     *
     * @param  list<array{council_student_id: int, subject_id: int, appreciation?: ?string, internal_note?: ?string, difficulty?: ?string, recommendation?: ?string, revision?: int}>  $entries
     * @return array{saved: list<array{council_student_id: int, subject_id: int, revision: int}>, conflicts: list<array<string, mixed>>}
     */
    public function save(Council $council, Teacher $teacher, User $by, array $entries): array
    {
        if (! $this->isOpen($council)) {
            throw CouncilException::rule('PRECOUNCIL_CLOSED', 'Le pré-conseil est clos : les appréciations ne sont plus modifiables.');
        }

        $subjectIds = $this->subjectsOf($teacher, $council)->pluck('id')->all();
        $studentIds = $council->students()->pluck('id')->all();
        $saved = [];
        $conflicts = [];

        DB::transaction(function () use ($council, $teacher, $by, $entries, $subjectIds, $studentIds, &$saved, &$conflicts) {
            foreach ($entries as $entry) {
                $subjectId = (int) $entry['subject_id'];
                $rowId = (int) $entry['council_student_id'];

                if (! in_array($subjectId, $subjectIds, true)) {
                    throw CouncilException::rule('PRECOUNCIL_NOT_YOUR_SUBJECT', 'Vous ne pouvez renseigner que les matières que vous enseignez dans cette classe.');
                }
                if (! in_array($rowId, $studentIds, true)) {
                    throw CouncilException::rule('COUNCIL_BAD_STUDENT', 'Cet élève ne fait pas partie de ce conseil.');
                }

                $observation = CouncilObservation::firstOrNew(['council_student_id' => $rowId, 'subject_id' => $subjectId]);

                if ($observation->exists && isset($entry['revision']) && (int) $entry['revision'] !== $observation->revision) {
                    $conflicts[] = $this->present($observation, true);

                    continue;
                }

                $before = $observation->exists ? $observation->only(['appreciation', 'internal_note', 'difficulty', 'recommendation']) : null;
                $observation->fill([
                    'council_id' => $council->id,
                    'teacher_id' => $teacher->id,
                    'user_id' => $by->id,
                    'appreciation' => trim((string) ($entry['appreciation'] ?? '')) ?: null,
                    'internal_note' => trim((string) ($entry['internal_note'] ?? '')) ?: null,
                    'difficulty' => array_key_exists((string) ($entry['difficulty'] ?? ''), CouncilObservation::DIFFICULTIES) ? $entry['difficulty'] : null,
                    'recommendation' => trim((string) ($entry['recommendation'] ?? '')) ?: null,
                ]);

                if ($observation->isDirty(['appreciation', 'internal_note', 'difficulty', 'recommendation']) || ! $observation->exists) {
                    $observation->revision = $observation->exists ? $observation->revision + 1 : 1;
                    $observation->save();

                    CouncilWorkflow::log($council, $by, 'Pré-conseil : appréciation enregistrée', [
                        'student_id' => CouncilStudent::whereKey($rowId)->value('student_id'),
                        'subject_id' => $subjectId,
                        'old' => $before,
                        'new' => $observation->only(['appreciation', 'internal_note', 'difficulty', 'recommendation']),
                    ]);
                }

                $saved[] = ['council_student_id' => $rowId, 'subject_id' => $subjectId, 'revision' => $observation->revision];
            }
        });

        return ['saved' => $saved, 'conflicts' => $conflicts];
    }

    /** @return array<string, mixed> */
    public function present(CouncilObservation $observation, bool $internal): array
    {
        return [
            'council_student_id' => $observation->council_student_id,
            'subject_id' => $observation->subject_id,
            'subject' => $observation->subject?->name,
            'teacher' => $observation->teacher?->full_name,
            'appreciation' => $observation->appreciation,
            'internal_note' => $internal ? $observation->internal_note : null,
            'difficulty' => $observation->difficulty,
            'difficulty_label' => CouncilObservation::DIFFICULTIES[$observation->difficulty] ?? null,
            'recommendation' => $internal ? $observation->recommendation : null,
            'revision' => $observation->revision,
        ];
    }

    /**
     * PRE-04 : avancement par enseignant (élèves renseignés ÷ élèves à renseigner, matière par matière).
     *
     * @return list<array{teacher: string, subjects: list<string>, filled: int, total: int}>
     */
    public function progress(Council $council): array
    {
        $rows = $council->students()->where('has_left_class', false)->pluck('id');
        $pairs = TimetableEntry::where('school_class_id', $council->school_class_id)->whereNotNull('teacher_id')
            ->with(['teacher:id,first_name,last_name', 'subject:id,name'])->get()
            ->unique(fn (TimetableEntry $entry) => $entry->teacher_id.'-'.$entry->subject_id);

        $filled = CouncilObservation::where('council_id', $council->id)->whereIn('council_student_id', $rows)->whereNotNull('appreciation')
            ->get(['council_student_id', 'subject_id'])->groupBy('subject_id')->map->count();

        return $pairs->groupBy('teacher_id')->map(fn (Collection $entries) => [
            'teacher' => $entries->first()->teacher?->full_name ?? 'Enseignant',
            'subjects' => $entries->map(fn (TimetableEntry $entry) => $entry->subject?->name)->filter()->values()->all(),
            'filled' => (int) $entries->sum(fn (TimetableEntry $entry) => $filled[$entry->subject_id] ?? 0),
            'total' => $entries->count() * $rows->count(),
        ])->values()->all();
    }

    /** @return list<array<string, mixed>> appréciations des enseignants pour un élève (SEA-06) */
    public function forStudent(CouncilStudent $row, bool $internal): array
    {
        return CouncilObservation::with(['subject:id,name', 'teacher:id,first_name,last_name'])
            ->where('council_student_id', $row->id)->get()
            ->sortBy(fn (CouncilObservation $observation) => $observation->subject?->name)
            ->map(fn (CouncilObservation $observation) => $this->present($observation, $internal))
            ->values()->all();
    }
}
