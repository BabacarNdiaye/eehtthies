<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Journal;
use App\Models\JournalEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class JournalEntryController extends Controller
{
    public function index(Request $request): Response
    {
        $query = JournalEntry::with(['journal:id,code,name', 'lines.account:id,code,name'])->withCount('lines');

        if ($request->filled('journal_id')) {
            $query->where('journal_id', $request->integer('journal_id'));
        }

        if ($request->filled('from')) {
            $query->where('entry_date', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->where('entry_date', '<=', $request->string('to'));
        }

        return Inertia::render('Admin/Accounting/JournalEntries/Index', [
            'entries' => $query->latest('entry_date')->latest('id')->paginate(20)->withQueryString(),
            'journals' => Journal::orderBy('code')->get(['id', 'code', 'name']),
            'filters' => $request->only(['journal_id', 'from', 'to']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Accounting/JournalEntries/Form', [
            'journals' => Journal::orderBy('code')->get(['id', 'code', 'name']),
            'accounts' => Account::where('is_active', true)->orderBy('code')->get(['id', 'code', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'journal_id' => ['required', 'exists:journals,id'],
            'entry_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'exists:accounts,id'],
            'lines.*.label' => ['nullable', 'string', 'max:255'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
        ]);

        $totalDebit = round(collect($data['lines'])->sum(fn ($l) => (float) ($l['debit'] ?? 0)), 2);
        $totalCredit = round(collect($data['lines'])->sum(fn ($l) => (float) ($l['credit'] ?? 0)), 2);

        if ($totalDebit <= 0 || $totalDebit !== $totalCredit) {
            throw ValidationException::withMessages([
                'lines' => "L'écriture n'est pas équilibrée : le total des débits ({$totalDebit}) doit être égal au total des crédits ({$totalCredit}) et supérieur à zéro.",
            ]);
        }

        DB::transaction(function () use ($data, $request) {
            $entry = JournalEntry::create([
                'journal_id' => $data['journal_id'],
                'entry_date' => $data['entry_date'],
                'description' => $data['description'],
                'is_auto' => false,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['lines'] as $line) {
                $debit = (float) ($line['debit'] ?? 0);
                $credit = (float) ($line['credit'] ?? 0);

                if ($debit <= 0 && $credit <= 0) {
                    continue;
                }

                $entry->lines()->create([
                    'account_id' => $line['account_id'],
                    'label' => $line['label'] ?? null,
                    'debit' => $debit,
                    'credit' => $credit,
                ]);
            }
        });

        return redirect()->route('admin.accounting.journal-entries.index')->with('success', 'Écriture enregistrée avec succès.');
    }

    public function show(JournalEntry $journalEntry): Response
    {
        return Inertia::render('Admin/Accounting/JournalEntries/Show', [
            'entry' => $journalEntry->load(['journal', 'lines.account', 'createdBy:id,name', 'entryable']),
        ]);
    }

    public function destroy(JournalEntry $journalEntry)
    {
        if ($journalEntry->is_auto) {
            return back()->with('error', 'Cette écriture est générée automatiquement. Modifiez ou supprimez la facture, le paiement ou la dépense d\'origine.');
        }

        $journalEntry->delete();

        return redirect()->route('admin.accounting.journal-entries.index')->with('success', 'Écriture supprimée.');
    }
}
