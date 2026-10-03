<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SkillAssessmentTest extends TestCase
{
    use RefreshDatabase;

    private function makeClassWithStudent(string $suffix): array
    {
        $formation = Formation::create([
            'name' => 'Formation Skill'.$suffix,
            'code' => 'SKL'.$suffix.'-'.uniqid(),
            'slug' => 'formation-skill'.strtolower($suffix).'-'.uniqid(),
        ]);
        $year = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]
        );
        $class = SchoolClass::create([
            'name' => 'Classe Skill'.$suffix,
            'formation_id' => $formation->id,
            'academic_year_id' => $year->id,
        ]);
        $student = Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Eleve',
            'last_name' => $suffix,
            'formation_id' => $formation->id,
            'school_class_id' => $class->id,
            'status' => 'actif',
        ]);

        return [$formation, $class, $student];
    }

    private function makeTeacherFor(SchoolClass $class): array
    {
        $user = User::factory()->create();
        $user->assignRole('enseignant');
        $teacher = Teacher::create([
            'user_id' => $user->id,
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Prof',
            'last_name' => 'Test',
            'status' => 'actif',
            'payment_type' => 'fixe',
        ]);
        $subject = Subject::create(['name' => 'Matière Skill', 'coefficient' => 1, 'formation_id' => $class->formation_id]);
        TimetableEntry::create([
            'school_class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'day_of_week' => 1,
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);

        return [$user, $teacher];
    }

    public function test_admin_with_permission_can_create_a_skill(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [$formation] = $this->makeClassWithStudent('A');
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');

        $response = $this->actingAs($user)->post(route('admin.skills.store'), [
            'formation_id' => $formation->id,
            'name' => 'Dressage de table',
            'order' => 1,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('skills', ['name' => 'Dressage de table', 'formation_id' => $formation->id]);
    }

    public function test_user_without_permission_cannot_create_a_skill(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [$formation] = $this->makeClassWithStudent('B');
        $user = User::factory()->create();
        $user->assignRole('caissier'); // pas de permission formations

        $response = $this->actingAs($user)->post(route('admin.skills.store'), [
            'formation_id' => $formation->id,
            'name' => 'Service en salle',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('skills', ['name' => 'Service en salle']);
    }

    public function test_teacher_can_rate_a_student_in_their_own_class(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [$formation, $class, $student] = $this->makeClassWithStudent('C');
        [$user, $teacher] = $this->makeTeacherFor($class);
        $skill = Skill::create(['formation_id' => $formation->id, 'name' => 'Découpe', 'order' => 1]);

        $response = $this->actingAs($user)->post(route('teacher.skills.store'), [
            'school_class_id' => $class->id,
            'student_id' => $student->id,
            'skill_id' => $skill->id,
            'level' => 3,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('skill_assessments', [
            'student_id' => $student->id,
            'skill_id' => $skill->id,
            'teacher_id' => $teacher->id,
            'level' => 3,
        ]);
    }

    public function test_teacher_cannot_rate_a_student_in_a_class_they_do_not_teach(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [$formation, $class, $student] = $this->makeClassWithStudent('D');
        [, $otherClass] = $this->makeClassWithStudent('E');
        [$user] = $this->makeTeacherFor($otherClass);
        $skill = Skill::create(['formation_id' => $formation->id, 'name' => 'Mise en place', 'order' => 1]);

        $response = $this->actingAs($user)->post(route('teacher.skills.store'), [
            'school_class_id' => $class->id,
            'student_id' => $student->id,
            'skill_id' => $skill->id,
            'level' => 2,
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('skill_assessments', ['student_id' => $student->id]);
    }

    public function test_teacher_cannot_rate_with_a_skill_outside_the_students_formation(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [, $class, $student] = $this->makeClassWithStudent('F');
        [$otherFormation] = $this->makeClassWithStudent('G');
        [$user] = $this->makeTeacherFor($class);
        $foreignSkill = Skill::create(['formation_id' => $otherFormation->id, 'name' => 'Autre filière', 'order' => 1]);

        $response = $this->actingAs($user)->post(route('teacher.skills.store'), [
            'school_class_id' => $class->id,
            'student_id' => $student->id,
            'skill_id' => $foreignSkill->id,
            'level' => 2,
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseMissing('skill_assessments', ['student_id' => $student->id]);
    }

    public function test_admin_supervision_index_lists_assessments_and_can_filter_by_class(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [$formation, $class, $student] = $this->makeClassWithStudent('H');
        [, $teacher] = $this->makeTeacherFor($class);
        $skill = Skill::create(['formation_id' => $formation->id, 'name' => 'Accueil client', 'order' => 1]);
        SkillAssessment::create([
            'student_id' => $student->id,
            'skill_id' => $skill->id,
            'teacher_id' => $teacher->id,
            'level' => 4,
            'assessed_at' => now()->toDateString(),
        ]);

        $admin = User::factory()->create();
        $admin->assignRole('responsable-pedagogique');

        $response = $this->actingAs($admin)->get(route('admin.skill-assessments.index', ['school_class_id' => $class->id]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('assessments.data', 1));
    }

    public function test_student_skills_pdf_export_succeeds(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        [$formation, $class, $student] = $this->makeClassWithStudent('I');
        [, $teacher] = $this->makeTeacherFor($class);
        $skill = Skill::create(['formation_id' => $formation->id, 'name' => 'Hygiène', 'order' => 1]);
        SkillAssessment::create([
            'student_id' => $student->id,
            'skill_id' => $skill->id,
            'teacher_id' => $teacher->id,
            'level' => 3,
            'assessed_at' => now()->toDateString(),
        ]);

        $admin = User::factory()->create();
        $admin->assignRole('responsable-pedagogique');

        $response = $this->actingAs($admin)->get(route('admin.students.skills.pdf', $student));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
    }
}
