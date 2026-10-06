<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Services\PaymentNotifier;
use App\Services\PaymentRecorder;
use App\Support\PaymentChannels;
use App\Support\PaymentException;
use App\Support\TermSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Guichet : on cherche l'élève, on voit ses factures ouvertes (les plus anciennes d'abord), on saisit la somme reçue
 * et on l'enregistre en un seul encaissement, avec un seul reçu. La famille en est avertie sur demande.
 */
class CashierController extends Controller
{
    public function index(Request $request, PaymentNotifier $notifier): Response
    {
        $student = $request->integer('student')
            ? Student::with('schoolClass:id,name')->find($request->integer('student'))
            : null;

        return Inertia::render('Admin/Cashier/Index', [
            'selected' => $student ? $this->selected($student, $notifier) : null,
            'focus_invoice' => $request->integer('invoice') ?: null,
            'done' => is_string($request->query('done')) ? $this->done($request->query('done'), $notifier) : null,
            'channels' => PaymentChannels::options(),
            'today' => today()->toDateString(),
        ]);
    }

    /** Recherche d'élève du guichet : 8 résultats au plus, chacun avec ce qu'il reste à payer. */
    public function students(Request $request): JsonResponse
    {
        $terms = TermSearch::terms((string) $request->query('q', ''));

        if (mb_strlen(implode(' ', $terms)) < 2) {
            return response()->json([]);
        }

        $students = TermSearch::whereEveryTerm(Student::query()->with('schoolClass:id,name'), $terms, ['first_name', 'last_name', 'matricule'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(8)
            ->get();

        return response()->json($students->map(fn (Student $student) => [
            'id' => $student->id,
            'name' => $student->full_name,
            'matricule' => $student->matricule,
            'class' => $student->schoolClass?->name,
            'balance' => $student->balanceDue(),
        ])->values());
    }

    public function store(Request $request, PaymentRecorder $recorder, PaymentNotifier $notifier): RedirectResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'allocations' => ['required', 'array', 'min:1'],
            'allocations.*.invoice_id' => ['required', 'integer', 'distinct'],
            'allocations.*.amount' => ['required', 'numeric', 'min:0'],
            'channel' => ['required', Rule::in(array_keys(PaymentChannels::options()))],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'send_receipt' => ['sometimes', 'boolean'],
        ]);

        $student = Student::findOrFail($data['student_id']);
        $allocations = collect($data['allocations'])
            ->mapWithKeys(fn (array $row) => [(int) $row['invoice_id'] => $row['amount']])
            ->all();

        try {
            $payments = $recorder->record(
                $student, $allocations, $data['channel'], $data['paid_at'], $data['reference'] ?? null, $request->user(), $data['notes'] ?? null,
            );
        } catch (PaymentException $e) {
            return back()->withErrors(['allocations' => $e->getMessage()])->withInput();
        }

        if ($request->boolean('send_receipt')) {
            // Après la réponse, sans file d'attente : le guichet n'attend ni le serveur de courrier ni la fabrication du PDF.
            defer(fn () => rescue(fn () => $notifier->receipt($payments)));
        }

        return redirect()
            ->route('admin.cashier.create', ['student' => $student->id, 'done' => $payments->first()->batch_token])
            ->with('success', $request->boolean('send_receipt')
                ? 'Encaissement enregistré : le reçu part vers la famille.'
                : 'Encaissement enregistré.');
    }

    /** Renvoie le reçu d'un encaissement déjà enregistré (message perdu, mauvaise adresse corrigée depuis). */
    public function resend(Request $request, PaymentNotifier $notifier): RedirectResponse
    {
        $data = $request->validate(['batch_token' => ['required', 'string', 'size:40']]);
        $payments = Payment::where('batch_token', $data['batch_token'])->orderBy('id')->get();

        if ($payments->isEmpty()) {
            return back()->withErrors(['batch_token' => 'Reçu introuvable.']);
        }

        defer(fn () => rescue(fn () => $notifier->receipt($payments)));

        return back()->with('success', 'Reçu renvoyé à la famille.');
    }

    /** @return array<string, mixed> */
    private function selected(Student $student, PaymentNotifier $notifier): array
    {
        $invoices = Invoice::openForStudent($student);

        return [
            'student' => [
                'id' => $student->id,
                'name' => $student->full_name,
                'matricule' => $student->matricule,
                'class' => $student->schoolClass?->name,
                'status' => $student->status,
            ],
            'total_due' => round((float) $invoices->sum('computed_balance'), 2),
            'invoices' => $invoices->map(function (Invoice $invoice) {
                $late = $invoice->due_date !== null && $invoice->due_date->lt(today());

                return [
                    'id' => $invoice->id,
                    'reference' => $invoice->reference,
                    'label' => $invoice->label,
                    'due_date' => $invoice->due_date?->toDateString(),
                    'amount' => round($invoice->net_amount, 2),
                    'paid' => round($invoice->net_amount - $invoice->computed_balance, 2),
                    'balance' => $invoice->computed_balance,
                    'status' => $late ? 'en_retard' : 'a_venir',
                    'late_days' => $late ? (int) $invoice->due_date->diffInDays(today()) : null,
                ];
            })->values(),
            'contacts' => $notifier->contactsFor($student),
        ];
    }

    /** @return array<string, mixed>|null le récapitulatif d'un encaissement qui vient d'être enregistré */
    private function done(string $token, PaymentNotifier $notifier): ?array
    {
        $payments = Payment::where('batch_token', $token)->with('invoice.student')->orderBy('id')->get();
        $primary = $payments->first();

        if (! $primary) {
            return null;
        }

        return [
            'token' => $token,
            'receipt_number' => $primary->receipt_number,
            'total' => round((float) $payments->sum('amount'), 2),
            'channel' => PaymentChannels::labelFor($primary->channel, $primary->method),
            'paid_at' => $primary->paid_at->toDateString(),
            'payments' => $payments->map(fn (Payment $payment) => [
                'id' => $payment->id,
                'invoice_id' => $payment->invoice_id,
                'label' => $payment->invoice->label,
                'amount' => (float) $payment->amount,
                'balance_after' => $payment->balance_after !== null ? (float) $payment->balance_after : null,
            ])->values(),
            'receipt_url' => route('admin.invoices.payments.receipt', [$primary->invoice_id, $primary->id]),
            'contacts' => $notifier->contactsFor($primary->invoice->student),
        ];
    }
}
