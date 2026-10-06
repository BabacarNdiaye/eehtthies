<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** L'enseignant ne voit, dans sa plateforme, que les matières qui lui sont affectées et les devoirs de ces matières. */
class TeacherSubjectScopeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Teacher $teacher;

    private SchoolClass $class;

    private Subject $cooking;

    private Subject $maths;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);

        $formation = Formation::create(['name' => 'BTS', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = AcademicYear::firstOrCreate(['label' => '2026-2027'], ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->class = SchoolClass::create(['name' => 'Cuisine 1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $this->cooking = Subject::create(['name' => 'Cuisine', 'coefficient' => 2, 'formation_id' => $formation->id]);
        $this->maths = Subject::create(['name' => 'Mathématiques', 'coefficient' => 1, 'formation_id' => $formation->id]);

        $this->user = User::factory()->create();
        $this->user->assignRole('enseignant');
        $this->teacher = Teacher::create(['user_id' => $this->user->id, 'matricule' => 'ENS-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif', 'payment_type' => 'fixe']);

        foreach ([$this->cooking, $this->maths] as $i => $subject) {
            TimetableEntry::create(['school_class_id' => $this->class->id, 'subject_id' => $subject->id, 'teacher_id' => $this->teacher->id, 'day_of_week' => $i + 1, 'start_time' => '08:00:00', 'end_time' => '10:00:00']);
            Exam::create(['title' => 'Devoir '.$subject->name, 'type' => 'devoir', 'school_class_id' => $this->class->id, 'subject_id' => $subject->id, 'exam_date' => now()->addDays(3), 'max_score' => 20, 'coefficient' => 1]);
        }
    }

    public function test_the_teacher_only_sees_the_exams_of_the_subjects_assigned_to_them(): void
    {
        $this->teacher->subjects()->sync([$this->cooking->id]);

        $this->actingAs($this->user)->get(route('teacher.exams.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('exams.data', 1)
            ->where('exams.data.0.title', 'Devoir Cuisine'));
    }

    public function test_the_timetable_and_the_dashboard_are_limited_to_assigned_subjects(): void
    {
        $this->teacher->subjects()->sync([$this->cooking->id]);

        $this->actingAs($this->user)->get(route('teacher.timetable'))->assertInertia(fn (Assert $page) => $page
            ->has('entries', 1)
            ->where('entries.0.subject.name', 'Cuisine'));

        $this->actingAs($this->user)->get(route('teacher.dashboard'))->assertInertia(fn (Assert $page) => $page
            ->has('weekEntries', 1)
            ->has('upcomingExams', 1));
    }

    public function test_a_teacher_cannot_schedule_an_exam_in_a_subject_that_is_not_theirs(): void
    {
        $this->teacher->subjects()->sync([$this->cooking->id]);

        $this->actingAs($this->user)->post(route('teacher.exams.store'), [
            'title' => 'Contrôle', 'type' => 'devoir', 'school_class_id' => $this->class->id, 'subject_id' => $this->maths->id,
            'exam_date' => now()->addDays(5)->toDateString(), 'max_score' => 20, 'coefficient' => 1,
        ])->assertForbidden();
    }

    public function test_a_teacher_with_several_subjects_sees_all_of_them(): void
    {
        $this->teacher->subjects()->sync([$this->cooking->id, $this->maths->id]);

        $this->actingAs($this->user)->get(route('teacher.exams.index'))->assertInertia(fn (Assert $page) => $page->has('exams.data', 2));
    }

    public function test_an_older_teacher_file_without_subjects_keeps_the_timetable_scope(): void
    {
        $this->actingAs($this->user)->get(route('teacher.exams.index'))->assertInertia(fn (Assert $page) => $page->has('exams.data', 2));
    }

    public function test_the_admin_form_requires_at_least_one_subject_once_the_catalogue_exists(): void
    {
        $admin = User::where('email', 'admin@eeht-thies.sn')->first();

        $this->actingAs($admin)->post(route('admin.teachers.store'), [
            'matricule' => 'ENS-NEW', 'first_name' => 'Moussa', 'last_name' => 'Ba', 'status' => 'actif', 'payment_type' => 'fixe',
        ])->assertSessionHasErrors('subject_ids');

        $this->actingAs($admin)->post(route('admin.teachers.store'), [
            'matricule' => 'ENS-NEW', 'first_name' => 'Moussa', 'last_name' => 'Ba', 'status' => 'actif', 'payment_type' => 'fixe',
            'subject_ids' => [$this->maths->id],
        ])->assertSessionHasNoErrors();

        $this->assertSame([$this->maths->id], Teacher::where('matricule', 'ENS-NEW')->first()->assignedSubjectIds());
    }
}
