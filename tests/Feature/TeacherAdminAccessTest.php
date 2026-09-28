<?php

namespace Tests\Feature;

use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression test for a real privilege-scope bug: the `enseignant` role is
 * granted full voir/ajouter/modifier/supprimer permissions on notes, examens,
 * presences and emploi_du_temps so its own portal (Portal\TeacherExamController,
 * Portal\TeacherAttendanceController, etc.) can enforce "only your own classes".
 * The shared Admin\* controllers behind those same permission strings do NOT
 * filter by class ownership, so a teacher who reached them directly could
 * edit any class's exams or attendance. EnsureUserIsStaff must keep teachers
 * portal-only (like students and parents) so they can never reach /admin/*.
 */
class TeacherAdminAccessTest extends TestCase
{
    use RefreshDatabase;

    private function teacherUser(): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('enseignant');

        return $user;
    }

    public function test_teacher_cannot_reach_admin_exams(): void
    {
        $response = $this->actingAs($this->teacherUser())->get(route('admin.exams.index'));

        $response->assertForbidden();
    }

    public function test_teacher_cannot_reach_admin_attendance(): void
    {
        $response = $this->actingAs($this->teacherUser())->get(route('admin.attendance.index'));

        $response->assertForbidden();
    }

    public function test_teacher_cannot_reach_admin_timetable(): void
    {
        $response = $this->actingAs($this->teacherUser())->get(route('admin.timetable.index'));

        $response->assertForbidden();
    }

    public function test_teacher_cannot_reach_admin_dashboard(): void
    {
        $response = $this->actingAs($this->teacherUser())->get(route('admin.dashboard'));

        $response->assertForbidden();
    }

    public function test_teacher_can_still_reach_their_own_portal(): void
    {
        $user = $this->teacherUser();
        Teacher::create([
            'user_id' => $user->id,
            'matricule' => 'ENS-'.uniqid(),
            'first_name' => 'Prof',
            'last_name' => 'Test',
            'status' => 'actif',
            'payment_type' => 'fixe',
        ]);

        $response = $this->actingAs($user)->get(route('teacher.dashboard'));

        $response->assertOk();
    }
}
