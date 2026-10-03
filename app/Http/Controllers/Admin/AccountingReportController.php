<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntryLine;
use App\Support\Exportable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountingReportController extends Controller
{
    use Exportable;

    private function ledgerLines(Account $account, ?string $from, ?string $to): array
    {
        $openingBalance = 0.0;

        if ($from) {
            $before = JournalEntryLine::where('account_id', $account->id)
                ->whereHas('journalEntry', fn ($q) => $q->where('entry_date', '<', $from))
                ->selectRaw('sum(debit) as d, sum(credit) as c')
                ->first();
            $d = (float) ($before->d ?? 0);
            $c = (float) ($before->c ?? 0);
            $openingBalance = in_array($account->nature, ['actif', 'charge']) ? round($d - $c, 2) : round($c - $d, 2);
        }

        $query = JournalEntryLine::with('journalEntry:id,entry_date,reference,description,journal_id', 'journalEntry.journal:id,code')
            ->where('account_id', $account->id)
            ->whereHas('journalEntry', function ($q) use ($from, $to) {
                if ($from) {
                    $q->where('entry_date', '>=', $from);
                }
                if ($to) {
                    $q->where('entry_date', '<=', $to);
                }
            });

        $running = $openingBalance;
        $lines = $query->get()
            ->sortBy(fn ($l) => $l->journalEntry->entry_date)
            ->values()
            ->map(function (JournalEntryLine $line) use (&$running, $account) {
                $running += in_array($account->nature, ['actif', 'charge'])
                    ? ((float) $line->debit - (float) $line->credit)
                    : ((float) $line->credit - (float) $line->debit);

                return [
                    'date' => $line->journalEntry->entry_date->toDateString(),
                    'journal' => $line->journalEntry->journal->code,
                    'reference' => $line->journalEntry->reference,
                    'description' => $line->label ?? $line->journalEntry->description,
                    'debit' => (float) $line->debit,
                    'credit' => (float) $line->credit,
                    'balance' => round($running, 2),
                ];
            });

        return [$openingBalance, $lines];
    }

    public function ledger(Request $request): Response
    {
        $accountId = $request->integer('account_id') ?: null;
        $from = $request->string('from')->toString() ?: null;
        $to = $request->string('to')->toString() ?: null;

        $account = null;
        $openingBalance = 0.0;
        $lines = collect();

        if ($accountId) {
            $account = Account::findOrFail($accountId);
            [$openingBalance, $lines] = $this->ledgerLines($account, $from, $to);
        }

        return Inertia::render('Admin/Accounting/Ledger', [
            'accounts' => Account::orderBy('code')->get(['id', 'code', 'name', 'nature']),
            'account' => $account,
            'openingBalance' => round($openingBalance, 2),
            'lines' => $lines,
            'filters' => ['account_id' => $accountId, 'from' => $from, 'to' => $to],
        ]);
    }

    public function exportLedger(Request $request)
    {
        $account = Account::findOrFail($request->integer('account_id'));
        $from = $request->string('from')->toString() ?: null;
        $to = $request->string('to')->toString() ?: null;
        [$openingBalance, $lines] = $this->ledgerLines($account, $from, $to);

        $columns = [
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'journal', 'label' => 'Journal'],
            ['key' => 'reference', 'label' => 'Référence'],
            ['key' => 'description', 'label' => 'Libellé'],
            ['key' => 'debit', 'label' => 'Débit', 'align' => 'right'],
            ['key' => 'credit', 'label' => 'Crédit', 'align' => 'right'],
            ['key' => 'balance', 'label' => 'Solde', 'align' => 'right'],
        ];

        $format = $request->string('format')->toString();

        if ($format === 'csv') {
            return $this->csvResponse("grand-livre-{$account->code}.csv", $columns, $lines);
        }

        return $this->pdfResponse(
            "grand-livre-{$account->code}.pdf",
            "Grand livre — {$account->code} {$account->name}",
            $columns,
            $lines,
            null,
            ["Solde d'ouverture" => number_format($openingBalance, 0, ',', ' ').' FCFA'],
        );
    }

    private function trialBalanceRows(?string $from, ?string $to)
    {
        return Account::orderBy('code')->get()->map(function (Account $account) use ($from, $to) {
            $totals = JournalEntryLine::where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($from, $to) {
                    if ($from) {
                        $q->where('entry_date', '>=', $from);
                    }
                    if ($to) {
                        $q->where('entry_date', '<=', $to);
                    }
                })
                ->selectRaw('sum(debit) as d, sum(credit) as c')
                ->first();

            $debit = (float) ($totals->d ?? 0);
            $credit = (float) ($totals->c ?? 0);

            return [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'nature' => $account->nature,
                'debit' => round($debit, 2),
                'credit' => round($credit, 2),
                'balance' => in_array($account->nature, ['actif', 'charge']) ? round($debit - $credit, 2) : round($credit - $debit, 2),
            ];
        })->filter(fn ($r) => $r['debit'] > 0 || $r['credit'] > 0)->values();
    }

    public function trialBalance(Request $request): Response
    {
        $from = $request->string('from')->toString() ?: null;
        $to = $request->string('to')->toString() ?: null;
        $rows = $this->trialBalanceRows($from, $to);

        return Inertia::render('Admin/Accounting/TrialBalance', [
            'rows' => $rows,
            'totalDebit' => round($rows->sum('debit'), 2),
            'totalCredit' => round($rows->sum('credit'), 2),
            'filters' => ['from' => $from, 'to' => $to],
        ]);
    }

    public function exportTrialBalance(Request $request)
    {
        $from = $request->string('from')->toString() ?: null;
        $to = $request->string('to')->toString() ?: null;
        $rows = $this->trialBalanceRows($from, $to)->map(fn ($r) => [
            ...$r,
            'label' => "{$r['code']} — {$r['name']}",
        ]);

        $columns = [
            ['key' => 'label', 'label' => 'Compte'],
            ['key' => 'debit', 'label' => 'Débit', 'align' => 'right'],
            ['key' => 'credit', 'label' => 'Crédit', 'align' => 'right'],
            ['key' => 'balance', 'label' => 'Solde', 'align' => 'right'],
        ];

        if ($request->string('format')->toString() === 'csv') {
            return $this->csvResponse('balance-generale-'.now()->format('Y-m-d').'.csv', $columns, $rows);
        }

        return $this->pdfResponse(
            'balance-generale-'.now()->format('Y-m-d').'.pdf',
            'Balance générale',
            $columns,
            $rows,
        );
    }

    private function balanceSheetData(string $asOf): array
    {
        $fiscalYearStart = now()->parse($asOf)->startOfYear()->toDateString();

        $balances = fn (string $nature, ?string $from = null) => Account::where('nature', $nature)
            ->get()
            ->map(fn (Account $a) => [
                'code' => $a->code,
                'name' => $a->name,
                'balance' => $a->balanceBetween($from, $asOf),
            ])
            ->filter(fn ($r) => abs($r['balance']) > 0.001)
            ->values();

        $actif = $balances('actif');
        $passif = $balances('passif');
        $charges = $balances('charge', $fiscalYearStart);
        $produits = $balances('produit', $fiscalYearStart);

        $resultat = round($produits->sum('balance') - $charges->sum('balance'), 2);

        return [$fiscalYearStart, $actif, $passif, $resultat];
    }

    public function balanceSheet(Request $request): Response
    {
        $asOf = $request->string('as_of')->toString() ?: now()->toDateString();
        [$fiscalYearStart, $actif, $passif, $resultat] = $this->balanceSheetData($asOf);

        return Inertia::render('Admin/Accounting/BalanceSheet', [
            'asOf' => $asOf,
            'fiscalYearStart' => $fiscalYearStart,
            'actif' => $actif,
            'passif' => $passif,
            'resultat' => $resultat,
            'totalActif' => round($actif->sum('balance'), 2),
            'totalPassif' => round($passif->sum('balance') + $resultat, 2),
        ]);
    }

    public function exportBalanceSheet(Request $request)
    {
        $asOf = $request->string('as_of')->toString() ?: now()->toDateString();
        [, $actif, $passif, $resultat] = $this->balanceSheetData($asOf);

        $rows = $actif->map(fn ($r) => ['section' => 'ACTIF', 'label' => "{$r['code']} — {$r['name']}", 'balance' => number_format($r['balance'], 0, ',', ' ').' FCFA'])
            ->concat($passif->map(fn ($r) => ['section' => 'PASSIF', 'label' => "{$r['code']} — {$r['name']}", 'balance' => number_format($r['balance'], 0, ',', ' ').' FCFA']))
            ->push(['section' => 'PASSIF', 'label' => "Résultat de l'exercice", 'balance' => number_format($resultat, 0, ',', ' ').' FCFA']);

        $columns = [
            ['key' => 'section', 'label' => 'Section'],
            ['key' => 'label', 'label' => 'Compte'],
            ['key' => 'balance', 'label' => 'Solde', 'align' => 'right'],
        ];

        return $this->pdfResponse(
            'bilan-'.$asOf.'.pdf',
            'Bilan',
            $columns,
            $rows,
            'Situation patrimoniale au '.now()->parse($asOf)->translatedFormat('d F Y'),
        );
    }

    private function incomeStatementData(string $from, string $to): array
    {
        $rows = fn (string $nature) => Account::where('nature', $nature)
            ->get()
            ->map(fn (Account $a) => [
                'code' => $a->code,
                'name' => $a->name,
                'balance' => $a->balanceBetween($from, $to),
            ])
            ->filter(fn ($r) => abs($r['balance']) > 0.001)
            ->values();

        return [$rows('charge'), $rows('produit')];
    }

    public function incomeStatement(Request $request): Response
    {
        $from = $request->string('from')->toString() ?: now()->startOfYear()->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();
        [$charges, $produits] = $this->incomeStatementData($from, $to);

        return Inertia::render('Admin/Accounting/IncomeStatement', [
            'from' => $from,
            'to' => $to,
            'charges' => $charges,
            'produits' => $produits,
            'totalCharges' => round($charges->sum('balance'), 2),
            'totalProduits' => round($produits->sum('balance'), 2),
            'resultat' => round($produits->sum('balance') - $charges->sum('balance'), 2),
        ]);
    }

    public function exportIncomeStatement(Request $request)
    {
        $from = $request->string('from')->toString() ?: now()->startOfYear()->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();
        [$charges, $produits] = $this->incomeStatementData($from, $to);

        $rows = $charges->map(fn ($r) => ['section' => 'CHARGES', 'label' => "{$r['code']} — {$r['name']}", 'balance' => number_format($r['balance'], 0, ',', ' ').' FCFA'])
            ->concat($produits->map(fn ($r) => ['section' => 'PRODUITS', 'label' => "{$r['code']} — {$r['name']}", 'balance' => number_format($r['balance'], 0, ',', ' ').' FCFA']));

        $columns = [
            ['key' => 'section', 'label' => 'Section'],
            ['key' => 'label', 'label' => 'Compte'],
            ['key' => 'balance', 'label' => 'Solde', 'align' => 'right'],
        ];

        $resultat = round($produits->sum('balance') - $charges->sum('balance'), 2);

        return $this->pdfResponse(
            "compte-resultat-{$from}-au-{$to}.pdf",
            'Compte de résultat',
            $columns,
            $rows,
            'Du '.now()->parse($from)->translatedFormat('d F Y').' au '.now()->parse($to)->translatedFormat('d F Y'),
            ['Résultat net' => number_format($resultat, 0, ',', ' ').' FCFA'],
        );
    }
}
