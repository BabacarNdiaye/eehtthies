<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\InternalMessage;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherMultiClassMessageTest extends TestCase
{
    use RefreshDatabase;

    private function makeSchoolClass(string $name): SchoolClass
    {
        $formation = Formation::create([
            'name' => $name.' — formation',
            'code' => 'F-'.uniqid(),
            'slug' => 'f-'.uniqid(),
        ]);

        $academicYear = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]
        );

        return SchoolClass::create([
            'name' => $name,
            'formation_id' => $formation->id,
            'academic_year_id' => $academicYear->id,
        ]);
    }

    private function makeStudentIn(SchoolClass $class): Student
    {
        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Test',
            'last_name' => 'Student',
            'school_class_id' => $class->id,
            'status' => 'actif',
        ]);

        $user = User::factory()->create();
        $user->assignRole('eleve');
        $student->update(['user_id' => $user->id]);

        return $student;
    }

    public function test_teacher_can_message_several_classes_at_once(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $classA = $this->makeSchoolClass('Classe A');
        $classB = $this->makeSchoolClass('Classe B');
        $classC = $this->makeSchoolClass('Classe C — not taught by this teacher');

        $teacherUser = User::factory()->create();
        $teacherUser->assignRole('enseignant');
        $teacher = Teacher::create([
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Prof',
            'last_name' => 'Test',
            'user_id' => $teacherUser->id,
        ]);

        $subject = Subject::create(['name' => 'Cuisine', 'code' => 'CUIS-'.uniqid()]);

        foreach ([$classA, $classB] as $class) {
            TimetableEntry::create([
                'teacher_id' => $teacher->id,
                'school_class_id' => $class->id,
                'subject_id' => $subject->id,
                'day_of_week' => 1,
                'start_time' => '08:00',
                'end_time' => '10:00',
            ]);
        }

        $studentA = $this->makeStudentIn($classA);
        $studentB = $this->makeStudentIn($classB);
        $studentC = $this->makeStudentIn($classC);

        $response = $this->actingAs($teacherUser)->post(route('teacher.messages.class'), [
            'school_class_ids' => [$classA->id, $classB->id],
            'subject' => 'Réunion parents-profs',
            'body' => 'Merci de venir samedi.',
        ]);

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('internal_messages', ['recipient_id' => $studentA->user_id, 'subject' => 'Réunion parents-profs']);
        $this->assertDatabaseHas('internal_messages', ['recipient_id' => $studentB->user_id, 'subject' => 'Réunion parents-profs']);
        $this->assertDatabaseMissing('internal_messages', ['recipient_id' => $studentC->user_id]);
        $this->assertEquals(2, InternalMessage::where('subject', 'Réunion parents-profs')->count());
    }

    public function test_teacher_cannot_message_a_class_they_do_not_teach(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $ownClass = $this->makeSchoolClass('Ma classe');
        $otherClass = $this->makeSchoolClass("Classe d'un autre enseignant");

        $teacherUser = User::factory()->create();
        $teacherUser->assignRole('enseignant');
        $teacher = Teacher::create([
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Prof',
            'last_name' => 'Test',
            'user_id' => $teacherUser->id,
        ]);
        $subject = Subject::create(['name' => 'Service', 'code' => 'SERV-'.uniqid()]);

        TimetableEntry::create([
            'teacher_id' => $teacher->id,
            'school_class_id' => $ownClass->id,
            'subject_id' => $subject->id,
            'day_of_week' => 2,
            'start_time' => '10:00',
            'end_time' => '12:00',
        ]);

        $response = $this->actingAs($teacherUser)->post(route('teacher.messages.class'), [
            'school_class_ids' => [$ownClass->id, $otherClass->id],
            'subject' => 'Test',
            'body' => 'Test',
        ]);

        $response->assertForbidden();
    }
}
