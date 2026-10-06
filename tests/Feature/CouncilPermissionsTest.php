<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\CouncilPermissions;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Les droits du module Conseil de classe. En production on n'exécute jamais le seeder des rôles (il réinitialise les
 * rôles de l'école) : ces droits et les deux nouveaux rôles arrivent par une migration qui ne fait qu'AJOUTER.
 */
class CouncilPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private const ACTIONS = ['voir', 'ajouter', 'modifier', 'supprimer', 'valider', 'exporter'];

    private function granted(string $role): array
    {
        return Role::findByName($role)->permissions->pluck('name')->sort()->values()->all();
    }

    public function test_the_four_modules_are_in_the_roles_catalogue(): void
    {
        foreach (CouncilPermissions::MODULES as $module) {
            $this->assertArrayHasKey($module, config('eeht.permission_modules'));
        }
    }

    public function test_install_creates_every_permission_of_the_four_modules(): void
    {
        CouncilPermissions::install();

        foreach (CouncilPermissions::MODULES as $module) {
            foreach (self::ACTIONS as $action) {
                $this->assertTrue(Permission::where('name', "{$action}_{$module}")->exists(), "{$action}_{$module} manque.");
            }
        }
    }

    public function test_install_creates_the_school_life_and_secretariat_roles(): void
    {
        CouncilPermissions::install();

        $this->assertTrue(Role::where('name', 'vie-scolaire')->exists());
        $this->assertTrue(Role::where('name', 'secretariat')->exists());
    }

    public function test_the_migration_has_already_installed_them_on_a_fresh_database(): void
    {
        // Les migrations de la base de test sont celles de la production : sans seeder, les droits sont déjà là.
        $this->assertTrue(Permission::where('name', 'valider_conseils_direction')->exists());
        $this->assertTrue(Role::where('name', 'vie-scolaire')->exists());
        $this->assertTrue(Schema::hasTable('discipline_records'));
    }

    public function test_direction_and_super_admin_receive_everything(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        foreach (['direction', 'super-admin'] as $role) {
            foreach (CouncilPermissions::names() as $name) {
                $this->assertContains($name, $this->granted($role), "{$role} n'a pas {$name}.");
            }
        }
    }

    public function test_the_pedagogical_manager_runs_councils_but_cannot_close_or_rectify(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $granted = $this->granted('responsable-pedagogique');

        foreach (['voir', 'ajouter', 'modifier', 'supprimer', 'valider', 'exporter'] as $action) {
            $this->assertContains("{$action}_conseils", $granted);
        }
        $this->assertContains('voir_conseils_direction', $granted, 'Le tableau de bord lui est ouvert.');
        $this->assertNotContains('valider_conseils_direction', $granted, 'Seule la Direction clôture et rectifie.');
        $this->assertContains('modifier_parametrage_conseils', $granted);
        $this->assertContains('voir_discipline', $granted);
        $this->assertNotContains('modifier_discipline', $granted);
    }

    public function test_school_life_reads_councils_and_keeps_the_discipline_register(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $granted = $this->granted('vie-scolaire');

        $this->assertContains('voir_conseils', $granted);
        $this->assertNotContains('modifier_conseils', $granted);
        $this->assertNotContains('valider_conseils', $granted);
        foreach (['voir', 'ajouter', 'modifier', 'exporter'] as $action) {
            $this->assertContains("{$action}_discipline", $granted);
        }
        $this->assertContains('voir_presences', $granted);
    }

    public function test_the_secretariat_prints_and_archives_but_decides_nothing(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $granted = $this->granted('secretariat');

        $this->assertContains('voir_conseils', $granted);
        $this->assertContains('exporter_conseils', $granted);
        $this->assertNotContains('modifier_conseils', $granted);
        $this->assertNotContains('ajouter_conseils', $granted);
        $this->assertNotContains('voir_discipline', $granted, 'Le secrétariat ne voit pas les sanctions.');
    }

    public function test_teachers_and_the_other_business_roles_get_no_council_permission(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        // Les rôles « eleve » et « parent » sont absents de cette liste à dessein : le seeder d'origine leur donne
        // toutes les permissions (un `where` vide), l'accès au conseil ne doit donc jamais reposer sur une permission
        // seule (voir CouncilPolicy), mais sur le personnel ou l'appartenance au conseil.
        foreach (['enseignant', 'comptable', 'caissier', 'responsable-stocks', 'responsable-communication'] as $role) {
            foreach (CouncilPermissions::names() as $name) {
                $this->assertNotContains($name, $this->granted($role), "{$role} ne doit pas avoir {$name}.");
            }
        }
    }

    public function test_install_is_idempotent(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $permissions = Permission::count();
        $roles = Role::count();
        $grants = $this->granted('responsable-pedagogique');

        CouncilPermissions::install();
        CouncilPermissions::install();

        $this->assertSame($permissions, Permission::count());
        $this->assertSame($roles, Role::count());
        $this->assertSame($grants, $this->granted('responsable-pedagogique'));
    }

    public function test_install_never_removes_what_the_school_configured(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $custom = Role::create(['name' => 'assistant-pedagogie', 'guard_name' => 'web']);
        $custom->syncPermissions(['voir_actualites', 'voir_conseils']);

        Role::findByName('comptable')->givePermissionTo('voir_discipline');

        CouncilPermissions::install();

        $this->assertSame(['voir_actualites', 'voir_conseils'], $this->granted('assistant-pedagogie'));
        $this->assertContains('voir_discipline', $this->granted('comptable'), 'Un droit ajouté à la main reste.');
        $this->assertContains('voir_comptabilite', $this->granted('comptable'));
    }

    public function test_install_skips_roles_that_do_not_exist_yet(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Role::findByName('responsable-pedagogique')->delete();

        CouncilPermissions::install();

        $this->assertFalse(Role::where('name', 'responsable-pedagogique')->exists(), 'Il ne ressuscite pas un rôle supprimé par l\'école.');
    }

    public function test_a_school_life_agent_reaches_the_admin_panel_and_the_register(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $agent = User::factory()->create();
        $agent->assignRole('vie-scolaire');

        $this->actingAs($agent)->get('/dashboard')->assertRedirect(route('admin.dashboard'));
    }

    public function test_the_permission_cache_is_cleared_so_new_grants_apply_at_once(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create();
        $user->assignRole('secretariat');
        $this->assertTrue($user->can('voir_conseils'));

        Role::findByName('secretariat')->revokePermissionTo('voir_conseils');
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->assertFalse($user->fresh()->can('voir_conseils'));

        CouncilPermissions::install();

        $this->assertTrue($user->fresh()->can('voir_conseils'));
    }
}
