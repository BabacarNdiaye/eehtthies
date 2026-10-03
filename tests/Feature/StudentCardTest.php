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

/**
 * Carte d'étudiant plein écran (onglet « Ma carte » de l'application mobile) : données d'identité et code QR de
 * pointage, réservées à l'élève lui-même et jamais mises en cache par le navigateur ou un intermédiaire.
 */
class StudentCardTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        $this->user = User::factory()->create();
        $this->user->assignRole('eleve');
        $this->student = Student::create([
            'user_id' => $this->user->id, 'matricule' => 'EEHT-001', 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif',
            'formation_id' => $formation->id, 'school_class_id' => $class->id, 'academic_year_id' => $year->id, 'photo' => 'students/photos/awa.jpg',
        ]);
    }

    public function test_the_student_gets_the_identity_and_the_qr_code_of_the_card(): void
    {
        $response = $this->actingAs($this->user)->getJson(route('student.card'));

        $response->assertOk()
            ->assertJsonPath('name', 'Awa Diop')
            ->assertJsonPath('matricule', 'EEHT-001')
            ->assertJsonPath('formation', 'BTS Cuisine')
            ->assertJsonPath('class_name', 'BTS1')
            ->assertJsonPath('academic_year', '2026-2027')
            ->assertJsonPath('photo', '/storage/students/photos/awa.jpg')
            ->assertJsonStructure(['name', 'matricule', 'formation', 'class_name', 'academic_year', 'photo', 'qr']);

        $svg = base64_decode($response->json('qr'), true);

        $this->assertNotFalse($svg);
        $this->assertStringContainsString('<svg', $svg);
    }

    public function test_the_card_is_never_cached(): void
    {
        $response = $this->actingAs($this->user)->getJson(route('student.card'));

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_the_qr_code_encodes_the_students_badge_token(): void
    {
        $this->actingAs($this->user)->getJson(route('student.card'))->assertOk();

        $this->assertNotEmpty($this->student->fresh()->qr_token);
    }

    public function test_only_students_can_open_the_card(): void
    {
        foreach (['enseignant', 'parent', 'comptable'] as $role) {
            $other = User::factory()->create();
            $other->assignRole($role);

            $this->actingAs($other)->getJson(route('student.card'))->assertForbidden();
        }

        auth()->logout();
        $this->getJson(route('student.card'))->assertUnauthorized();
    }
}
