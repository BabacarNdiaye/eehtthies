<?php

namespace Tests\Feature;

use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class HrDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function staffUser(): User
    {
        Permission::firstOrCreate(['name' => 'voir_utilisateurs', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'direction-test', 'guard_name' => 'web']);
        $role->givePermissionTo('voir_utilisateurs');

        $user = User::factory()->create();
        $user->assignRole('direction-test');

        return $user;
    }

    public function test_the_dashboard_unifies_admin_staff_and_teachers_into_one_directory(): void
    {
        $staff = $this->staffUser();
        User::factory()->create(['position' => 'Comptable', 'monthly_salary' => 250000]);
        Teacher::create(['matricule' => 'PROF-1', 'first_name' => 'Fatou', 'last_name' => 'Ba', 'specialty' => 'Cuisine', 'status' => 'actif']);

        $response = $this->actingAs($staff)->get(route('admin.hr.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Hr/Index')
            ->where('summary.teachers', 1)
            ->has('directory', 3) // staffUser + le nouvel utilisateur admin + l'enseignant
        );
    }

    public function test_monthly_payroll_sums_admin_staff_salaries_only(): void
    {
        $staff = $this->staffUser();
        User::factory()->create(['monthly_salary' => 100000]);
        User::factory()->create(['monthly_salary' => 50000]);
        Teacher::create(['matricule' => 'PROF-2', 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif']);

        $response = $this->actingAs($staff)->get(route('admin.hr.index'));

        $response->assertInertia(fn ($page) => $page->where('summary.monthlyPayroll', 150000));
    }

    public function test_a_user_without_the_permission_is_forbidden(): void
    {
        $user = User::factory()->create();
        $user->assignRole(Role::firstOrCreate(['name' => 'no-permission-test', 'guard_name' => 'web']));

        $this->actingAs($user)->get(route('admin.hr.index'))->assertForbidden();
    }

    public function test_the_dashboard_exposes_leave_departments_and_incomplete_files(): void
    {
        $staff = $this->staffUser();
        $member = User::factory()->create(['department' => 'Comptabilité', 'hire_date' => now()->subYears(2)->toDateString()]);
        \App\Models\LeaveRequest::create([
            'user_id' => $member->id, 'type' => 'conge_paye', 'status' => 'en_attente',
            'start_date' => now()->addDays(3)->toDateString(), 'end_date' => now()->addDays(8)->toDateString(),
        ]);
        \App\Models\LeaveRequest::create([
            'user_id' => $member->id, 'type' => 'conge_maladie', 'status' => 'approuve',
            'start_date' => now()->subDay()->toDateString(), 'end_date' => now()->addDay()->toDateString(),
        ]);

        $this->actingAs($staff)->get(route('admin.hr.index'))->assertOk()->assertInertia(fn ($page) => $page
            ->where('summary.pendingLeaves', 1)
            ->where('summary.onLeaveToday', 1)
            ->has('leave.pending', 1)
            ->has('leave.today', 1)
            ->has('departments')
            ->where('faculty.withoutSchedule', 0)
            ->has('faculty.teachers', 0)
            ->has('recentHires', 1)
            ->has('incomplete')
            ->where('can.payroll', false)
        );
    }
}
