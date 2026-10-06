<?php

namespace App\Services\Council;

use App\Models\Council;
use App\Models\CouncilMember;
use App\Models\CouncilStudent;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Qui siège et qui est examiné : les membres proposés à la création (CRE-03) et la liste des élèves de la classe (CRE-04,
 * RG-21 pour ceux qui l'ont quittée).
 */
class CouncilRoster
{
    /** Enseignants de la classe : ceux de son emploi du temps et ceux qui lui sont rattachés. */
    public function teachersOf(SchoolClass $schoolClass): Collection
    {
        $ids = TimetableEntry::where('school_class_id', $schoolClass->id)->whereNotNull('teacher_id')->distinct()->pluck('teacher_id')
            ->merge(DB::table('school_class_teacher')->where('school_class_id', $schoolClass->id)->pluck('teacher_id'))
            ->unique();

        return Teacher::whereIn('id', $ids)->where('status', 'actif')->orderBy('last_name')->orderBy('first_name')->get();
    }

    /**
     * Membres proposés (CRE-03) : les enseignants de la classe et les agents de la vie scolaire.
     *
     * @return list<array{user_id: int|null, teacher_id: int|null, name: string, function: string, can_vote: bool}>
     */
    public function proposeMembers(SchoolClass $schoolClass): array
    {
        $members = $this->teachersOf($schoolClass)->map(fn (Teacher $teacher) => [
            'user_id' => $teacher->user_id,
            'teacher_id' => $teacher->id,
            'name' => $teacher->full_name,
            'function' => 'teacher',
            'can_vote' => true,
        ])->values()->all();

        foreach (User::role('vie-scolaire')->orderBy('name')->get() as $agent) {
            $members[] = ['user_id' => $agent->id, 'teacher_id' => null, 'name' => $agent->name, 'function' => 'school_life', 'can_vote' => true];
        }

        return $members;
    }

    /**
     * Remplace les membres du conseil. Président, professeur principal et secrétaire désignés sur le conseil y figurent
     * toujours, avec leur fonction ; l'appel déjà fait d'un membre conservé est gardé.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    public function syncMembers(Council $council, array $rows): void
    {
        $previous = $council->members()->get();
        $attendance = fn (array $row) => $previous->first(fn (CouncilMember $member) => ($row['user_id'] ?? null) !== null
            ? $member->user_id === (int) $row['user_id']
            : (($row['teacher_id'] ?? null) !== null ? $member->teacher_id === (int) $row['teacher_id'] : $member->external_name === ($row['external_name'] ?? null)));

        $designated = array_filter([
            'president' => $council->president_id,
            'main_teacher' => $council->main_teacher_id,
            'secretary' => $council->secretary_id,
        ]);

        // Une personne désignée ne figure qu'une fois : avec sa fonction de conseil.
        $rows = array_values(array_filter($rows, fn (array $row) => ! in_array((int) ($row['user_id'] ?? 0), array_map('intval', $designated), true)));

        foreach (array_reverse($designated, true) as $function => $userId) {
            $teacherId = Teacher::where('user_id', $userId)->value('id');
            array_unshift($rows, ['user_id' => $userId, 'teacher_id' => $teacherId, 'function' => $function, 'can_vote' => true]);
        }

        DB::transaction(function () use ($council, $rows, $attendance) {
            $council->members()->get()->each->delete();

            foreach ($rows as $row) {
                $kept = $attendance($row);

                $council->members()->create([
                    'user_id' => $row['user_id'] ?? null,
                    'teacher_id' => $row['teacher_id'] ?? null,
                    'external_name' => ($row['user_id'] ?? null) || ($row['teacher_id'] ?? null) ? null : ($row['external_name'] ?? null),
                    'external_role' => $row['external_role'] ?? null,
                    'function' => $row['function'],
                    'can_vote' => (bool) ($row['can_vote'] ?? true),
                    'attendance' => $kept?->attendance ?? 'pending',
                    'arrived_at' => $kept?->arrived_at,
                ]);
            }
        });
    }

    /**
     * Élèves du conseil (CRE-04) : les élèves actifs de la classe y entrent ; un élève déjà inscrit au conseil qui a quitté
     * la classe y reste, marqué « sorti » (RG-21). Rien ne bouge une fois la photo figée.
     *
     * @return int nombre d'élèves du conseil
     */
    public function populateStudents(Council $council): int
    {
        if ($council->isSnapshotFrozen()) {
            return $council->students()->count();
        }

        $activeIds = Student::where('school_class_id', $council->school_class_id)->where('status', 'actif')->pluck('id');
        $existing = $council->students()->get()->keyBy('student_id');

        DB::transaction(function () use ($council, $activeIds, $existing) {
            foreach ($activeIds as $studentId) {
                if ($row = $existing->get($studentId)) {
                    if ($row->has_left_class) {
                        $row->update(['has_left_class' => false]);
                    }

                    continue;
                }

                CouncilStudent::create(['council_id' => $council->id, 'student_id' => $studentId]);
            }

            foreach ($existing as $studentId => $row) {
                if (! $activeIds->contains($studentId) && ! $row->has_left_class) {
                    $row->update(['has_left_class' => true]);
                }
            }
        });

        return $council->students()->count();
    }
}
