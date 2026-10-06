<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\CouncilPermissions;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $modules = array_keys(config('eeht.permission_modules'));
        $actions = array_keys(config('eeht.permission_actions'));

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$action}_{$module}", 'guard_name' => 'web']);
            }
        }

        $roles = [
            'super-admin' => $modules, // reçoit tout ce qui suit via l'ensemble des permissions
            'direction' => $modules,
            'administration' => [
                'formations', 'candidatures', 'eleves', 'enseignants', 'classes', 'matieres', 'communication',
                'evenements', 'actualites', 'emploi_du_temps', 'presences', 'salles', 'utilisateurs', 'roles',
                'organigramme', 'salaires', 'insertion', 'statistiques', 'parametres',
            ],
            'responsable-pedagogique' => ['formations', 'classes', 'matieres', 'examens', 'notes', 'eleves', 'enseignants', 'emploi_du_temps', 'presences', 'bulletins', 'salles', 'insertion'],
            'comptable' => ['comptabilite', 'statistiques', 'salaires'],
            'caissier' => ['comptabilite'],
            'responsable-stocks' => ['stocks'],
            'responsable-communication' => ['communication', 'actualites', 'evenements', 'galerie', 'temoignages', 'faq'],
            'responsable-marketing' => ['communication', 'statistiques', 'candidatures'],
            'enseignant' => ['notes', 'examens', 'presences', 'emploi_du_temps'],
            'eleve' => [],
            'parent' => [],
        ];

        foreach ($roles as $roleName => $roleModules) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

            if ($roleName === 'super-admin' || $roleName === 'direction') {
                $role->syncPermissions(Permission::all());

                continue;
            }

            $permissions = Permission::where(function ($query) use ($roleModules) {
                foreach ($roleModules as $module) {
                    $query->orWhere('name', 'like', "%_{$module}");
                }
            })->get();

            $role->syncPermissions($permissions);
        }

        // Module Conseil de classe : les rôles « vie scolaire » et « secrétariat » et ce que chaque rôle reçoit
        // du module (en production, la même chose arrive par une migration : ce seeder n'y est pas relancé).
        CouncilPermissions::install();

        $admin = User::firstOrCreate(
            ['email' => 'admin@eeht-thies.sn'],
            [
                'name' => 'Administrateur EEHT',
                'password' => bcrypt('password'),
                'email_verified_at' => now(),
            ]
        );
        $admin->assignRole('super-admin');
    }
}
