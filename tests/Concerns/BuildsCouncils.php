<?php

namespace Tests\Concerns;

use App\Models\AcademicYear;
use App\Models\Council;
use App\Models\DecisionType;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectGroup;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use App\Services\Council\CouncilSession;
use App\Services\Council\CouncilValidationFlow;
use App\Services\Council\CouncilWorkflow;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Storage;

/**
 * Décor des tests du conseil de classe : une année 2026-2027, une formation, une classe « BTS1 », des comptes par rôle,
 * des enseignants avec leur créneau d'emploi du temps, des élèves, des épreuves et des notes.
 */
trait BuildsCouncils
{
    protected AcademicYear $year;

    protected Formation $formation;

    protected SchoolClass $class;

    protected function councilWorld(): void
    {
        $this->withoutVite();
        // Les PV définitifs s'écrivent sur le disque privé : jamais dans le vrai storage/ pendant les tests.
        Storage::fake('local');
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
    }

    protected function staff(string $role, ?string $name = null): User
    {
        $user = User::factory()->create($name ? ['name' => $name] : []);
        $user->assignRole($role);

        return $user;
    }

    /**
     * Un enseignant avec son compte : il enseigne ces matières à la classe (créneau du lundi, 8 h – 10 h).
     *
     * @param  list<Subject>  $subjects
     * @return array{0: User, 1: Teacher}
     */
    protected function teacher(string $first, array $subjects = [], ?SchoolClass $class = null): array
    {
        $user = User::factory()->create(['name' => "{$first} Prof"]);
        $user->assignRole('enseignant');
        $teacher = Teacher::create(['user_id' => $user->id, 'matricule' => 'ENS-'.uniqid(), 'first_name' => $first, 'last_name' => 'Prof', 'status' => 'actif']);

        foreach ($subjects as $subject) {
            TimetableEntry::create([
                'school_class_id' => ($class ?? $this->class)->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id,
                'day_of_week' => 1, 'start_time' => '08:00:00', 'end_time' => '10:00:00',
            ]);
        }

        return [$user, $teacher];
    }

    protected function pupil(string $first, string $last = 'Diop', ?SchoolClass $class = null): Student
    {
        $class ??= $this->class;

        return Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => $first, 'last_name' => $last,
            'formation_id' => $this->formation->id, 'school_class_id' => $class->id, 'academic_year_id' => $this->year->id,
            'status' => 'actif',
        ]);
    }

    protected function subject(string $name, float $coefficient = 1, ?string $groupCode = null): Subject
    {
        return Subject::create([
            'name' => $name, 'coefficient' => $coefficient, 'formation_id' => $this->formation->id,
            'subject_group_id' => $groupCode ? SubjectGroup::where('code', $groupCode)->value('id') : null,
        ]);
    }

    protected function exam(Subject $subject, string $type = 'examen', string $term = 'Semestre 1', float $coefficient = 1): Exam
    {
        return Exam::create([
            'title' => ucfirst($type).' '.$subject->name, 'type' => $type, 'school_class_id' => $this->class->id,
            'academic_year_id' => $this->year->id, 'subject_id' => $subject->id, 'term' => $term, 'exam_date' => '2026-11-10',
            'max_score' => 20, 'coefficient' => $coefficient, 'is_published' => true,
        ]);
    }

    protected function grade(Exam $exam, Student $student, ?float $score, string $status = Grade::PRESENT): Grade
    {
        return Grade::updateOrCreate(['exam_id' => $exam->id, 'student_id' => $student->id], ['score' => $score, 'status' => $status]);
    }

    /** Conseil programmé, appel fait et séance ouverte à l'heure prévue (président : $by). */
    protected function openCouncil(User $by, array $frame = [], array $members = []): Council
    {
        $workflow = app(CouncilWorkflow::class);
        $council = $this->makeCouncil($frame + ['president_id' => $by->id], $members, $by);
        $workflow->schedule($council, $by);
        $council->members()->get()->each(fn ($member) => $member->update(['attendance' => 'present']));
        $workflow->start($council->fresh(), $by, $council->fresh()->scheduled_at->copy());

        return $council->fresh();
    }

    /**
     * Mène un conseil ouvert jusqu'à la clôture : chaque élève reçoit les décisions données (par code de type, par
     * identifiant d'élève) et une appréciation, puis PV soumis, validé et clôturé par la Direction.
     *
     * @param  array<int, list<array{0: string, 1?: string}>>  $decisions  student_id => [[code, motif], …]
     */
    protected function closeCouncil(Council $council, User $president, array $decisions = []): Council
    {
        $session = app(CouncilSession::class);
        foreach ($council->students()->get() as $row) {
            $session->saveStudent($council->fresh(), $row, [
                'general_appreciation' => "Appréciation de l'élève {$row->student_id}",
                'review_status' => 'reviewed',
                'decisions' => collect($decisions[$row->student_id] ?? [])->map(fn (array $pick) => [
                    'decision_type_id' => DecisionType::where('code', $pick[0])->value('id'),
                    'reason' => $pick[1] ?? null,
                ])->all(),
            ], $president);
        }
        $session->endDeliberation($council->fresh(), $president);

        $flow = app(CouncilValidationFlow::class);
        $council->update(['general_observations' => 'Observations générales.']);
        $flow->submit($council->fresh(), $president);
        $flow->approvePedagogical($council->fresh(), $this->staff('responsable-pedagogique'));
        $flow->close($council->fresh(), $this->staff('direction'));

        return $council->fresh();
    }

    /**
     * Un conseil en brouillon pour la classe, au semestre 1, prévu le 20 novembre 2026 : président de la Direction,
     * professeur principal enseignant, secrétaire de la vie scolaire, sauf ce que $frame remplace.
     *
     * @param  list<array<string, mixed>>  $members
     */
    protected function makeCouncil(array $frame = [], array $members = [], ?User $by = null): Council
    {
        $by ??= $this->staff('direction');

        return app(CouncilWorkflow::class)->create($frame + [
            'academic_year_id' => $this->year->id,
            'school_class_id' => $this->class->id,
            'term' => 'Semestre 1',
            'is_end_of_year' => false,
            'scheduled_at' => '2026-11-20 15:00:00',
            'room' => 'Salle 3',
            'president_id' => $by->id,
            'main_teacher_id' => array_key_exists('main_teacher_id', $frame) ? $frame['main_teacher_id'] : $this->teacher('Principal')[0]->id,
            'secretary_id' => null,
        ], $members, $by);
    }
}
