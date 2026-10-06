<?php

namespace App\Support;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Droits du module Conseil de classe : les quatre modules du catalogue (`config/eeht.php`) et ce que chaque rôle en
 * reçoit (matrice du cahier des charges, §2.2).
 *
 * En production on n'exécute jamais le seeder des rôles : il réinitialise les droits que l'école a réglés. Ces droits
 * arrivent donc par une migration, qui appelle install() : elle ne fait qu'AJOUTER (jamais de retrait ni de remise à
 * zéro d'un rôle), et n'invente pas un rôle de l'école qui n'existe plus. Le seeder l'appelle aussi, pour une
 * installation neuve.
 *
 * Président du conseil, professeur principal et secrétaire ne sont pas des rôles : ce sont des fonctions attribuées
 * par conseil (voir CouncilPolicy). Un enseignant n'a donc aucun droit global ici.
 */
class CouncilPermissions
{
    /**
     * conseils            : voir (liste, détail, archives), ajouter (créer, programmer, dupliquer), modifier (conduire la
     *                       séance, décisions, membres), supprimer (brouillon), valider (étape pédagogique du PV),
     *                       exporter (imprimer et envoyer les documents) ;
     * conseils_direction  : valider = clôturer, rectifier, étape Direction ; voir = tableau de bord ;
     * parametrage_conseils: référentiels, seuils, règles ;
     * discipline          : registre des sanctions.
     */
    public const MODULES = ['conseils', 'conseils_direction', 'parametrage_conseils', 'discipline'];

    /** Rôles que le module introduit (le seeder d'origine ne les connaissait pas). */
    public const NEW_ROLES = ['vie-scolaire', 'secretariat'];

    /** @return list<string> toutes les permissions des quatre modules */
    public static function names(): array
    {
        $names = [];

        foreach (self::MODULES as $module) {
            foreach (array_keys(config('eeht.permission_actions')) as $action) {
                $names[] = "{$action}_{$module}";
            }
        }

        return $names;
    }

    /**
     * Permissions accordées à chaque rôle (en plus de ce qu'il a déjà).
     *
     * @return array<string, list<string>>
     */
    public static function grants(): array
    {
        $all = self::names();

        return [
            'super-admin' => $all,
            'direction' => $all,
            'responsable-pedagogique' => [
                'voir_conseils', 'ajouter_conseils', 'modifier_conseils', 'supprimer_conseils', 'valider_conseils', 'exporter_conseils',
                'voir_conseils_direction',
                'voir_parametrage_conseils', 'modifier_parametrage_conseils',
                'voir_discipline',
            ],
            'vie-scolaire' => [
                'voir_conseils',
                'voir_discipline', 'ajouter_discipline', 'modifier_discipline', 'exporter_discipline',
                'voir_eleves', 'voir_classes',
                'voir_presences', 'ajouter_presences', 'modifier_presences', 'exporter_presences',
            ],
            'secretariat' => [
                'voir_conseils', 'exporter_conseils',
                'voir_eleves', 'voir_classes',
            ],
        ];
    }

    public static function install(): void
    {
        foreach (self::names() as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        foreach (self::NEW_ROLES as $name) {
            Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        foreach (self::grants() as $roleName => $permissions) {
            $role = Role::where('name', $roleName)->where('guard_name', 'web')->first();

            if (! $role) {
                continue;
            }

            foreach ($permissions as $name) {
                Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            }

            $role->givePermissionTo($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
