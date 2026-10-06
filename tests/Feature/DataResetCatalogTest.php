<?php

namespace Tests\Feature;

use App\Support\DataResetCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Verrouille le catalogue de réinitialisation face au schéma réel : une migration future qui ajoute une clé
 * étrangère en cascade (ou une nouvelle table) doit faire échouer ces tests plutôt que de laisser des
 * fichiers orphelins, une suppression incomplète ou une erreur de contrainte en production.
 */
class DataResetCatalogTest extends TestCase
{
    use RefreshDatabase;

    /** Tables jamais vidées par la réinitialisation : infrastructure, comptes, et réglages (liste blanche de clés). */
    private const EXCLUDED_TABLES = [
        'migrations', 'users', 'settings', 'media', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs',
        'sessions', 'password_reset_tokens', 'permissions', 'roles', 'model_has_permissions', 'model_has_roles',
        'role_has_permissions', 'push_subscriptions',
    ];

    /** @return list<string> tables de l'application, sans préfixe de schéma (SQLite renvoie « main.table » par défaut) */
    private function tableNames(): array
    {
        return Schema::getTableListing(schemaQualified: false);
    }

    /** @return array<string, list<array{table: string, action: string}>> enfants (table + action ON DELETE) par table parente */
    private function childrenByParent(): array
    {
        $children = [];

        foreach ($this->tableNames() as $table) {
            foreach (Schema::getForeignKeys($table) as $foreignKey) {
                $children[$foreignKey['foreign_table']][] = [
                    'table' => $table,
                    'action' => strtolower($foreignKey['on_delete']),
                ];
            }
        }

        return $children;
    }

    public function test_keys_are_unique_and_every_requirement_exists(): void
    {
        $keys = DataResetCatalog::keys();

        $this->assertSame($keys, array_values(array_unique($keys)));
        $this->assertGreaterThan(40, count($keys));

        foreach (DataResetCatalog::all() as $key => $category) {
            foreach ($category['requires'] as $required) {
                $this->assertTrue(DataResetCatalog::has($required), "« {$key} » exige « {$required} », qui n'existe pas.");
            }
        }
    }

    public function test_dependencies_have_no_cycle_and_come_before_the_category(): void
    {
        $visit = function (string $key, array $path) use (&$visit): void {
            $this->assertNotContains($key, $path, 'Cycle de dépendances : '.implode(' → ', [...$path, $key]));

            foreach (DataResetCatalog::all()[$key]['requires'] as $required) {
                $visit($required, [...$path, $key]);
            }
        };

        foreach (DataResetCatalog::keys() as $key) {
            $visit($key, []);

            $order = DataResetCatalog::closure([$key]);

            $this->assertSame($key, end($order), "« {$key} » doit être exécutée en dernier de sa fermeture.");
            $this->assertSame($order, array_values(array_unique($order)));

            foreach (DataResetCatalog::all()[$key]['requires'] as $required) {
                $this->assertLessThan(array_search($key, $order, true), array_search($required, $order, true));
            }
        }
    }

    public function test_includes_are_the_transitive_requirements_without_the_category_itself(): void
    {
        $includes = DataResetCatalog::includes('classes');

        $this->assertContains('examens', $includes);
        $this->assertContains('connect', $includes);
        $this->assertNotContains('classes', $includes);
        $this->assertSame([], DataResetCatalog::includes('faq'));

        // Transitif : « formations » exige « classes », qui exige à son tour « examens ».
        $this->assertContains('examens', DataResetCatalog::includes('formations'));
    }

    public function test_declared_tables_and_file_columns_exist(): void
    {
        foreach (DataResetCatalog::all() as $key => $category) {
            foreach ($category['tables'] as $table) {
                $this->assertTrue(Schema::hasTable($table), "« {$key} » : la table {$table} n'existe pas.");
            }

            foreach ($category['files'] as [$table, $column, $disks]) {
                $this->assertTrue(Schema::hasColumn($table, $column), "« {$key} » : la colonne {$table}.{$column} n'existe pas.");
                $this->assertSame([], array_diff($disks, ['public', 'local']), "« {$key} » : disque inconnu pour {$table}.{$column}.");
            }
        }
    }

    public function test_every_table_is_classified_or_explicitly_excluded(): void
    {
        $classified = DataResetCatalog::tables(DataResetCatalog::keys());
        $unclassified = array_values(array_diff($this->tableNames(), $classified, self::EXCLUDED_TABLES));

        $this->assertSame([], $unclassified, 'Tables absentes du catalogue de réinitialisation : '.implode(', ', $unclassified));
    }

    public function test_every_cascading_child_table_is_covered_by_the_category_closure(): void
    {
        $children = $this->childrenByParent();

        foreach (DataResetCatalog::all() as $key => $category) {
            if ($category['scope'] !== null) {
                continue; // les catégories partielles (p. ex. comptes du portail) ne suppriment que certaines lignes
            }

            $covered = DataResetCatalog::tables(DataResetCatalog::closure([$key]));

            foreach ($category['tables'] as $table) {
                foreach ($children[$table] ?? [] as $child) {
                    if (in_array($child['action'], ['set null', 'set default'], true)) {
                        continue; // lien seulement détaché : la ligne enfant survit
                    }

                    $this->assertContains(
                        $child['table'],
                        $covered,
                        "« {$key} » vide {$table}, mais {$child['table']} en dépend ({$child['action']}) sans être incluse."
                    );
                }
            }
        }
    }

    public function test_restricting_children_are_emptied_before_their_parent(): void
    {
        $children = $this->childrenByParent();

        foreach (DataResetCatalog::all() as $key => $category) {
            $ordered = DataResetCatalog::tables(DataResetCatalog::closure([$key]));

            foreach ($category['tables'] as $table) {
                foreach ($children[$table] ?? [] as $child) {
                    if (! in_array($child['action'], ['restrict', 'no action'], true) || $child['table'] === $table) {
                        continue;
                    }

                    $this->assertLessThan(
                        array_search($table, $ordered, true),
                        array_search($child['table'], $ordered, true),
                        "« {$key} » : {$child['table']} doit être vidée avant {$table} (contrainte {$child['action']})."
                    );
                }
            }
        }
    }

    public function test_setting_keys_are_exclusive_and_cover_the_settings_form(): void
    {
        $covered = array_merge(...array_column(DataResetCatalog::all(), 'settings'));

        $this->assertSame($covered, array_values(array_unique($covered)), 'Une clé de réglage figure dans deux catégories.');

        foreach (DataResetCatalog::all() as $key => $category) {
            $this->assertSame([], array_diff($category['setting_files'], $category['settings']), "« {$key} » : fichier de réglage hors liste blanche.");
        }

        // Toute clé acceptée par le formulaire des paramètres doit pouvoir être réinitialisée.
        $source = file_get_contents(app_path('Http/Controllers/Admin/SettingController.php'));
        preg_match_all("/^\s+'([a-z_]+)' => \[/m", $source, $matches);
        $validated = array_map(fn (string $field) => $field === 'logo' ? 'site_logo' : $field, $matches[1]);

        $this->assertNotEmpty($validated);
        $this->assertSame([], array_values(array_diff($validated, $covered)), 'Réglages du formulaire absents du catalogue : '.implode(', ', array_diff($validated, $covered)));
    }

    public function test_restore_seeders_exist_and_the_chart_of_accounts_always_reloads(): void
    {
        foreach (DataResetCatalog::all() as $key => $category) {
            if ($category['restore'] !== null) {
                $this->assertTrue(class_exists($category['restore']), "« {$key} » : seeder de restauration introuvable.");
            }
        }

        $this->assertTrue(DataResetCatalog::find('plan_comptable')['restore_forced']);
        $this->assertSame(['faq', 'formations', 'conseils_reglages', 'plan_comptable'], DataResetCatalog::restorableKeys());
        $this->assertTrue(DataResetCatalog::find('conseils_reglages')['restore_forced'], 'Les réglages du conseil reviennent toujours à leurs valeurs de départ.');
    }
}
