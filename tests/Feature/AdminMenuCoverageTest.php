<?php

namespace Tests\Feature;

use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Role;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * Le menu de l'administration (resources/js/lib/adminNav.ts) doit rester d'accord avec les routes et avec les rôles.
 * Ses fonctions `active` ne se lisent pas avec une expression régulière : tests/Support/admin-nav-audit.mjs les
 * exécute avec Node (≥ 22.18 lit le TypeScript tel quel) et ce test lit son rapport. Sans Node, il est sauté.
 *
 * Ce que le rapport garantit : toute page d'administration appartient à une et une seule rubrique (surlignage et fil
 * d'Ariane justes), chaque rubrique s'allume sur sa propre page, aucune adresse, aucun libellé ni aucune icône de
 * groupe n'est répété, la permission d'une rubrique est celle que sa route exige, et chaque rôle ne voit que les
 * pages de son métier.
 */
class AdminMenuCoverageTest extends TestCase
{
    use RefreshDatabase;

    /** Rapport de l'audit, calculé une seule fois : il ne dépend que des routes et des rôles du seeder. */
    private static ?array $report = null;

    private const ROLES = [
        'super-admin', 'direction', 'administration', 'responsable-pedagogique', 'comptable', 'caissier',
        'responsable-stocks', 'responsable-communication', 'responsable-marketing',
    ];

    private const CRUMBS = [
        'admin.invoices.monthly', 'admin.invoices.overdue', 'admin.payment-plans.index', 'admin.online-payments.index', 'admin.invoices.show', 'admin.exams.grades',
        'admin.settings.reset.index', 'admin.products.movements', 'admin.finance.settings',
    ];

    private function report(): array
    {
        if (self::$report !== null) {
            return self::$report;
        }

        $probe = new Process(['node', '-p', "process.features.typescript || ''"]);

        try {
            $probe->run();
        } catch (\Throwable) {
            $this->markTestSkipped('Node.js est introuvable : impossible d\'exécuter le menu.');
        }

        if (! $probe->isSuccessful() || trim($probe->getOutput()) === '') {
            $this->markTestSkipped('Node.js 22.18 ou plus est nécessaire pour lire adminNav.ts.');
        }

        $this->seed(RolesAndPermissionsSeeder::class);

        $input = [
            'routes' => collect(Route::getRoutes()->getRoutes())
                ->map(fn ($route) => [
                    'name' => $route->getName(),
                    'uri' => $route->uri(),
                    'methods' => $route->methods(),
                    'middleware' => array_values(array_filter($route->gatherMiddleware(), 'is_string')),
                ])
                ->all(),
            'roles' => collect(self::ROLES)
                ->mapWithKeys(fn (string $name) => [$name => Role::findByName($name)->permissions->pluck('name')->all()])
                ->all(),
            'crumbs' => self::CRUMBS,
        ];

        $file = tempnam(sys_get_temp_dir(), 'eeht-menu-');
        file_put_contents($file, json_encode($input));

        try {
            $audit = new Process(['node', '--no-warnings', base_path('tests/Support/admin-nav-audit.mjs'), base_path(), $file]);
            $audit->setTimeout(60);
            $audit->run();
        } finally {
            @unlink($file);
        }

        $this->assertTrue($audit->isSuccessful(), "L'audit du menu a échoué :\n".$audit->getErrorOutput());

        return self::$report = json_decode($audit->getOutput(), true, flags: JSON_THROW_ON_ERROR);
    }

    public function test_every_admin_page_belongs_to_exactly_one_menu_entry(): void
    {
        $report = $this->report();

        $this->assertGreaterThan(50, $report['counts']['items'], 'Le menu devrait compter plus de 50 rubriques.');
        $this->assertGreaterThan(100, $report['counts']['pages'], "L'audit devrait avoir examiné plus de 100 pages d'administration.");
        $this->assertSame([], $report['problems'], "Le menu est incohérent :\n- ".implode("\n- ", $report['problems']));
    }

    public function test_the_stock_manager_only_sees_stock_pages(): void
    {
        $this->assertEqualsCanonicalizing(
            ['admin.dashboard', 'admin.economat.dashboard', 'admin.products.index', 'admin.purchase-orders.index', 'admin.supply-requests.index', 'admin.inventory.index', 'admin.products.movements', 'admin.suppliers.index', 'connect.index', 'admin.leave.index'],
            $this->report()['visible']['responsable-stocks'],
        );
    }

    public function test_the_cashier_sees_tuition_and_cash_pages_but_not_students_or_payroll(): void
    {
        $visible = $this->report()['visible']['caissier'];

        foreach (['admin.cashier.create', 'admin.invoices.index', 'admin.finance.cash-journal'] as $page) {
            $this->assertContains($page, $visible, "Le caissier doit voir {$page}.");
        }

        foreach (['admin.students.index', 'admin.candidatures.index', 'admin.products.index', 'admin.payroll.index', 'admin.roles.index'] as $page) {
            $this->assertNotContains($page, $visible, "Le caissier ne doit pas voir {$page}.");
        }
    }

    public function test_the_accountant_sees_money_and_payroll_but_not_students_or_roles(): void
    {
        $visible = $this->report()['visible']['comptable'];

        foreach (['admin.invoices.index', 'admin.finance.dashboard', 'admin.accounting.journal-entries.index', 'admin.payroll.index', 'admin.salaries.index'] as $page) {
            $this->assertContains($page, $visible, "Le comptable doit voir {$page}.");
        }

        foreach (['admin.students.index', 'admin.roles.index', 'admin.products.index'] as $page) {
            $this->assertNotContains($page, $visible, "Le comptable ne doit pas voir {$page}.");
        }
    }

    public function test_administration_staff_sees_school_life_but_not_the_books(): void
    {
        $visible = $this->report()['visible']['administration'];

        foreach (['admin.students.index', 'admin.candidatures.index', 'admin.pointage.index', 'admin.timetable.index', 'admin.roles.index', 'admin.payroll.index'] as $page) {
            $this->assertContains($page, $visible, "L'administration doit voir {$page}.");
        }

        foreach (['admin.finance.dashboard', 'admin.invoices.index', 'admin.products.index', 'admin.backups.index'] as $page) {
            $this->assertNotContains($page, $visible, "L'administration ne doit pas voir {$page}.");
        }
    }

    public function test_pages_reached_from_a_list_keep_their_rubric_and_a_last_crumb(): void
    {
        $crumbs = $this->report()['crumbs'];

        // Les pages de suivi des élèves sont des onglets de la rubrique « Factures & suivi » ; « Mouvements de stock » et
        // « Réglages des paiements » gardent leur propre rubrique.
        foreach (['admin.invoices.monthly', 'admin.invoices.overdue', 'admin.payment-plans.index', 'admin.online-payments.index'] as $page) {
            $this->assertSame('Factures & suivi', $crumbs[$page]['item'], "{$page} devrait appartenir à « Factures & suivi ».");
        }

        foreach (['admin.products.movements' => 'Mouvements de stock', 'admin.finance.settings' => 'Réglages des paiements'] as $page => $label) {
            $this->assertSame($label, $crumbs[$page]['item'], "{$page} devrait avoir sa propre rubrique.");
            $this->assertFalse($crumbs[$page]['isSubPage'], "{$page} est une page du menu, pas une sous-page.");
            $this->assertNull($crumbs[$page]['leaf']);
        }

        $this->assertSame('Factures & suivi', $crumbs['admin.invoices.show']['item']);
        $this->assertSame('Détail', $crumbs['admin.invoices.show']['leaf']);
        $this->assertSame('Examens & devoirs', $crumbs['admin.exams.grades']['item']);
        $this->assertSame('Notes', $crumbs['admin.exams.grades']['leaf']);
        $this->assertSame('Paramètres', $crumbs['admin.settings.reset.index']['item']);
        $this->assertSame('Réinitialisation', $crumbs['admin.settings.reset.index']['leaf']);
    }
}
