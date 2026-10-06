<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Les documents d'élèves (pièces d'identité, certificats) vivent sur le disque PRIVÉ : aucun lien public, ouverture par
 * une route qui vérifie le droit de voir les élèves. Un fichier resté sur l'ancien disque public est ramené en privé.
 */
class StudentDocumentPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Storage::fake('local');
        Storage::fake('public');

        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $this->student = Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'formation_id' => $formation->id,
            'school_class_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'actif',
        ]);
    }

    private function as(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_an_uploaded_document_is_stored_privately_and_never_on_the_public_disk(): void
    {
        $this->actingAs($this->as('direction'))->post(route('admin.students.documents.store', $this->student), [
            'type' => 'piece_identite', 'title' => 'CNI', 'file' => UploadedFile::fake()->create('cni.pdf', 100, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $document = StudentDocument::firstOrFail();

        Storage::disk('local')->assertExists($document->file_path);
        Storage::disk('public')->assertMissing($document->file_path);
    }

    public function test_only_people_who_may_see_students_can_open_a_document(): void
    {
        Storage::disk('local')->put('student-documents/1/cni.pdf', 'contenu');
        $document = $this->student->documents()->create(['type' => 'piece_identite', 'title' => 'CNI', 'file_path' => 'student-documents/1/cni.pdf', 'uploaded_by' => $this->as('direction')->id]);
        $url = route('admin.students.documents.show', [$this->student, $document]);

        $this->get($url)->assertRedirect(route('login'));
        $this->actingAs($this->as('caissier'))->get($url)->assertForbidden();
        $this->actingAs($this->as('eleve'))->get($url)->assertStatus(403);
        $this->actingAs($this->as('direction'))->get($url)->assertOk();
    }

    public function test_a_document_left_on_the_public_disk_is_moved_to_the_private_one_when_opened(): void
    {
        Storage::disk('public')->put('student-documents/1/ancien.pdf', 'contenu');
        $document = $this->student->documents()->create(['type' => 'piece_identite', 'title' => 'Ancien', 'file_path' => 'student-documents/1/ancien.pdf', 'uploaded_by' => $this->as('direction')->id]);

        $this->actingAs($this->as('direction'))->get(route('admin.students.documents.show', [$this->student, $document]))->assertOk();

        Storage::disk('local')->assertExists('student-documents/1/ancien.pdf');
        Storage::disk('public')->assertMissing('student-documents/1/ancien.pdf');
    }

    public function test_a_document_of_another_student_cannot_be_opened_through_this_one(): void
    {
        Storage::disk('local')->put('student-documents/9/x.pdf', 'contenu');
        $other = Student::create(['matricule' => 'ELV-'.uniqid(), 'first_name' => 'Autre', 'last_name' => 'Fall', 'status' => 'actif']);
        $document = $other->documents()->create(['type' => 'piece_identite', 'title' => 'X', 'file_path' => 'student-documents/9/x.pdf', 'uploaded_by' => $this->as('direction')->id]);

        $this->actingAs($this->as('direction'))->get(route('admin.students.documents.show', [$this->student, $document]))->assertNotFound();
    }

    public function test_the_nightly_command_privatizes_every_remaining_document(): void
    {
        Storage::disk('public')->put('student-documents/1/a.pdf', 'a');
        Storage::disk('public')->put('student-documents/1/b.pdf', 'b');
        foreach (['a', 'b'] as $name) {
            $this->student->documents()->create(['type' => 'autre', 'title' => $name, 'file_path' => "student-documents/1/{$name}.pdf", 'uploaded_by' => $this->as('direction')->id]);
        }

        $this->artisan('app:privatize-student-documents')->assertSuccessful();

        Storage::disk('public')->assertMissing('student-documents/1/a.pdf');
        Storage::disk('local')->assertExists('student-documents/1/b.pdf');
    }
}
