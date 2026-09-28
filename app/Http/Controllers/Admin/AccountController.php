<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Account::query();

        if ($request->filled('class')) {
            $query->where('class', $request->integer('class'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Admin/Accounting/Accounts/Index', [
            'accounts' => $query->orderBy('code')->get(),
            'natures' => Account::NATURES,
            'filters' => $request->only(['class', 'search']),
        ]);
    }

    private function rules(?Account $account = null): array
    {
        return [
            'code' => ['required', 'string', 'max:10', 'unique:accounts,code'.($account ? ",{$account->id}" : '')],
            'name' => ['required', 'string', 'max:255'],
            'class' => ['required', 'integer', 'between:1,9'],
            'nature' => ['required', 'in:'.implode(',', array_keys(Account::NATURES))],
            'is_active' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        Account::create($request->validate($this->rules()));

        return back()->with('success', 'Compte créé avec succès.');
    }

    public function update(Request $request, Account $account)
    {
        $account->update($request->validate($this->rules($account)));

        return back()->with('success', 'Compte mis à jour avec succès.');
    }

    public function destroy(Account $account)
    {
        if ($account->lines()->exists()) {
            return back()->with('error', 'Ce compte a des écritures et ne peut pas être supprimé. Désactivez-le plutôt.');
        }

        $account->delete();

        return back()->with('success', 'Compte supprimé.');
    }
}
