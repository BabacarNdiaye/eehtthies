<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\DisciplineRecord;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * Registre des sanctions de la vie scolaire : le conseil de classe lit ce qui y est saisi (pastille rouge, bloc
 * « Discipline » de la fiche de l'élève), il n'en saisit jamais lui-même.
 */
class DisciplineTest extends TestCase
{
    use RefreshDatabase;

    private AcademicYear $year;

    private Formation $formation;

    private SchoolClass $class;

    private SchoolClass $otherClass;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $this->class = SchoolClass::create(['name' => 'BTS1 A', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
        $this->otherClass = SchoolClass::create(['name' => 'BTS1 B', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function student(string $first, ?SchoolClass $class = null, string $last = 'Diop'): Student
    {
        $class ??= $this->class;

        return Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => $first, 'last_name' => $last,
            'formation_id' => $this->formation->id, 'school_class_id' => $class->id, 'academic_year_id' => $this->year->id,
            'status' => 'actif',
        ]);
    }

    private function record(Student $student, string $level = 'avertissement', string $date = '2026-10-02', array $attributes = []): DisciplineRecord
    {
        return DisciplineRecord::create($attributes + [
            'student_id' => $student->id,
            'school_class_id' => $student->school_class_id,
            'occurred_on' => $date,
            'level' => $level,
            'reason' => 'Retards répétés en atelier.',
        ]);
    }

    // --- Niveaux --------------------------------------------------------------------------------------------------------

    public function test_levels_are_ranked_from_the_lightest_to_the_heaviest(): void
    {
        $this->assertSame(['avertissement', 'blame', 'exclusion_cours', 'exclusion'], array_keys(DisciplineRecord::LEVELS));
        $this->assertLessThan(DisciplineRecord::rank('blame'), DisciplineRecord::rank('avertissement'));
        $this->assertLessThan(DisciplineRecord::rank('exclusion'), DisciplineRecord::rank('exclusion_cours'));
        $this->assertSame(0, DisciplineRecord::rank('inconnu'), 'Un niveau inconnu ne pèse rien.');
    }

    // --- Accès ----------------------------------------------------------------------------------------------------------

    public function test_school_life_and_direction_open_the_register(): void
    {
        foreach (['vie-scolaire', 'direction', 'responsable-pedagogique'] as $role) {
            $this->actingAs($this->userWithRole($role))->get(route('admin.discipline.index'))->assertOk();
        }
    }

    public function test_secretariat_accounting_and_teachers_do_not_see_the_sanctions(): void
    {
        foreach (['secretariat', 'comptable', 'caissier'] as $role) {
            $this->actingAs($this->userWithRole($role))->get(route('admin.discipline.index'))->assertForbidden();
        }

        $teacher = $this->userWithRole('enseignant');
        $this->actingAs($teacher)->get(route('admin.discipline.index'))->assertForbidden();
    }

    public function test_the_pedagogical_manager_reads_but_cannot_write(): void
    {
        $manager = $this->userWithRole('responsable-pedagogique');
        $student = $this->student('Awa');
        $record = $this->record($student);

        $this->actingAs($manager)->get(route('admin.discipline.create'))->assertForbidden();
        $this->actingAs($manager)->post(route('admin.discipline.store'), [])->assertForbidden();
        $this->actingAs($manager)->get(route('admin.discipline.edit', $record))->assertForbidden();
        $this->actingAs($manager)->delete(route('admin.discipline.destroy', $record))->assertForbidden();
    }

    // --- Liste ----------------------------------------------------------------------------------------------------------

    public function test_the_register_lists_sanctions_with_their_student_class_and_level(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $record = $this->record($this->student('Awa'), 'blame', '2026-10-03', ['days' => null]);

        $this->actingAs($agent)->get(route('admin.discipline.index'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Discipline/Index')
            ->has('records.data', 1)
            ->where('records.data.0.id', $record->id)
            ->where('records.data.0.level', 'blame')
            ->where('records.data.0.level_label', 'Blâme')
            ->where('records.data.0.student.name', 'Awa Diop')
            ->where('records.data.0.school_class.name', 'BTS1 A')
            ->where('records.data.0.occurred_on', '2026-10-03')
            ->has('levels')
            ->where('summary.total', 1)
            ->where('summary.by_level.blame', 1));
    }

    public function test_the_register_filters_by_class_level_period_and_name(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $awa = $this->student('Awa');
        $moussa = $this->student('Moussa', $this->otherClass, 'Fall');
        $this->record($awa, 'avertissement', '2026-09-20');
        $this->record($awa, 'exclusion_cours', '2026-10-04');
        $this->record($moussa, 'exclusion', '2026-10-05');

        $count = fn (array $query) => $this->actingAs($agent)->get(route('admin.discipline.index', $query))
            ->viewData('page')['props']['records']['total'];

        $this->assertSame(3, $count([]));
        $this->assertSame(2, $count(['school_class_id' => $this->class->id]));
        $this->assertSame(1, $count(['level' => 'exclusion']));
        $this->assertSame(2, $count(['from' => '2026-10-01']));
        $this->assertSame(1, $count(['from' => '2026-10-01', 'to' => '2026-10-04', 'school_class_id' => $this->class->id]));
        $this->assertSame(1, $count(['q' => 'fall']));
        $this->assertSame(2, $count(['q' => 'AWA']));
        $this->assertSame(0, $count(['q' => 'zzz']));
    }

    public function test_a_search_with_sql_wildcards_matches_them_literally(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $this->record($this->student('Awa'));

        $total = $this->actingAs($agent)->get(route('admin.discipline.index', ['q' => '%']))->viewData('page')['props']['records']['total'];

        $this->assertSame(0, $total);
    }

    public function test_the_newest_sanction_comes_first(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $student = $this->student('Awa');
        $old = $this->record($student, 'avertissement', '2026-09-10');
        $new = $this->record($student, 'blame', '2026-10-04');

        $ids = collect($this->actingAs($agent)->get(route('admin.discipline.index'))->viewData('page')['props']['records']['data'])->pluck('id')->all();

        $this->assertSame([$new->id, $old->id], $ids);
    }

    // --- Saisie ---------------------------------------------------------------------------------------------------------

    public function test_the_form_offers_active_students_only(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $this->student('Awa');
        $gone = $this->student('Parti');
        $gone->update(['status' => 'abandon']);

        $this->actingAs($agent)->get(route('admin.discipline.create'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Discipline/Form')
            ->where('record', null)
            ->has('students', 1)
            ->where('students.0.name', 'Awa Diop')
            ->has('classes')
            ->has('levels'));
    }

    public function test_a_sanction_is_recorded_with_the_class_of_the_student_and_its_author(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $student = $this->student('Awa');

        $this->actingAs($agent)->post(route('admin.discipline.store'), [
            'student_id' => $student->id,
            'occurred_on' => '2026-10-04',
            'level' => 'exclusion_cours',
            'reason' => 'Perturbation répétée du cours.',
        ])->assertRedirect(route('admin.discipline.index'));

        $record = DisciplineRecord::firstOrFail();
        $this->assertSame($student->id, $record->student_id);
        $this->assertSame($this->class->id, $record->school_class_id);
        $this->assertSame($agent->id, $record->recorded_by);
        $this->assertSame('exclusion_cours', $record->level);
        $this->assertSame('2026-10-04', $record->occurred_on->toDateString());
    }

    public function test_days_are_kept_for_a_temporary_exclusion_only(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $student = $this->student('Awa');
        $payload = ['student_id' => $student->id, 'occurred_on' => '2026-10-04', 'reason' => 'Faits graves.', 'days' => 3];

        $this->actingAs($agent)->post(route('admin.discipline.store'), $payload + ['level' => 'exclusion']);
        $this->actingAs($agent)->post(route('admin.discipline.store'), $payload + ['level' => 'blame']);

        $this->assertSame(3, DisciplineRecord::where('level', 'exclusion')->value('days'));
        $this->assertNull(DisciplineRecord::where('level', 'blame')->value('days'));
    }

    public function test_invalid_input_is_refused(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $student = $this->student('Awa');
        $valid = ['student_id' => $student->id, 'occurred_on' => '2026-10-04', 'level' => 'blame', 'reason' => 'Motif.'];

        $this->actingAs($agent)->post(route('admin.discipline.store'), array_merge($valid, ['level' => 'pendaison']))->assertSessionHasErrors('level');
        $this->actingAs($agent)->post(route('admin.discipline.store'), array_merge($valid, ['reason' => '']))->assertSessionHasErrors('reason');
        $this->actingAs($agent)->post(route('admin.discipline.store'), array_merge($valid, ['student_id' => 999999]))->assertSessionHasErrors('student_id');
        $this->actingAs($agent)->post(route('admin.discipline.store'), array_merge($valid, ['occurred_on' => now()->addDays(2)->toDateString()]))->assertSessionHasErrors('occurred_on');
        $this->actingAs($agent)->post(route('admin.discipline.store'), array_merge($valid, ['level' => 'exclusion', 'days' => 0]))->assertSessionHasErrors('days');

        $this->assertSame(0, DisciplineRecord::count());
    }

    public function test_a_sanction_can_be_corrected_but_keeps_its_original_author_and_class(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $other = $this->userWithRole('direction');
        $student = $this->student('Awa');
        $record = $this->record($student, 'avertissement', '2026-10-02', ['recorded_by' => $other->id]);

        // L'élève change de classe après les faits.
        $student->update(['school_class_id' => $this->otherClass->id]);

        $this->actingAs($agent)->put(route('admin.discipline.update', $record), [
            'student_id' => $student->id,
            'occurred_on' => '2026-10-02',
            'level' => 'blame',
            'reason' => 'Motif précisé.',
        ])->assertRedirect(route('admin.discipline.index'));

        $record->refresh();
        $this->assertSame('blame', $record->level);
        $this->assertSame('Motif précisé.', $record->reason);
        $this->assertSame($other->id, $record->recorded_by);
        $this->assertSame($this->class->id, $record->school_class_id, 'La classe est celle des faits.');
    }

    public function test_only_roles_with_the_delete_permission_remove_a_sanction(): void
    {
        $student = $this->student('Awa');
        $record = $this->record($student);

        $this->actingAs($this->userWithRole('vie-scolaire'))->delete(route('admin.discipline.destroy', $record))->assertForbidden();
        $this->assertSame(1, DisciplineRecord::count());

        $this->actingAs($this->userWithRole('direction'))->delete(route('admin.discipline.destroy', $record))->assertRedirect();
        $this->assertSame(0, DisciplineRecord::count());
    }

    public function test_deleting_a_student_takes_their_sanctions_with_them(): void
    {
        $student = $this->student('Awa');
        $this->record($student);

        $student->delete();

        $this->assertSame(0, DisciplineRecord::count());
    }

    // --- Export ---------------------------------------------------------------------------------------------------------

    public function test_the_export_follows_the_filters_and_needs_the_export_permission(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $awa = $this->student('Awa');
        $moussa = $this->student('Moussa', $this->otherClass, 'Fall');
        $this->record($awa, 'avertissement');
        $this->record($moussa, 'exclusion', '2026-10-05', ['days' => 2]);

        $response = $this->actingAs($agent)->get(route('admin.discipline.export.csv', ['level' => 'exclusion']));
        $response->assertOk();
        $csv = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('Moussa Fall', $csv);
        $this->assertStringNotContainsString('Awa Diop', $csv);
        $this->assertStringContainsString('Exclusion temporaire', $csv);

        $this->actingAs($this->userWithRole('responsable-pedagogique'))->get(route('admin.discipline.export.csv'))->assertForbidden();
    }

    // --- Journal --------------------------------------------------------------------------------------------------------

    public function test_recording_and_changing_a_sanction_is_written_to_the_activity_log(): void
    {
        $agent = $this->userWithRole('vie-scolaire');
        $student = $this->student('Awa');

        $this->actingAs($agent)->post(route('admin.discipline.store'), [
            'student_id' => $student->id, 'occurred_on' => '2026-10-04', 'level' => 'avertissement', 'reason' => 'Motif.',
        ]);
        $record = DisciplineRecord::firstOrFail();
        $this->actingAs($agent)->put(route('admin.discipline.update', $record), [
            'student_id' => $student->id, 'occurred_on' => '2026-10-04', 'level' => 'blame', 'reason' => 'Motif.',
        ]);

        $this->assertSame(['created', 'updated'], Activity::where('log_name', 'discipline')->orderBy('id')->pluck('event')->all());
        $update = Activity::where('log_name', 'discipline')->where('event', 'updated')->firstOrFail();
        // activitylog 5 range les valeurs avant/après dans `attribute_changes`, non dans `properties`.
        $this->assertSame('blame', $update->attribute_changes['attributes']['level']);
        $this->assertSame('avertissement', $update->attribute_changes['old']['level']);
    }
}
