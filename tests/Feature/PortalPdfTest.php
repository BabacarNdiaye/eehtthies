<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Formation;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\View;
use Tests\TestCase;

class PortalPdfTest extends TestCase
{
    use RefreshDatabase;

    private SchoolClass $schoolClass;

    private Subject $subject;

    private Teacher $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->schoolClass = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $this->subject = Subject::create(['name' => 'Pâtisserie', 'coefficient' => 1, 'formation_id' => $formation->id]);

        $teacherUser = User::factory()->create();
        $teacherUser->assignRole('enseignant');
        $this->teacher = Teacher::create([
            'user_id' => $teacherUser->id, 'matricule' => 'ENS-'.uniqid(), 'first_name' => 'Ousmane',
            'last_name' => 'Ba', 'status' => 'actif', 'payment_type' => 'fixe',
        ]);

        TimetableEntry::create([
            'school_class_id' => $this->schoolClass->id, 'subject_id' => $this->subject->id,
            'teacher_id' => $this->teacher->id, 'day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '10:00',
        ]);
    }

    private function makeStudent(string $firstName): Student
    {
        $user = User::factory()->create();
        $user->assignRole('eleve');

        return Student::create([
            'user_id' => $user->id, 'matricule' => 'ELV-'.uniqid(), 'first_name' => $firstName,
            'last_name' => 'Test', 'status' => 'actif', 'school_class_id' => $this->schoolClass->id,
        ]);
    }

    public function test_student_can_download_their_class_timetable(): void
    {
        $student = $this->makeStudent('Awa');

        $response = $this->actingAs($student->user)->get(route('student.timetable.pdf'));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_student_grades_pdf_only_contains_their_own_published_grades(): void
    {
        $student = $this->makeStudent('Awa');
        $classmate = $this->makeStudent('Moussa');

        $published = Exam::create([
            'title' => 'Devoir publié', 'type' => 'devoir', 'school_class_id' => $this->schoolClass->id,
            'subject_id' => $this->subject->id, 'exam_date' => '2026-10-15', 'max_score' => 20,
            'coefficient' => 1, 'is_published' => true,
        ]);
        $draft = Exam::create([
            'title' => 'Devoir brouillon', 'type' => 'devoir', 'school_class_id' => $this->schoolClass->id,
            'subject_id' => $this->subject->id, 'exam_date' => '2026-10-20', 'max_score' => 20,
            'coefficient' => 1, 'is_published' => false,
        ]);
        Grade::create(['exam_id' => $published->id, 'student_id' => $student->id, 'score' => 14.5]);
        Grade::create(['exam_id' => $published->id, 'student_id' => $classmate->id, 'score' => 9]);
        Grade::create(['exam_id' => $draft->id, 'student_id' => $student->id, 'score' => 3]);

        $view = null;
        View::composer('pdf.student_grades', function ($v) use (&$view) {
            $view = $v;
        });

        $response = $this->actingAs($student->user)->get(route('student.grades.pdf'));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $this->assertSame([$published->id], $view->exams->pluck('id')->all());
        $this->assertSame([$student->id], $view->grades->pluck('student_id')->unique()->values()->all());
    }

    public function test_teacher_can_download_their_own_timetable(): void
    {
        $response = $this->actingAs($this->teacher->user)->get(route('teacher.timetable.pdf'));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_portal_pdfs_are_restricted_to_the_matching_role(): void
    {
        $student = $this->makeStudent('Awa');

        $this->actingAs($student->user)->get(route('teacher.timetable.pdf'))->assertForbidden();
        $this->actingAs($this->teacher->user)->get(route('student.grades.pdf'))->assertForbidden();
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get(route('student.timetable.pdf'))->assertRedirect(route('login'));
        $this->get(route('teacher.timetable.pdf'))->assertRedirect(route('login'));
    }
}
