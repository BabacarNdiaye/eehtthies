<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * « Faire l'appel » s'ouvre directement sur le cours en cours (ou sur le point de commencer) de l'enseignant, pour
 * que l'appel se fasse en un geste depuis le téléphone ; une sélection explicite n'est jamais écrasée.
 */
class TeacherAttendanceDefaultTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private SchoolClass $class;

    private Subject $subject;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);

        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $this->subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $formation->id]);
        $this->student = Student::create(['matricule' => 'T-1', 'first_name' => 'Awa', 'last_name' => 'Test', 'status' => 'actif', 'school_class_id' => $this->class->id]);

        $this->user = User::factory()->create();
        $this->user->assignRole('enseignant');
        $teacher = Teacher::create(['user_id' => $this->user->id, 'matricule' => 'ENS-1', 'first_name' => 'Moussa', 'last_name' => 'Ba', 'status' => 'actif']);

        // Lundi de 9 h à 11 h.
        TimetableEntry::create([
            'school_class_id' => $this->class->id, 'subject_id' => $this->subject->id, 'teacher_id' => $teacher->id,
            'day_of_week' => 1, 'start_time' => '09:00:00', 'end_time' => '11:00:00',
        ]);
    }

    private function openAt(string $dateTime, array $query = [])
    {
        $this->travelTo(Carbon::parse($dateTime));

        return $this->actingAs($this->user)->get(route('teacher.attendance.index', $query));
    }

    public function test_the_class_in_progress_is_preselected_with_its_students(): void
    {
        $this->openAt('2026-10-05 09:30:00')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Teacher/Attendance')
            ->where('selectedClassId', $this->class->id)
            ->where('selectedSubjectId', $this->subject->id)
            ->where('date', '2026-10-05')
            ->has('students', 1)
            ->where('students.0.id', $this->student->id));
    }

    public function test_a_class_starting_within_twenty_minutes_is_preselected(): void
    {
        $this->openAt('2026-10-05 08:45:00')->assertInertia(fn (Assert $page) => $page
            ->where('selectedClassId', $this->class->id)
            ->where('selectedSubjectId', $this->subject->id));
    }

    public function test_nothing_is_preselected_when_no_class_is_close(): void
    {
        foreach (['2026-10-05 08:30:00', '2026-10-05 11:00:00', '2026-10-06 09:30:00'] as $moment) {
            $this->openAt($moment)->assertInertia(fn (Assert $page) => $page
                ->where('selectedClassId', null)
                ->where('selectedSubjectId', null)
                ->has('students', 0));
        }
    }

    public function test_an_explicit_empty_selection_is_not_overridden(): void
    {
        $this->openAt('2026-10-05 09:30:00', ['school_class_id' => '', 'subject_id' => '', 'date' => '2026-10-05'])
            ->assertInertia(fn (Assert $page) => $page
                ->where('selectedClassId', null)
                ->where('selectedSubjectId', null));
    }

    public function test_an_explicit_choice_of_another_date_is_honoured(): void
    {
        $this->openAt('2026-10-05 09:30:00', ['school_class_id' => $this->class->id, 'subject_id' => $this->subject->id, 'date' => '2026-09-28'])
            ->assertInertia(fn (Assert $page) => $page
                ->where('selectedClassId', $this->class->id)
                ->where('date', '2026-09-28'));
    }

    public function test_a_teacher_without_timetable_gets_no_default(): void
    {
        $other = User::factory()->create();
        $other->assignRole('enseignant');
        Teacher::create(['user_id' => $other->id, 'matricule' => 'ENS-2', 'first_name' => 'Awa', 'last_name' => 'Sow', 'status' => 'actif']);
        $this->travelTo(Carbon::parse('2026-10-05 09:30:00'));

        $this->actingAs($other)->get(route('teacher.attendance.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('selectedClassId', null)
            ->has('pairs', 0));
    }
}
