<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\Formation;
use App\Models\InternalMessage;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Formation $formation;

    private SchoolClass $class;

    private AcademicYear $year;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('super-admin');

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $this->class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
    }

    private function makeStudentUser(?int $formationId = null, ?int $classId = null, string $status = 'actif'): User
    {
        $user = User::factory()->create();
        $user->assignRole('eleve');
        Student::create([
            'matricule' => 'ELV-'.uniqid(), 'first_name' => 'Test', 'last_name' => 'Student',
            'formation_id' => $formationId ?? $this->formation->id, 'school_class_id' => $classId ?? $this->class->id,
            'academic_year_id' => $this->year->id, 'status' => $status, 'user_id' => $user->id,
        ]);

        return $user;
    }

    private function makeTeacherUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('enseignant');
        Teacher::create(['matricule' => 'PROF-'.uniqid(), 'first_name' => 'Test', 'last_name' => 'Teacher', 'user_id' => $user->id]);

        return $user;
    }

    public function test_announcement_to_a_class_only_reaches_active_students_of_that_class(): void
    {
        Notification::fake();

        $inClass = $this->makeStudentUser();
        $otherClass = SchoolClass::create(['name' => 'BTS2', 'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id]);
        $notInClass = $this->makeStudentUser($this->formation->id, $otherClass->id);
        $inactiveInClass = $this->makeStudentUser($this->formation->id, $this->class->id, 'abandon');

        $response = $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Réunion', 'body' => 'RDV demain', 'priority' => 'normale',
            'audience_type' => 'classe', 'audience_id' => $this->class->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('internal_messages', ['recipient_id' => $inClass->id, 'subject' => 'Réunion']);
        $this->assertDatabaseMissing('internal_messages', ['recipient_id' => $notInClass->id]);
        $this->assertDatabaseMissing('internal_messages', ['recipient_id' => $inactiveInClass->id]);
    }

    public function test_announcement_to_the_whole_school_reaches_students_teachers_and_staff(): void
    {
        Notification::fake();

        $student = $this->makeStudentUser();
        $teacher = $this->makeTeacherUser();
        $staff = User::factory()->create();
        $staff->assignRole('responsable-pedagogique');

        $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Rentrée', 'body' => 'Bienvenue', 'priority' => 'normale', 'audience_type' => 'ecole',
        ]);

        $this->assertDatabaseHas('internal_messages', ['recipient_id' => $student->id]);
        $this->assertDatabaseHas('internal_messages', ['recipient_id' => $teacher->id]);
        $this->assertDatabaseHas('internal_messages', ['recipient_id' => $staff->id]);
    }

    public function test_urgent_priority_prefixes_the_message_subject(): void
    {
        Notification::fake();
        $student = $this->makeStudentUser();

        $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Alerte', 'body' => 'Info importante', 'priority' => 'urgente',
            'audience_type' => 'classe', 'audience_id' => $this->class->id,
        ]);

        $this->assertDatabaseHas('internal_messages', ['recipient_id' => $student->id, 'subject' => '[URGENT] Alerte']);
    }

    public function test_bulk_announcement_creation_does_not_send_synchronous_pushes(): void
    {
        Notification::fake();
        $this->makeStudentUser();

        $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Info', 'body' => 'Contenu', 'priority' => 'normale',
            'audience_type' => 'classe', 'audience_id' => $this->class->id,
        ]);

        Notification::assertNothingSent();
        $this->assertSame(1, InternalMessage::whereNull('pushed_at')->count());
    }

    public function test_announcement_records_the_final_recipient_count(): void
    {
        Notification::fake();
        $this->makeStudentUser();
        $this->makeStudentUser();

        $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Info', 'body' => 'Contenu', 'priority' => 'normale',
            'audience_type' => 'classe', 'audience_id' => $this->class->id,
        ]);

        $this->assertSame(2, Announcement::first()->recipients_count);
    }

    public function test_a_user_without_the_permission_cannot_send_an_announcement(): void
    {
        $user = User::factory()->create();
        $user->assignRole('caissier');

        $response = $this->actingAs($user)->post(route('admin.announcements.store'), [
            'title' => 'Info', 'body' => 'Contenu', 'priority' => 'normale', 'audience_type' => 'ecole',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseCount('announcements', 0);
    }
}
