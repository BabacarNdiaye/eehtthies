<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\InternalMessage;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_the_directory_lists_active_students_and_teachers_with_accounts(): void
    {
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);

        $studentUser = User::factory()->create();
        $studentUser->assignRole('eleve');
        Student::create(['matricule' => 'ELV-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Test', 'formation_id' => $formation->id, 'school_class_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'actif', 'user_id' => $studentUser->id]);

        $teacherUser = User::factory()->create();
        $teacherUser->assignRole('enseignant');
        Teacher::create(['matricule' => 'PROF-'.uniqid(), 'first_name' => 'Modou', 'last_name' => 'Diop', 'user_id' => $teacherUser->id]);

        $viewer = User::factory()->create();
        $viewer->assignRole('eleve');

        $response = $this->actingAs($viewer)->get(route('directory.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Portal/Directory')
            ->has('students', 1)
            ->has('teachers', 1)
        );
    }

    public function test_a_user_can_start_a_new_conversation_from_the_directory(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $response = $this->actingAs($sender)->postJson(route('notifications.store'), [
            'recipient_id' => $recipient->id, 'subject' => 'Bonjour', 'body' => 'Salut, comment ça va ?',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('internal_messages', [
            'sender_id' => $sender->id, 'recipient_id' => $recipient->id, 'subject' => 'Bonjour',
        ]);
        $message = InternalMessage::first();
        $this->assertSame($message->id, $message->thread_id);
    }

    public function test_a_user_cannot_start_a_conversation_with_themselves(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('notifications.store'), [
            'recipient_id' => $user->id, 'subject' => 'Bonjour', 'body' => 'Test',
        ]);

        $response->assertStatus(422);
    }
}
