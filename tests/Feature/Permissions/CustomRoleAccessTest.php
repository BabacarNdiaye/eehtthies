<?php

namespace Tests\Feature\Permissions;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Regression tests for a real bug: creating a custom role from Administration
 * > Rôles & permissions and assigning it to a staff member used to lock that
 * person out of the entire back-office (EnsureUserIsStaff only recognised a
 * fixed list of built-in role names). Fixed by switching to a deny-list
 * (only eleve/parent are portal-only); these tests pin that behaviour down
 * and confirm the granular permissions actually gate each admin route.
 */
class CustomRoleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_a_brand_new_custom_role_can_enter_the_admin_panel(): void
    {
        $role = Role::create(['name' => 'assistant-communication', 'guard_name' => 'web']);
        $role->syncPermissions(['voir_actualites']);

        $user = User::factory()->create();
        $user->assignRole('assistant-communication');

        $this->actingAs($user)->get(route('admin.dashboard'))->assertOk();
    }

    public function test_custom_role_only_sees_what_it_was_granted(): void
    {
        $role = Role::create(['name' => 'assistant-communication', 'guard_name' => 'web']);
        $role->syncPermissions(['voir_actualites', 'ajouter_actualites', 'modifier_actualites']);

        $user = User::factory()->create();
        $user->assignRole('assistant-communication');

        $this->actingAs($user)->get(route('admin.news.index'))->assertOk();
        $this->actingAs($user)->get(route('admin.students.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.salaries.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.backups.index'))->assertForbidden();
    }

    public function test_students_and_parents_are_still_blocked_from_the_admin_panel(): void
    {
        $student = User::factory()->create();
        $student->assignRole('eleve');

        $parent = User::factory()->create();
        $parent->assignRole('parent');

        $this->actingAs($student)->get(route('admin.dashboard'))->assertForbidden();
        $this->actingAs($parent)->get(route('admin.dashboard'))->assertForbidden();
    }

    public function test_seeded_comptable_role_is_restricted_to_finance_related_modules(): void
    {
        $user = User::factory()->create();
        $user->assignRole('comptable');

        $this->actingAs($user)->get(route('admin.invoices.index'))->assertOk();
        $this->actingAs($user)->get(route('admin.salaries.index'))->assertOk();
        $this->actingAs($user)->get(route('admin.accounting.trial-balance'))->assertOk();

        $this->actingAs($user)->get(route('admin.students.index'))->assertForbidden();
        $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_super_admin_has_unrestricted_access(): void
    {
        $admin = User::where('email', 'admin@eeht-thies.sn')->first();

        $this->actingAs($admin)->get(route('admin.salaries.index'))->assertOk();
        $this->actingAs($admin)->get(route('admin.backups.index'))->assertOk();
        $this->actingAs($admin)->get(route('admin.roles.index'))->assertOk();
    }
}
