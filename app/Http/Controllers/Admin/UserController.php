<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Exportable;
use App\Support\InstitutionalEmail;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    use Exportable;

    private function exportColumns(): array
    {
        return [
            ['key' => 'name', 'label' => 'Nom'],
            ['key' => 'email', 'label' => 'E-mail professionnel'],
            ['key' => 'personal_email', 'label' => 'E-mail personnel'],
            ['key' => 'position', 'label' => 'Fonction'],
            ['key' => 'department', 'label' => 'Service'],
            ['key' => 'roles', 'label' => 'Rôles'],
            ['key' => 'status', 'label' => 'Statut'],
        ];
    }

    private function exportRows()
    {
        return User::adminStaff()->with('roles:id,name')->orderBy('name')->get()->map(fn (User $u) => [
            'name' => $u->name,
            'email' => $u->email,
            'personal_email' => $u->personal_email,
            'position' => $u->position,
            'department' => $u->department,
            'roles' => $u->roles->pluck('name')->implode(', '),
            'status' => $u->is_active ? 'Actif' : 'Inactif',
        ]);
    }

    public function exportCsv()
    {
        return $this->csvResponse('personnel-'.now()->format('Y-m-d').'.csv', $this->exportColumns(), $this->exportRows());
    }

    public function exportPdf()
    {
        return $this->pdfResponse(
            'personnel-'.now()->format('Y-m-d').'.pdf',
            'Personnel administratif',
            $this->exportColumns(),
            $this->exportRows(),
        );
    }

    /**
     * Roles that already have their own dedicated management module
     * (Élèves, Enseignants) and therefore don't belong in the "Personnel"
     * (administrative staff) listing.
     */
    private const NON_ADMIN_ROLES = ['enseignant', 'eleve', 'parent'];

    private function adminStaffRoles()
    {
        return Role::whereNotIn('name', self::NON_ADMIN_ROLES)->orderBy('name')->pluck('name');
    }

    /** Possible managers for the "reports to" field: other admin staff. */
    private function possibleManagers(?User $exclude = null)
    {
        return User::adminStaff()
            ->when($exclude, fn ($q) => $q->where('id', '!=', $exclude->id))
            ->orderBy('name')
            ->get(['id', 'name', 'position']);
    }

    public function index(Request $request): Response
    {
        $query = User::with('roles:id,name')->adminStaff();

        if ($request->filled('role')) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $request->string('role')));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Admin/Users/Index', [
            'users' => $query->latest()->paginate(15)->withQueryString(),
            'roles' => $this->adminStaffRoles(),
            'filters' => $request->only(['role', 'search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Users/Form', [
            'roles' => $this->adminStaffRoles(),
            'managers' => $this->possibleManagers(),
        ]);
    }

    private function rules(?User $user = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [$user ? 'required' : 'nullable', 'email', 'max:255', 'unique:users,email'.($user ? ",{$user->id}" : '')],
            'personal_email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'position' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'hire_date' => ['nullable', 'date'],
            'monthly_salary' => ['nullable', 'numeric', 'min:0'],
            'manager_id' => array_filter([
                'nullable',
                Rule::exists('users', 'id'),
                $user ? Rule::notIn([$user->id]) : null,
                function ($attribute, $value, $fail) use ($user) {
                    if (! $value || ! $user) {
                        return;
                    }
                    // Prevent creating a reporting cycle by walking up the proposed manager's chain.
                    $current = User::find($value);
                    while ($current) {
                        if ($current->id === $user->id) {
                            $fail("Cette hiérarchie créerait une boucle : {$user->name} gère déjà ce responsable, directement ou indirectement.");

                            return;
                        }
                        $current = $current->manager_id ? User::find($current->manager_id) : null;
                    }
                },
            ]),
            'password' => [$user ? 'nullable' : 'required', Password::defaults()],
            'is_active' => ['boolean'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['exists:roles,name'],
            'avatar' => ['nullable', 'image', 'max:2048'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $roles = $data['roles'] ?? [];
        unset($data['roles']);

        if (empty($data['email'])) {
            $data['email'] = InstitutionalEmail::generate($data['name']);
        }

        $data['password'] = bcrypt($data['password']);

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        } else {
            unset($data['avatar']);
        }

        $user = User::create($data);
        $user->syncRoles($roles);

        return redirect()->route('admin.users.index')->with('success', 'Membre du personnel créé avec succès.');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('Admin/Users/Form', [
            'editUser' => $user->load('roles:id,name'),
            'roles' => $this->adminStaffRoles(),
            'managers' => $this->possibleManagers($user),
        ]);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate($this->rules($user));

        $roles = $data['roles'] ?? [];
        unset($data['roles']);

        if (! empty($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        } else {
            unset($data['password']);
        }

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        } else {
            unset($data['avatar']);
        }

        $oldRoles = $user->roles->pluck('name')->all();
        $user->update($data);
        $user->syncRoles($roles);

        if ($oldRoles !== $roles) {
            activity('personnel')
                ->causedBy($request->user())
                ->performedOn($user)
                ->withProperties(['before' => $oldRoles, 'after' => $roles])
                ->log("Rôles de {$user->name} modifiés");
        }

        return redirect()->route('admin.users.index')->with('success', 'Membre du personnel mis à jour avec succès.');
    }

    public function destroy(Request $request, User $user)
    {
        abort_if($user->id === $request->user()->id, 422, 'Vous ne pouvez pas supprimer votre propre compte.');

        $user->delete();

        return back()->with('success', 'Membre du personnel supprimé.');
    }
}
