<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Invoice;
use App\Models\PaymentPlan;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PaymentPlanController extends Controller
{
    public function index(Request $request): Response
    {
        $plans = PaymentPlan::with('student:id,first_name,last_name,matricule', 'invoices.payments')
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $plans->getCollection()->transform(function (PaymentPlan $plan) {
            $plan->computed_paid = $plan->paid_amount;
            $plan->computed_balance = $plan->balance;
            $plan->computed_progress = $plan->progress_percent;

            return $plan;
        });

        return Inertia::render('Admin/PaymentPlans/Index', [
            'plans' => $plans,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/PaymentPlans/Create', [
            'students' => Student::orderBy('last_name')->get(['id', 'first_name', 'last_name', 'matricule']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'academic_year_id' => ['nullable', 'exists:academic_years,id'],
            'label' => ['required', 'string', 'max:255'],
            'total_amount' => ['required', 'numeric', 'min:1'],
            'installments_count' => ['required', 'integer', 'min:2', 'max:12'],
            'first_due_date' => ['required', 'date'],
        ]);

        $plan = PaymentPlan::create([
            'student_id' => $data['student_id'],
            'academic_year_id' => $data['academic_year_id'] ?? null,
            'label' => $data['label'],
            'total_amount' => $data['total_amount'],
            'installments_count' => $data['installments_count'],
            'created_by' => $request->user()->id,
        ]);

        $count = (int) $data['installments_count'];
        $total = (float) $data['total_amount'];
        $baseShare = floor(($total / $count) * 100) / 100;
        $firstDueDate = Carbon::parse($data['first_due_date']);

        for ($i = 1; $i <= $count; $i++) {
            // Even split, with any rounding remainder folded into the last tranche
            // so the sum of all tranches always equals the total exactly.
            $amount = $i === $count ? round($total - $baseShare * ($count - 1), 2) : $baseShare;

            Invoice::create([
                'student_id' => $data['student_id'],
                'payment_plan_id' => $plan->id,
                'academic_year_id' => $data['academic_year_id'] ?? null,
                'type' => 'scolarite',
                'label' => "{$data['label']} — Tranche {$i}/{$count}",
                'amount' => $amount,
                'due_date' => $firstDueDate->copy()->addMonthsNoOverflow($i - 1)->toDateString(),
            ]);
        }

        return redirect()->route('admin.payment-plans.show', $plan)->with('success', 'Échéancier créé avec succès.');
    }

    public function show(PaymentPlan $paymentPlan): Response
    {
        $paymentPlan->load(['student:id,first_name,last_name,matricule', 'academicYear:id,label', 'invoices.payments']);

        $paymentPlan->invoices->each(function (Invoice $invoice) {
            $invoice->computed_status = $invoice->status;
            $invoice->computed_balance = $invoice->balance;
        });

        return Inertia::render('Admin/PaymentPlans/Show', [
            'plan' => $paymentPlan,
            'paidAmount' => $paymentPlan->paid_amount,
            'balance' => $paymentPlan->balance,
            'progressPercent' => $paymentPlan->progress_percent,
        ]);
    }

    public function destroy(PaymentPlan $paymentPlan)
    {
        $hasPayments = $paymentPlan->invoices()->whereHas('payments')->exists();

        abort_if($hasPayments, 422, 'Impossible de supprimer : au moins une tranche a déjà reçu un paiement.');

        // Delete each Invoice model individually (not a mass ->delete() on the
        // relation query) so Invoice::deleted() fires and AccountingPoster::void()
        // cleans up the auto-posted journal entry for every tranche.
        $paymentPlan->invoices->each->delete();
        $paymentPlan->delete();

        return redirect()->route('admin.payment-plans.index')->with('success', 'Échéancier supprimé.');
    }
}
