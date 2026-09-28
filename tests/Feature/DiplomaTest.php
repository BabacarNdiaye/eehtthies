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

class DiplomaTest extends TestCase
{
    use RefreshDatabase;

    private function makeGraduatedStudent(): Student
    {
        $formation = Formation::create([
            'name' => 'CAP Restauration',
            'code' => 'DIP-'.uniqid(),
            'slug' => 'cap-restauration-'.uniqid(),
            'diploma' => 'CAP',
        ]);
        $year = AcademicYear::firstOrCreate(
            ['label' => '2026-2027'],
            ['start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]
        );
        $class = SchoolClass::create(['name' => 'Classe Diplome', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        return Student::create([
            'matricule' => 'ELV-'.uniqid(),
            'first_name' => 'Mamadou',
            'last_name' => 'Ndiaye',
            'birth_date' => '1988-07-09',
            'birth_place' => 'Thiès',
            'gender' => 'M',
            'formation_id' => $formation->id,
            'school_class_id' => $class->id,
            'status' => 'diplome',
        ]);
    }

    public function test_diploma_pdf_generates_for_a_graduated_student(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');
        $student = $this->makeGraduatedStudent();

        $response = $this->actingAs($user)->get(route('admin.students.diploma', $student));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $this->assertNotNull($student->fresh()->diploma_number);
    }

    public function test_diploma_pdf_is_refused_for_a_non_graduated_student(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('responsable-pedagogique');
        $student = $this->makeGraduatedStudent();
        $student->update(['status' => 'actif']);

        $response = $this->actingAs($user)->get(route('admin.students.diploma', $student));

        $response->assertStatus(422);
    }

    public function test_verification_page_confirms_an_authentic_diploma(): void
    {
        $student = $this->makeGraduatedStudent();
        $student->generateDiplomaNumber();

        $response = $this->get(route('diplomas.verify', $student->diploma_number));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Public/DiplomaVerification')
            ->where('student.matricule', $student->matricule)
            ->where('student.formation.diploma_full_name', "Certificat d'Aptitude Professionnelle")
            ->where('student.formation.specialty', 'Restauration')
        );
    }

    public function test_verification_page_rejects_an_unknown_diploma_number(): void
    {
        $response = $this->get(route('diplomas.verify', 'DIP-2026-INEXISTANT'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Public/DiplomaVerification')
            ->where('student', null)
        );
    }

    public function test_verification_page_rejects_a_diploma_number_belonging_to_a_non_graduated_student(): void
    {
        $student = $this->makeGraduatedStudent();
        $student->generateDiplomaNumber();
        $student->update(['status' => 'actif']);

        $response = $this->get(route('diplomas.verify', $student->diploma_number));

        $response->assertInertia(fn ($page) => $page->where('student', null));
    }
}
