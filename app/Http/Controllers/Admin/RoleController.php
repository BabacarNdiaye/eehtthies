<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Roles/Index', [
            'roles' => Role::withCount('permissions', 'users')->orderBy('name')->get(),
            'protectedRoles' => config('eeht.protected_roles'),
        ]);
    }

    public function create(): Response
    {
        return $this->formResponse();
    }

    private function formResponse(?Role $role = null): Response
    {
        return Inertia::render('Admin/Roles/Form', [
            'role' => $role ? [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
            ] : null,
            'modules' => config('eeht.permission_modules'),
            'actions' => config('eeht.permission_actions'),
            'isProtected' => $role && in_array($role->name, config('eeht.protected_roles'), true),
        ]);
    }

    private function permissionRules(): array
    {
        return [
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:roles,name', 'regex:/^[a-z0-9\-]+$/'],
            ...$this->permissionRules(),
        ], [
            'name.regex' => 'Le nom du rôle ne doit contenir que des lettres minuscules, chiffres et tirets (ex: responsable-cuisine).',
        ]);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions'] ?? []);

        activity('roles')
            ->causedBy($request->user())
            ->withProperties(['permissions' => $data['permissions'] ?? []])
            ->log("Rôle « {$role->name} » créé");

        return redirect()->route('admin.roles.index')->with('success', 'Rôle créé avec succès.');
    }

    public function edit(Role $role): Response
    {
        return $this->formResponse($role);
    }

    public function update(Request $request, Role $role)
    {
        $isProtected = in_array($role->name, config('eeht.protected_roles'), true);

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:100', 'regex:/^[a-z0-9\-]+$/',
                Rule::unique('roles', 'name')->ignore($role->id),
            ],
            ...$this->permissionRules(),
        ], [
            'name.regex' => 'Le nom du rôle ne doit contenir que des lettres minuscules, chiffres et tirets (ex: responsable-cuisine).',
        ]);

        if ($isProtected) {
            // Les rôles protégés conservent leur nom et gardent toujours toutes les permissions.
            $role->syncPermissions(Permission::all());

            return back()->with('success', 'Ce rôle système conserve toutes les permissions.');
        }

        $oldPermissions = $role->permissions->pluck('name')->all();
        $role->update(['name' => $data['name']]);
        $role->syncPermissions($data['permissions'] ?? []);

        activity('roles')
            ->causedBy($request->user())
            ->withProperties(['before' => $oldPermissions, 'after' => $data['permissions'] ?? []])
            ->log("Rôle « {$role->name} » modifié");

        return redirect()->route('admin.roles.index')->with('success', 'Rôle mis à jour avec succès.');
    }

    public function destroy(Request $request, Role $role)
    {
        abort_if(in_array($role->name, config('eeht.protected_roles'), true), 422, 'Ce rôle système ne peut pas être supprimé.');

        abort_if($role->users()->exists(), 422, 'Impossible de supprimer un rôle encore attribué à des utilisateurs. Réaffectez-les d\'abord.');

        $name = $role->name;
        $role->delete();

        activity('roles')->causedBy($request->user())->log("Rôle « {$name} » supprimé");

        return back()->with('success', 'Rôle supprimé.');
    }
}
