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
use Tests\TestCase;

class TeacherAttendanceScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_can_record_attendance_for_their_own_class_and_subject(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $formation = Formation::create([
            'name' => 'Formation Scope',
            'code' => 'SCP-'.uniqid(),
            'slug' => 'formation-scope-'.uniqid(),
        ]);
        $academicYear = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]
        );
        $schoolClass = SchoolClass::create([
            'name' => 'Classe Scope',
            'formation_id' => $formation->id,
            'academic_year_id' => $academicYear->id,
        ]);
        $subject = Subject::create(['name' => 'Matière Scope', 'coefficient' => 1, 'formation_id' => $formation->id]);
        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Fatou',
            'last_name' => 'Sarr',
            'school_class_id' => $schoolClass->id,
            'status' => 'actif',
        ]);

        $user = User::factory()->create();
        $user->assignRole('enseignant');
        $teacher = Teacher::create([
            'user_id' => $user->id,
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Ousmane',
            'last_name' => 'Ba',
            'status' => 'actif',
            'payment_type' => 'fixe',
        ]);

        TimetableEntry::create([
            'school_class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'day_of_week' => 1,
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);

        $response = $this->actingAs($user)->post(route('teacher.attendance.store'), [
            'school_class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'date' => '2026-09-28',
            'records' => [
                ['student_id' => $student->id, 'status' => 'present'],
            ],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('attendances', [
            'student_id' => $student->id,
            'subject_id' => $subject->id,
            'status' => 'present',
        ]);
    }

    public function test_teacher_cannot_record_attendance_for_a_class_or_subject_they_do_not_teach(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $formation = Formation::create([
            'name' => 'Formation Scope2',
            'code' => 'SCP2-'.uniqid(),
            'slug' => 'formation-scope2-'.uniqid(),
        ]);
        $academicYear = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]
        );
        $schoolClass = SchoolClass::create([
            'name' => 'Classe Scope2',
            'formation_id' => $formation->id,
            'academic_year_id' => $academicYear->id,
        ]);
        $subject = Subject::create(['name' => 'Matière Scope2', 'coefficient' => 1, 'formation_id' => $formation->id]);
        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Ibrahima',
            'last_name' => 'Sow',
            'school_class_id' => $schoolClass->id,
            'status' => 'actif',
        ]);

        // This teacher has NO TimetableEntry at all for this class/subject.
        $user = User::factory()->create();
        $user->assignRole('enseignant');
        Teacher::create([
            'user_id' => $user->id,
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Aicha',
            'last_name' => 'Diop',
            'status' => 'actif',
            'payment_type' => 'fixe',
        ]);

        $response = $this->actingAs($user)->post(route('teacher.attendance.store'), [
            'school_class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'date' => '2026-09-28',
            'records' => [
                ['student_id' => $student->id, 'status' => 'present'],
            ],
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('attendances', ['student_id' => $student->id]);
    }
}
