<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * La navigation de l'administration est décrite côté navigateur (resources/js/lib/adminNav.ts) et alimente la barre
 * latérale, la feuille Menu, la palette de recherche et la barre du bas. Ce test relit ce fichier pour garantir que
 * chaque rubrique pointe vers une route nommée qui existe et que chaque permission demandée existe vraiment : une
 * faute de frappe produirait une page blanche (Ziggy lève une erreur) ou une rubrique que personne ne verrait.
 */
class AdminNavigationTest extends TestCase
{
    use RefreshDatabase;

    private function navSource(): string
    {
        return file_get_contents(base_path('resources/js/lib/adminNav.ts'));
    }

    public function test_every_navigation_target_is_a_named_route(): void
    {
        preg_match_all("/href: '([a-z0-9.\-]+)'/", $this->navSource(), $matches);
        $hrefs = array_unique($matches[1]);

        $this->assertGreaterThan(60, count($hrefs), 'La navigation devrait compter plus de 60 rubriques.');

        foreach ($hrefs as $name) {
            $this->assertTrue(Route::has($name), "La rubrique « {$name} » ne correspond à aucune route nommée.");
        }
    }

    public function test_each_menu_target_appears_once_in_the_menu(): void
    {
        preg_match('/export const navGroups[^=]*=\s*\[(.*?)\n\];/s', $this->navSource(), $block);
        $this->assertNotEmpty($block, 'Le bloc navGroups est introuvable.');

        preg_match_all("/href: '([a-z0-9.\-]+)'/", $block[1], $matches);

        $repeated = array_keys(array_filter(array_count_values($matches[1]), fn (int $count) => $count > 1));

        $this->assertSame([], $repeated, 'Ces rubriques figurent plusieurs fois dans le menu : '.implode(', ', $repeated));
    }

    public function test_pages_that_used_to_hide_behind_a_button_have_their_own_menu_entry(): void
    {
        preg_match_all("/href: '([a-z0-9.\-]+)'/", $this->navSource(), $matches);

        $expected = [
            'admin.finance.cash-journal' => 'le journal de caisse',
            'admin.finance.settings' => 'les réglages des paiements',
            'admin.products.movements' => 'les mouvements de stock',
        ];

        foreach ($expected as $name => $page) {
            $this->assertContains($name, $matches[1], "Le menu doit mener à {$page} ({$name}) sans passer par le bouton d'une autre page.");
        }
    }

    public function test_follow_up_pages_stay_one_tab_away_from_their_menu_entry(): void
    {
        // Ces pages ne sont plus des rubriques du menu : ce sont des onglets de la rubrique voisine.
        $clusters = [
            'resources/js/Components/Admin/FinanceTabs.tsx' => ['admin.invoices.monthly', 'admin.invoices.overdue', 'admin.payment-plans.index', 'admin.online-payments.index'],
            'resources/js/Components/Admin/ClusterTabs.tsx' => [
                'admin.pointage.register', 'admin.pointage.report',
                'admin.formation-levels.index', 'admin.skills.index',
                'admin.lesson-logs.index', 'admin.follow-ups.index',
            ],
        ];

        foreach ($clusters as $file => $names) {
            $source = file_get_contents(base_path($file));

            foreach ($names as $name) {
                $this->assertStringContainsString("'{$name}'", $source, "L'onglet de {$name} a disparu de {$file}.");
                $this->assertTrue(Route::has($name), "{$name} n'est plus une route.");
            }
        }
    }

    public function test_every_navigation_permission_exists_in_the_catalog(): void
    {
        $known = [];

        foreach (array_keys(config('eeht.permission_actions')) as $action) {
            foreach (array_keys(config('eeht.permission_modules')) as $module) {
                $known[] = "{$action}_{$module}";
            }
        }

        preg_match_all("/permission: '([a-z_]+)'/", $this->navSource(), $matches);
        $permissions = array_unique($matches[1]);

        $this->assertNotEmpty($permissions);

        foreach ($permissions as $permission) {
            $this->assertContains($permission, $known, "La permission « {$permission} » n'existe pas dans config/eeht.php.");
        }
    }

    public function test_quick_actions_are_creation_pages_guarded_by_an_add_permission(): void
    {
        $source = $this->navSource();

        preg_match('/export const quickActions[^=]*=\s*\[(.*?)\n\];/s', $source, $block);
        $this->assertNotEmpty($block, 'Le bloc quickActions est introuvable.');

        preg_match_all("/href: '([a-z0-9.\-]+)'/", $block[1], $hrefs);
        preg_match_all("/permission: '([a-z_]+)'/", $block[1], $permissions);

        $this->assertNotEmpty($hrefs[1]);
        $this->assertCount(count($hrefs[1]), $permissions[1], 'Chaque action rapide doit déclarer sa permission.');

        foreach ($hrefs[1] as $name) {
            $this->assertStringEndsWith('.create', $name);
        }

        foreach ($permissions[1] as $permission) {
            $this->assertStringStartsWith('ajouter_', $permission);
        }
    }

    public function test_dashboard_renders_for_every_staff_role_with_its_own_permissions(): void
    {
        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);

        foreach (['super-admin', 'direction', 'administration', 'comptable', 'caissier', 'responsable-stocks', 'responsable-communication'] as $role) {
            $user = User::factory()->create();
            $user->assignRole($role);

            $this->actingAs($user)
                ->get(route('admin.dashboard'))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Admin/Dashboard')
                    ->has('auth.permissions')
                    ->where('auth.roles.0', $role));
        }
    }

    public function test_a_cashier_only_receives_accounting_permissions(): void
    {
        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);

        $cashier = User::factory()->create();
        $cashier->assignRole('caissier');

        $this->actingAs($cashier)
            ->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.permissions', fn ($permissions) => collect($permissions)->contains('voir_comptabilite')
                    && ! collect($permissions)->contains('voir_eleves')
                    && ! collect($permissions)->contains('voir_candidatures')));
    }
}
