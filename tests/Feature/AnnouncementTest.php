<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    public function test_announcement_to_parents_reaches_only_parents_of_active_students(): void
    {
        $parent = User::factory()->create();
        $parent->assignRole('parent');
        $student = $this->makeStudentUser();
        Student::where('user_id', $student->id)->update(['parent_user_id' => $parent->id]);
        $otherParent = User::factory()->create();
        $inactive = $this->makeStudentUser(null, null, 'abandon');
        Student::where('user_id', $inactive->id)->update(['parent_user_id' => $otherParent->id]);

        $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Parents', 'body' => 'Réunion', 'priority' => 'normale', 'audience_type' => 'parents',
        ])->assertRedirect();

        $ids = Announcement::where('title', 'Parents')->firstOrFail()->recipients()->pluck('users.id')->all();
        $this->assertSame([$parent->id], $ids);
    }

    public function test_announcement_to_all_students_excludes_teachers_and_parents(): void
    {
        $student = $this->makeStudentUser();
        $teacher = $this->makeTeacherUser();

        $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Élèves', 'body' => 'Info', 'priority' => 'normale', 'audience_type' => 'eleves',
        ])->assertRedirect();

        $ids = Announcement::where('title', 'Élèves')->firstOrFail()->recipients()->pluck('users.id')->all();
        $this->assertSame([$student->id], $ids);
        $this->assertNotContains($teacher->id, $ids);
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
        $announcement = Announcement::where('title', 'Réunion')->firstOrFail();
        $this->assertDatabaseHas('announcement_user', ['announcement_id' => $announcement->id, 'user_id' => $inClass->id, 'read_at' => null]);
        $this->assertDatabaseMissing('announcement_user', ['user_id' => $notInClass->id]);
        $this->assertDatabaseMissing('announcement_user', ['user_id' => $inactiveInClass->id]);
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

        $this->assertDatabaseHas('announcement_user', ['user_id' => $student->id]);
        $this->assertDatabaseHas('announcement_user', ['user_id' => $teacher->id]);
        $this->assertDatabaseHas('announcement_user', ['user_id' => $staff->id]);
    }

    public function test_announcements_appear_in_the_recipients_connect_feed_and_can_be_marked_read(): void
    {
        Notification::fake();
        $student = $this->makeStudentUser();

        $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Alerte', 'body' => 'Info importante', 'priority' => 'urgente',
            'audience_type' => 'classe', 'audience_id' => $this->class->id,
        ]);

        $this->actingAs($student)->getJson(route('connect.unread-count'))->assertJson(['announcements' => 1]);
        $this->actingAs($student)->getJson(route('connect.announcements'))
            ->assertJsonPath('announcements.0.title', 'Alerte')
            ->assertJsonPath('announcements.0.priority', 'urgente')
            ->assertJsonPath('announcements.0.read', false);

        $this->actingAs($student)->postJson(route('connect.announcements.read', Announcement::first()))->assertOk();
        $this->actingAs($student)->getJson(route('connect.unread-count'))->assertJson(['announcements' => 0]);
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
        $this->assertSame(1, DB::table('announcement_user')->whereNull('pushed_at')->count());
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

    public function test_the_sender_never_receives_their_own_announcement(): void
    {
        Notification::fake();
        $staff = User::factory()->create();
        $staff->assignRole('responsable-communication');

        $this->actingAs($staff)->post(route('admin.announcements.store'), [
            'title' => 'Staff', 'body' => 'Info', 'priority' => 'normale', 'audience_type' => 'ecole',
        ]);
        $this->actingAs($this->admin)->post(route('admin.announcements.store'), [
            'title' => 'Admin', 'body' => 'Info', 'priority' => 'normale', 'audience_type' => 'administration',
        ]);

        $own = Announcement::where('title', 'Staff')->firstOrFail();
        $this->assertDatabaseMissing('announcement_user', ['announcement_id' => $own->id, 'user_id' => $staff->id]);
        $toAdmins = Announcement::where('title', 'Admin')->firstOrFail();
        $this->assertDatabaseMissing('announcement_user', ['announcement_id' => $toAdmins->id, 'user_id' => $this->admin->id]);
        $this->assertDatabaseHas('announcement_user', ['announcement_id' => $toAdmins->id, 'user_id' => $staff->id]);
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
