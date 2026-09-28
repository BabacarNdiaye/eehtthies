<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Expense::query();

        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        return Inertia::render('Admin/Expenses/Index', [
            'expenses' => $query->latest('expense_date')->paginate(15)->withQueryString(),
            'categories' => Expense::CATEGORIES,
            'filters' => $request->only(['category']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Expenses/Form', [
            'categories' => Expense::CATEGORIES,
        ]);
    }

    private function rules(): array
    {
        return [
            'category' => ['required', 'in:'.implode(',', array_keys(Expense::CATEGORIES))],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'expense_date' => ['required', 'date'],
            'payment_method' => ['required', 'in:especes,virement,mobile_money,autre'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function store(Request $request)
    {
        Expense::create([...$request->validate($this->rules()), 'recorded_by' => $request->user()->id]);

        return redirect()->route('admin.expenses.index')->with('success', 'Dépense enregistrée avec succès.');
    }

    public function edit(Expense $expense): Response
    {
        return Inertia::render('Admin/Expenses/Form', [
            'expense' => $expense,
            'categories' => Expense::CATEGORIES,
        ]);
    }

    public function update(Request $request, Expense $expense)
    {
        $expense->update($request->validate($this->rules()));

        return redirect()->route('admin.expenses.index')->with('success', 'Dépense mise à jour avec succès.');
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return back()->with('success', 'Dépense supprimée.');
    }
}
