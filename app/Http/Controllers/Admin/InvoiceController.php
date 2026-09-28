<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Invoice::with('student:id,first_name,last_name,matricule')->withSum('payments', 'amount');

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->integer('student_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('matricule', 'like', "%{$search}%");
            });
        }

        $invoices = $query->latest()->paginate(15)->withQueryString();

        $invoices->getCollection()->transform(function (Invoice $invoice) {
            $paid = (float) ($invoice->payments_sum_amount ?? 0);
            $net = (float) $invoice->amount - (float) $invoice->discount;
            $balance = round($net - $paid, 2);
            $invoice->computed_status = $balance <= 0 ? 'payee' : ($paid > 0 ? 'partielle' : 'impayee');
            $invoice->computed_balance = $balance;
            $invoice->computed_paid = $paid;

            return $invoice;
        });

        if ($request->filled('status')) {
            $status = $request->string('status')->toString();
            $filtered = $invoices->getCollection()->filter(fn ($i) => $i->computed_status === $status)->values();
            $invoices->setCollection($filtered);
        }

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => $invoices,
            'students' => Student::orderBy('last_name')->get(['id', 'first_name', 'last_name', 'matricule']),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'types' => Invoice::TYPES,
            'filters' => $request->only(['student_id', 'type', 'status', 'search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Invoices/Form', [
            'students' => Student::orderBy('last_name')->get(['id', 'first_name', 'last_name', 'matricule']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'types' => Invoice::TYPES,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'academic_year_id' => ['nullable', 'exists:academic_years,id'],
            'type' => ['required', 'in:'.implode(',', array_keys(Invoice::TYPES))],
            'period_month' => ['nullable', 'integer', 'between:1,12', 'required_if:type,mensualite'],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        Invoice::create($data);

        return redirect()->route('admin.invoices.index')->with('success', 'Facture créée avec succès.');
    }

    public function generateForFormation(Request $request)
    {
        $data = $request->validate([
            'formation_id' => ['required', 'exists:formations,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'type' => ['required', 'in:inscription,scolarite'],
        ]);

        $formation = Formation::findOrFail($data['formation_id']);
        $students = Student::where('formation_id', $formation->id)->where('status', 'actif')->get();

        $amount = $data['type'] === 'inscription' ? $formation->registration_fee : $formation->tuition_fee;
        $label = $data['type'] === 'inscription'
            ? "Frais d'inscription — {$formation->name}"
            : "Frais de scolarité — {$formation->name}";

        $count = 0;
        foreach ($students as $student) {
            $exists = Invoice::where('student_id', $student->id)
                ->where('academic_year_id', $data['academic_year_id'])
                ->where('type', $data['type'])
                ->exists();

            if ($exists) {
                continue;
            }

            Invoice::create([
                'student_id' => $student->id,
                'academic_year_id' => $data['academic_year_id'],
                'type' => $data['type'],
                'label' => $label,
                'amount' => $amount,
            ]);
            $count++;
        }

        return back()->with('success', "{$count} facture(s) générée(s) pour {$formation->name}.");
    }

    public function generateMonthly(Request $request)
    {
        $data = $request->validate([
            'formation_id' => ['required', 'exists:formations,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'months' => ['required', 'array', 'min:1'],
            'months.*' => ['integer', 'between:1,12'],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $formation = Formation::findOrFail($data['formation_id']);
        $students = Student::where('formation_id', $formation->id)->where('status', 'actif')->get();
        $months = $data['months'];

        $amount = $data['amount'] ?? round(((float) $formation->tuition_fee) / max(count($months), 1), 2);

        $count = 0;
        foreach ($students as $student) {
            foreach ($months as $month) {
                $exists = Invoice::where('student_id', $student->id)
                    ->where('academic_year_id', $data['academic_year_id'])
                    ->where('type', 'mensualite')
                    ->where('period_month', $month)
                    ->exists();

                if ($exists) {
                    continue;
                }

                Invoice::create([
                    'student_id' => $student->id,
                    'academic_year_id' => $data['academic_year_id'],
                    'type' => 'mensualite',
                    'period_month' => $month,
                    'label' => 'Mensualité — '.Invoice::MONTH_LABELS[$month].' — '.$formation->name,
                    'amount' => $amount,
                ]);
                $count++;
            }
        }

        return back()->with('success', "{$count} mensualité(s) générée(s) pour {$formation->name}.");
    }

    public function monthlyTracker(Request $request): Response
    {
        $formationId = $request->integer('formation_id') ?: null;
        $academicYearId = $request->integer('academic_year_id') ?: null;

        $students = collect();

        if ($formationId && $academicYearId) {
            $students = Student::where('formation_id', $formationId)
                ->where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name', 'matricule'])
                ->map(function (Student $student) use ($academicYearId) {
                    $invoices = Invoice::where('student_id', $student->id)
                        ->where('academic_year_id', $academicYearId)
                        ->where('type', 'mensualite')
                        ->withSum('payments', 'amount')
                        ->get()
                        ->keyBy('period_month');

                    $months = collect(Invoice::SCHOOL_MONTHS)->mapWithKeys(function ($month) use ($invoices) {
                        $invoice = $invoices->get($month);

                        if (! $invoice) {
                            return [$month => ['invoice_id' => null, 'status' => 'non_genere']];
                        }

                        $paid = (float) ($invoice->payments_sum_amount ?? 0);
                        $net = (float) $invoice->amount - (float) $invoice->discount;
                        $status = $paid >= $net ? 'payee' : ($paid > 0 ? 'partielle' : 'impayee');

                        return [$month => ['invoice_id' => $invoice->id, 'status' => $status]];
                    });

                    return [
                        'id' => $student->id,
                        'name' => "{$student->first_name} {$student->last_name}",
                        'matricule' => $student->matricule,
                        'months' => $months,
                    ];
                });
        }

        return Inertia::render('Admin/Invoices/Monthly', [
            'students' => $students,
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'schoolMonths' => Invoice::SCHOOL_MONTHS,
            'monthLabels' => Invoice::MONTH_LABELS,
            'filters' => $request->only(['formation_id', 'academic_year_id']),
        ]);
    }

    public function show(Invoice $invoice): Response
    {
        return Inertia::render('Admin/Invoices/Show', [
            'invoice' => $invoice->load('student', 'academicYear', 'payments.receivedBy:id,name'),
            'methods' => Payment::METHODS,
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'period_month' => ['nullable', 'integer', 'between:1,12'],
            'amount' => ['required', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $invoice->update($data);

        return back()->with('success', 'Facture mise à jour avec succès.');
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();

        return redirect()->route('admin.invoices.index')->with('success', 'Facture supprimée.');
    }

    public function storePayment(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:'.max(0.01, $invoice->balance)],
            'method' => ['required', 'in:'.implode(',', array_keys(Payment::METHODS))],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $payment = $invoice->payments()->create([
            ...$data,
            'received_by' => $request->user()->id,
        ]);

        return back()->with('success', "Paiement enregistré. Reçu n° {$payment->receipt_number}.");
    }

    public function destroyPayment(Invoice $invoice, Payment $payment)
    {
        $payment->delete();

        return back()->with('success', 'Paiement supprimé.');
    }

    public function receiptPdf(Invoice $invoice, Payment $payment)
    {
        abort_unless($payment->invoice_id === $invoice->id, 404);

        $pdf = Pdf::loadView('pdf.receipt', [
            'invoice' => $invoice->load('student'),
            'payment' => $payment,
        ]);

        return $pdf->stream("recu-{$payment->receipt_number}.pdf");
    }

    public function overdue(Request $request): Response
    {
        $invoices = Invoice::with('student:id,first_name,last_name,matricule,phone,email')
            ->withSum('payments', 'amount')
            ->get()
            ->map(function (Invoice $invoice) {
                $paid = (float) ($invoice->payments_sum_amount ?? 0);
                $net = (float) $invoice->amount - (float) $invoice->discount;
                $invoice->computed_balance = round($net - $paid, 2);

                return $invoice;
            })
            ->filter(fn ($i) => $i->computed_balance > 0)
            ->sortByDesc('computed_balance')
            ->values();

        return Inertia::render('Admin/Invoices/Overdue', [
            'invoices' => $invoices,
            'totalOutstanding' => $invoices->sum('computed_balance'),
        ]);
    }
}
