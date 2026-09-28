<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassMessage;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherClassDiscussionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function makeTeacherWithClass(): array
    {
        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $class = SchoolClass::create(['name' => 'BTS1', 'formation_id' => $formation->id, 'academic_year_id' => $year->id]);
        $subject = Subject::create(['name' => 'Cuisine', 'formation_id' => $formation->id, 'coefficient' => 1]);

        $user = User::factory()->create();
        $user->assignRole('enseignant');
        $teacher = Teacher::create(['matricule' => 'PROF-'.uniqid(), 'first_name' => 'Test', 'last_name' => 'Teacher', 'user_id' => $user->id]);

        TimetableEntry::create([
            'teacher_id' => $teacher->id, 'school_class_id' => $class->id, 'subject_id' => $subject->id, 'day_of_week' => 1,
            'start_time' => '08:00', 'end_time' => '09:00',
        ]);

        return [$user, $teacher, $class];
    }

    public function test_a_teacher_can_read_and_post_to_the_class_discussion_of_a_class_they_teach(): void
    {
        [$user, , $class] = $this->makeTeacherWithClass();

        $response = $this->actingAs($user)->get(route('teacher.class-discussion', $class->id));
        $response->assertOk();

        $post = $this->actingAs($user)->postJson(route('teacher.class-discussion.store', $class->id), ['body' => 'Bonjour la classe']);
        $post->assertOk();
        $this->assertDatabaseHas('class_messages', ['school_class_id' => $class->id, 'user_id' => $user->id, 'body' => 'Bonjour la classe']);
    }

    public function test_a_teacher_cannot_access_the_discussion_of_a_class_they_do_not_teach(): void
    {
        [$user] = $this->makeTeacherWithClass();
        $otherYear = AcademicYear::create(['label' => 'Other', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => false]);
        $otherFormation = Formation::create(['name' => 'Other', 'code' => 'OTH-'.uniqid(), 'slug' => 'oth-'.uniqid()]);
        $otherClass = SchoolClass::create(['name' => 'Other Class', 'formation_id' => $otherFormation->id, 'academic_year_id' => $otherYear->id]);

        $response = $this->actingAs($user)->get(route('teacher.class-discussion', $otherClass->id));
        $response->assertForbidden();
    }

    public function test_admin_with_permission_can_moderate_and_delete_a_class_message(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');

        [, , $class] = $this->makeTeacherWithClass();
        $message = ClassMessage::create(['school_class_id' => $class->id, 'user_id' => $admin->id, 'body' => 'À modérer']);

        $indexResponse = $this->actingAs($admin)->get(route('admin.class-discussions.index'));
        $indexResponse->assertOk();

        $showResponse = $this->actingAs($admin)->get(route('admin.class-discussions.show', $class->id));
        $showResponse->assertOk();

        $this->actingAs($admin)->delete(route('admin.class-discussions.destroy', $message->id));
        $this->assertDatabaseMissing('class_messages', ['id' => $message->id]);
    }
}
