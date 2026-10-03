<?php

namespace Tests\Feature;

use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Test de non-régression pour un vrai bug de portée des privilèges : le rôle `enseignant` reçoit toutes les
 * permissions voir/ajouter/modifier/supprimer sur notes, examens, presences et emploi_du_temps pour que son
 * propre portail (Portal\TeacherExamController, Portal\TeacherAttendanceController, etc.) puisse imposer «
 * uniquement vos propres classes ». Les contrôleurs Admin\* partagés derrière ces mêmes chaînes de permission
 * ne filtrent PAS selon la propriété des classes ; un enseignant qui les atteindrait directement pourrait
 * donc modifier les examens ou la présence de n'importe quelle classe. EnsureUserIsStaff doit garder les
 * enseignants limités au portail (comme les élèves et les parents) pour qu'ils n'atteignent jamais /admin/*.
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
