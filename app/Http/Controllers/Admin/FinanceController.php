<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceController extends Controller
{
    public function dashboard(): Response
    {
        $totalRevenue = (float) Payment::sum('amount');
        $totalExpenses = (float) Expense::sum('amount');
        $treasury = round($totalRevenue - $totalExpenses, 2);

        $totalInvoiced = (float) Invoice::sum('amount') - (float) Invoice::sum('discount');
        $totalOutstanding = round($totalInvoiced - $totalRevenue, 2);

        $monthly = collect(range(5, 0))->map(function ($monthsAgo) {
            $date = Carbon::now()->subMonths($monthsAgo);
            $revenue = Payment::whereYear('paid_at', $date->year)->whereMonth('paid_at', $date->month)->sum('amount');
            $expenses = Expense::whereYear('expense_date', $date->year)->whereMonth('expense_date', $date->month)->sum('amount');

            return [
                'month' => $date->translatedFormat('M Y'),
                'recettes' => (float) $revenue,
                'depenses' => (float) $expenses,
            ];
        });

        $expensesByCategory = Expense::selectRaw('category, sum(amount) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        $lowStockProducts = Product::whereColumn('quantity_in_stock', '<=', 'min_threshold')
            ->where('is_active', true)
            ->orderBy('quantity_in_stock')
            ->get(['id', 'name', 'quantity_in_stock', 'min_threshold', 'unit']);

        $today = Carbon::today();
        $thisMonth = (float) Payment::whereYear('paid_at', $today->year)->whereMonth('paid_at', $today->month)->sum('amount');
        $lastMonthDate = $today->copy()->subMonthNoOverflow();
        $lastMonth = (float) Payment::whereYear('paid_at', $lastMonthDate->year)->whereMonth('paid_at', $lastMonthDate->month)->sum('amount');
        $todayPayments = Payment::whereDate('paid_at', $today);

        $open = Invoice::outstanding();
        $overdue = $open->filter(fn (Invoice $i) => $i->due_date && $i->due_date->lt($today));
        $overdueByStudent = $overdue->groupBy('student_id')->map(fn ($rows) => [
            'name' => trim(($rows->first()->student?->first_name ?? '').' '.($rows->first()->student?->last_name ?? '')) ?: '—',
            'matricule' => $rows->first()->student?->matricule,
            'balance' => round($rows->sum('computed_balance'), 2),
            'invoices' => $rows->count(),
            'days' => (int) $rows->max(fn (Invoice $i) => $i->daysPastDue($today) ?? 0),
        ])->sortByDesc('balance')->values()->take(6);

        $byType = Payment::join('invoices', 'invoices.id', '=', 'payments.invoice_id')
            ->selectRaw('invoices.type as type, sum(payments.amount) as total')
            ->groupBy('invoices.type')->pluck('total', 'type');
        $byMethod = Payment::selectRaw('method, sum(amount) as total')->groupBy('method')->pluck('total', 'method');

        $recent = Payment::with('invoice:id,label,type,student_id', 'invoice.student:id,first_name,last_name')
            ->latest('id')->limit(8)->get()->map(fn (Payment $p) => [
                'id' => $p->id,
                'receipt' => $p->receipt_number,
                'student' => trim(($p->invoice?->student?->first_name ?? '').' '.($p->invoice?->student?->last_name ?? '')) ?: '—',
                'label' => $p->invoice?->label,
                'method' => Payment::METHODS[$p->method] ?? $p->method,
                'amount' => (float) $p->amount,
                'date' => $p->paid_at?->toDateString(),
            ]);

        return Inertia::render('Admin/Finance/Dashboard', [
            'insight' => [
                'thisMonth' => $thisMonth,
                'lastMonth' => $lastMonth,
                'todayTotal' => (float) (clone $todayPayments)->sum('amount'),
                'todayCount' => (clone $todayPayments)->count(),
                'invoiced' => round($totalInvoiced, 2),
                'collectionRate' => $totalInvoiced > 0 ? round(min(100, $totalRevenue / $totalInvoiced * 100), 1) : null,
                'overdueTotal' => round($overdue->sum('computed_balance'), 2),
                'overdueCount' => $overdue->count(),
                'overdueStudents' => $overdue->pluck('student_id')->unique()->count(),
                'toCollect' => round($open->sum('computed_balance'), 2),
                'byType' => collect(Invoice::TYPES)->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'total' => (float) ($byType[$key] ?? 0)])->values(),
                'byMethod' => collect(Payment::METHODS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'total' => (float) ($byMethod[$key] ?? 0)])->filter(fn ($m) => $m['total'] > 0)->values(),
                'topOverdue' => $overdueByStudent,
                'recent' => $recent,
            ],
            'kpis' => [
                'total_revenue' => $totalRevenue,
                'total_expenses' => $totalExpenses,
                'treasury' => $treasury,
                'total_outstanding' => max(0, $totalOutstanding),
            ],
            'monthly' => $monthly,
            'expensesByCategory' => $expensesByCategory,
            'categoryLabels' => Expense::CATEGORIES,
            'lowStockProducts' => $lowStockProducts,
        ]);
    }

    public function cashJournal(Request $request): Response
    {
        $from = $request->string('from')->toString() ?: now()->startOfMonth()->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();

        $payments = Payment::with('invoice.student:id,first_name,last_name')
            ->whereBetween('paid_at', [$from, $to])
            ->get()
            ->map(fn ($p) => [
                'date' => $p->paid_at->toDateString(),
                'type' => 'recette',
                'label' => 'Paiement — '.$p->invoice->student->first_name.' '.$p->invoice->student->last_name,
                'amount' => (float) $p->amount,
            ]);

        $expenses = Expense::whereBetween('expense_date', [$from, $to])
            ->get()
            ->map(fn ($e) => [
                'date' => $e->expense_date->toDateString(),
                'type' => 'depense',
                'label' => $e->label,
                'amount' => (float) $e->amount,
            ]);

        $entries = $payments->concat($expenses)->sortBy('date')->values();

        $balance = 0;
        $entries = $entries->map(function ($entry) use (&$balance) {
            $balance += $entry['type'] === 'recette' ? $entry['amount'] : -$entry['amount'];
            $entry['balance'] = round($balance, 2);

            return $entry;
        });

        return Inertia::render('Admin/Finance/CashJournal', [
            'entries' => $entries,
            'from' => $from,
            'to' => $to,
            'totalIn' => $payments->sum('amount'),
            'totalOut' => $expenses->sum('amount'),
        ]);
    }

    public function exportInvoicesCsv(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Référence', 'Élève', 'Type', 'Libellé', 'Montant', 'Remise', 'Payé', 'Solde', "Date d'échéance"]);

            Invoice::with('student')->withSum('payments', 'amount')->chunk(200, function ($invoices) use ($handle) {
                foreach ($invoices as $invoice) {
                    $paid = (float) ($invoice->payments_sum_amount ?? 0);
                    $net = (float) $invoice->amount - (float) $invoice->discount;
                    fputcsv($handle, [
                        $invoice->reference,
                        $invoice->student->first_name.' '.$invoice->student->last_name,
                        Invoice::TYPES[$invoice->type] ?? $invoice->type,
                        $invoice->label,
                        $invoice->amount,
                        $invoice->discount,
                        $paid,
                        round($net - $paid, 2),
                        $invoice->due_date?->toDateString(),
                    ]);
                }
            });

            fclose($handle);
        }, 'factures-'.now()->format('Y-m-d').'.csv');
    }

    public function exportExpensesCsv(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Catégorie', 'Libellé', 'Montant', 'Mode de paiement', 'Fournisseur']);

            Expense::chunk(200, function ($expenses) use ($handle) {
                foreach ($expenses as $expense) {
                    fputcsv($handle, [
                        $expense->expense_date->toDateString(),
                        Expense::CATEGORIES[$expense->category] ?? $expense->category,
                        $expense->label,
                        $expense->amount,
                        $expense->payment_method,
                        $expense->supplier_name,
                    ]);
                }
            });

            fclose($handle);
        }, 'depenses-'.now()->format('Y-m-d').'.csv');
    }
}
