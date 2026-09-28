<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrainingAttestationTest extends TestCase
{
    use RefreshDatabase;

    private function makeStudent(string $status = 'actif'): Student
    {
        $formation = Formation::create(['name' => 'CAP Restauration', 'code' => 'CAP-'.uniqid(), 'slug' => 'cap-'.uniqid(), 'diploma' => 'CAP']);
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $class = SchoolClass::create(['name' => 'Classe Attestation', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        return Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test',
            'formation_id' => $formation->id, 'school_class_id' => $class->id, 'academic_year_id' => $year->id,
            'status' => $status,
        ]);
    }

    public function test_admin_can_generate_an_attestation_for_an_active_non_graduated_student(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');
        $student = $this->makeStudent('actif');

        $response = $this->actingAs($user)->get(route('admin.students.attestation', $student));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $student->refresh();
        $this->assertNotNull($student->training_attestation_number);
        $this->assertStringStartsWith('ATF-', $student->training_attestation_number);
    }

    public function test_attestation_number_is_stable_across_repeated_downloads(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');
        $student = $this->makeStudent('actif');

        $this->actingAs($user)->get(route('admin.students.attestation', $student));
        $first = $student->refresh()->training_attestation_number;

        $this->actingAs($user)->get(route('admin.students.attestation', $student));
        $second = $student->refresh()->training_attestation_number;

        $this->assertSame($first, $second);
    }

    public function test_attestation_requires_the_student_to_have_a_formation(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');
        $student = $this->makeStudent('actif');
        $student->update(['formation_id' => null]);

        $response = $this->actingAs($user)->get(route('admin.students.attestation', $student));

        $response->assertStatus(422);
    }

    public function test_user_without_permission_cannot_download_an_attestation(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier'); // no eleves permission
        $student = $this->makeStudent('actif');

        $response = $this->actingAs($user)->get(route('admin.students.attestation', $student));

        $response->assertForbidden();
    }

    public function test_generated_attestation_appears_in_the_certificates_index(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');
        $student = $this->makeStudent('actif');
        $student->generateTrainingAttestationNumber();

        $response = $this->actingAs($user)->get(route('admin.certificates.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Certificates/Index')
            ->has('trainingAttestations', 1)
            ->where('trainingAttestations.0.matricule', $student->matricule)
        );
    }
}
