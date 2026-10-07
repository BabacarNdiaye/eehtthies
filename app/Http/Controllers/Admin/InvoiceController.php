<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentReminder;
use App\Models\Student;
use App\Services\MonthlyInvoiceGenerator;
use App\Services\PaymentNotifier;
use App\Services\PaymentRecorder;
use App\Services\PaymentReminderSender;
use App\Support\PaymentChannels;
use App\Support\PaymentException;
use App\Support\Receipt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $paid = '(SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = invoices.id)';
        $net = '(invoices.amount - invoices.discount)';

        // Filtres communs à la liste et aux totaux (hors statut, que les totaux répartissent eux-mêmes).
        $apply = function ($query) use ($request) {
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

            return $query;
        };

        $stats = $apply(Invoice::query())->selectRaw(
            "COUNT(*) as total,
             COALESCE(SUM($net), 0) as invoiced,
             COALESCE(SUM($paid), 0) as collected,
             COALESCE(SUM(CASE WHEN ROUND($net - $paid, 2) <= 0 THEN 1 ELSE 0 END), 0) as payee,
             COALESCE(SUM(CASE WHEN ROUND($net - $paid, 2) > 0 AND $paid > 0 THEN 1 ELSE 0 END), 0) as partielle,
             COALESCE(SUM(CASE WHEN ROUND($net - $paid, 2) > 0 AND $paid = 0 THEN 1 ELSE 0 END), 0) as impayee,
             COALESCE(SUM(CASE WHEN ROUND($net - $paid, 2) > 0 THEN ROUND($net - $paid, 2) ELSE 0 END), 0) as outstanding"
        )->first();

        $query = $apply(Invoice::with('student:id,first_name,last_name,matricule')->withSum('payments', 'amount'));

        match ($request->string('status')->toString()) {
            'payee' => $query->whereRaw("ROUND($net - $paid, 2) <= 0"),
            'partielle' => $query->whereRaw("ROUND($net - $paid, 2) > 0 AND $paid > 0"),
            'impayee' => $query->whereRaw("ROUND($net - $paid, 2) > 0 AND $paid = 0"),
            default => null,
        };

        $invoices = $query->latest()->paginate(15)->withQueryString();

        $invoices->getCollection()->transform(function (Invoice $invoice) {
            $paid = (float) ($invoice->payments_sum_amount ?? 0);
            $net = (float) $invoice->amount - (float) $invoice->discount;
            $balance = round($net - $paid, 2);
            $invoice->computed_status = $balance <= 0 ? 'payee' : ($paid > 0 ? 'partielle' : 'impayee');
            $invoice->computed_balance = $balance;
            $invoice->computed_paid = $paid;
            $invoice->days_late = $balance > 0 ? max(0, $invoice->daysPastDue() ?? 0) : 0;

            return $invoice;
        });

        $user = $request->user();

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => $invoices,
            'stats' => [
                'total' => (int) $stats->total,
                'invoiced' => round((float) $stats->invoiced, 2),
                'collected' => round((float) $stats->collected, 2),
                'outstanding' => round((float) $stats->outstanding, 2),
                'payee' => (int) $stats->payee,
                'partielle' => (int) $stats->partielle,
                'impayee' => (int) $stats->impayee,
            ],
            'can' => ['collect' => (bool) $user?->can('ajouter_comptabilite')],
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

    public function generateMonthly(Request $request, MonthlyInvoiceGenerator $generator)
    {
        $data = $request->validate([
            'formation_id' => ['required', 'exists:formations,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'months' => ['required', 'array', 'min:1'],
            'months.*' => ['integer', 'between:1,12'],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $formation = Formation::findOrFail($data['formation_id']);
        $count = $generator->generate(
            $formation,
            (int) $data['academic_year_id'],
            array_map('intval', $data['months']),
            isset($data['amount']) ? (float) $data['amount'] : null,
        );

        return back()->with('success', "{$count} mensualité(s) générée(s) pour {$formation->name}.");
    }

    /** Pose l'échéance des mensualités qui n'en ont pas (avant, la génération n'en posait jamais) ; ne touche aucune date saisie. */
    public function fixDueDates(Request $request, MonthlyInvoiceGenerator $generator)
    {
        $fixed = $generator->fixMissingDueDates();

        if ($fixed > 0) {
            activity('comptabilite')
                ->causedBy($request->user())
                ->log("{$fixed} échéance(s) de mensualité fixée(s) au ".MonthlyInvoiceGenerator::dueDay().' du mois');
        }

        return back()->with('success', $fixed > 0
            ? "{$fixed} échéance(s) fixée(s) au ".MonthlyInvoiceGenerator::dueDay().' du mois.'
            : 'Aucune échéance à fixer.');
    }

    /**
     * Relance à la main la famille d'un élève pour ses factures en retard (e-mail, notification et EEHT Connect, selon
     * ses contacts). Une famille déjà relancée depuis moins de 24 heures, automatiquement ou non, n'est pas relancée
     * une seconde fois : un double clic ou deux membres du personnel ne doivent pas la harceler.
     */
    public function remind(Request $request, PaymentReminderSender $sender): RedirectResponse
    {
        $data = $request->validate(['student_id' => ['required', 'integer', 'exists:students,id']]);
        $student = Student::findOrFail($data['student_id']);

        $today = Carbon::today();
        $invoices = Invoice::openForStudent($student)
            ->filter(fn (Invoice $invoice) => $invoice->due_date?->lt($today) === true)
            ->values();

        if ($invoices->isEmpty()) {
            return back()->with('error', "{$student->full_name} n'a aucune facture en retard.");
        }

        if ($sender->remindedSince($student, now()->subDay())) {
            return back()->with('error', "La famille de {$student->full_name} a déjà été relancée il y a moins de 24 heures.");
        }

        $channels = $sender->send($student, $invoices, PaymentReminder::KIND_MANUAL, [], $request->user());

        if ($channels === []) {
            return back()->with('error', "Aucun contact (e-mail ou compte) n'est enregistré pour la famille de {$student->full_name} : la relance n'a pas pu partir.");
        }

        $labels = ['mail' => 'e-mail', 'push' => 'notification', 'connect' => 'EEHT Connect'];

        return back()->with('success', "Relance envoyée à la famille de {$student->full_name} (".collect($channels)->map(fn (string $channel) => $labels[$channel])->implode(', ').').');
    }

    public function monthlyTracker(Request $request): Response
    {
        $formationId = $request->integer('formation_id') ?: null;
        $academicYearId = $request->integer('academic_year_id') ?: null;

        $today = Carbon::today();
        $students = collect();

        if ($formationId && $academicYearId) {
            $roster = Student::where('formation_id', $formationId)
                ->where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name', 'matricule']);

            // Ce qu'une relance citerait : toutes les factures échues et impayées de l'élève, quelle que soit l'année.
            $late = Invoice::whereIn('student_id', $roster->modelKeys())
                ->whereNotNull('due_date')
                ->where('due_date', '<', $today)
                ->withSum('payments', 'amount')
                ->get()
                ->map(fn (Invoice $invoice) => $invoice->withComputedBalance())
                ->filter(fn (Invoice $invoice) => $invoice->computed_balance > 0)
                ->groupBy('student_id');

            $students = $roster->map(function (Student $student) use ($academicYearId, $today, $late) {
                $invoices = Invoice::where('student_id', $student->id)
                    ->where('academic_year_id', $academicYearId)
                    ->where('type', 'mensualite')
                    ->withSum('payments', 'amount')
                    ->get()
                    ->keyBy('period_month');

                $months = collect(Invoice::SCHOOL_MONTHS)->mapWithKeys(function ($month) use ($invoices, $today) {
                    $invoice = $invoices->get($month);

                    if (! $invoice) {
                        return [$month => ['invoice_id' => null, 'status' => 'non_genere', 'overdue' => false, 'due_date' => null, 'balance' => null]];
                    }

                    $paid = (float) ($invoice->payments_sum_amount ?? 0);
                    $net = $invoice->net_amount;
                    $balance = max(0, round($net - $paid, 2));
                    $status = $paid >= $net ? 'payee' : ($paid > 0 ? 'partielle' : 'impayee');

                    return [$month => [
                        'invoice_id' => $invoice->id,
                        'status' => $status,
                        'due_date' => $invoice->due_date?->toDateString(),
                        'balance' => $balance,
                        // « En retard » : l'échéance est passée et il reste quelque chose à payer ; sans échéance, jamais.
                        'overdue' => $balance > 0 && $invoice->due_date?->lt($today) === true,
                    ]];
                });

                $studentLate = $late->get($student->id, collect());

                return [
                    'id' => $student->id,
                    'name' => "{$student->first_name} {$student->last_name}",
                    'matricule' => $student->matricule,
                    'months' => $months,
                    // De quoi décider d'une relance : factures échues (toutes années) et montant correspondant.
                    'overdue' => ['count' => $studentLate->count(), 'balance' => round($studentLate->sum('computed_balance'), 2)],
                ];
            });
        }

        $byMonth = collect(Invoice::SCHOOL_MONTHS)->mapWithKeys(
            fn ($month) => [$month => round($students->sum(fn (array $student) => $student['months'][$month]['balance'] ?? 0), 2)]
        );

        return Inertia::render('Admin/Invoices/Monthly', [
            'students' => $students,
            'totals' => [
                'by_month' => $byMonth,
                'balance' => round($byMonth->sum(), 2),
                'overdue' => round($students->sum(fn (array $student) => $student['months']->where('overdue', true)->sum('balance')), 2),
            ],
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'schoolMonths' => Invoice::SCHOOL_MONTHS,
            'monthLabels' => Invoice::MONTH_LABELS,
            'filters' => $request->only(['formation_id', 'academic_year_id']),
            // Mensualités sans échéance dont la date peut se calculer : annoncé avant de proposer de les fixer.
            'missingDueDates' => app(MonthlyInvoiceGenerator::class)->missingDueDates()->count(),
            'dueDay' => MonthlyInvoiceGenerator::dueDay(),
        ]);
    }

    public function show(Invoice $invoice): Response
    {
        return Inertia::render('Admin/Invoices/Show', [
            'invoice' => $invoice->load('student', 'academicYear', 'payments.receivedBy:id,name', 'attachments'),
            'channels' => PaymentChannels::options(),
            'channelLabels' => PaymentChannels::labels(),
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

    public function storePayment(Request $request, Invoice $invoice, PaymentRecorder $recorder, PaymentNotifier $notifier)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:'.max(0.01, $invoice->balance)],
            // Le formulaire envoie un canal (Wave, chèque…) ; les anciens appels envoient encore une famille (« method »).
            'channel' => ['required_without:method', 'nullable', Rule::in(PaymentChannels::acceptedKeys())],
            'method' => ['required_without:channel', 'nullable', Rule::in(PaymentChannels::acceptedKeys())],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'send_receipt' => ['sometimes', 'boolean'],
        ]);

        try {
            $payments = $recorder->record(
                $invoice->student, [$invoice->id => $data['amount']], $data['channel'] ?? $data['method'], $data['paid_at'],
                $data['reference'] ?? null, $request->user(), $data['notes'] ?? null,
            );
        } catch (PaymentException $e) {
            return back()->withErrors(['amount' => $e->getMessage()]);
        }

        if ($request->boolean('send_receipt')) {
            defer(fn () => rescue(fn () => $notifier->receipt($payments)));
        }

        return back()->with('success', "Paiement enregistré. Reçu n° {$payments->first()->receipt_number}.");
    }

    public function destroyPayment(Invoice $invoice, Payment $payment)
    {
        $payment->delete();

        return back()->with('success', 'Paiement supprimé.');
    }

    public function receiptPdf(Invoice $invoice, Payment $payment)
    {
        abort_unless($payment->invoice_id === $invoice->id, 404);

        // Un encaissement qui a réglé plusieurs factures donne un seul reçu, quel que soit le paiement demandé.
        return Receipt::pdf($payment)->stream(Receipt::filename($payment));
    }

    public function overdue(Request $request): Response
    {
        $today = Carbon::today();
        $invoices = Invoice::outstanding();
        $invoices->loadCount('reminders')->loadMax('reminders', 'created_at');

        $invoices->each(function (Invoice $invoice) use ($today) {
            $invoice->setAttribute('days_past_due', $invoice->daysPastDue($today));
            $invoice->setAttribute('last_reminder_at', $invoice->reminders_max_created_at ? Carbon::parse($invoice->reminders_max_created_at)->toIso8601String() : null);
        });

        $late = $invoices->filter(fn (Invoice $invoice) => ($invoice->days_past_due ?? 0) > 0);

        return Inertia::render('Admin/Invoices/Overdue', [
            'invoices' => $invoices,
            'totalOutstanding' => $invoices->sum('computed_balance'),
            'totalOverdue' => round($late->sum('computed_balance'), 2),
            'familiesOverdue' => $late->pluck('student_id')->unique()->count(),
        ]);
    }
}
