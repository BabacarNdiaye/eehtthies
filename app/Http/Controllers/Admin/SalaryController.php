<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PayrollLine;
use App\Models\SalaryPayment;
use App\Models\Teacher;
use App\Models\TeacherSalaryPayment;
use App\Models\User;
use App\Services\SalaryRecorder;
use App\Support\Exportable;
use App\Support\Payslip;
use App\Support\SalaryException;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SalaryController extends Controller
{
    use Exportable;

    private const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    public function index(Request $request): Response
    {
        $year = $request->integer('year') ?: (int) now()->format('Y');

        $adminStaff = User::with(['roles:id,name'])
            ->where(function ($q) {
                $q->whereDoesntHave('roles')
                    ->orWhereHas('roles', fn ($r) => $r->whereNotIn('name', ['enseignant', 'eleve', 'parent']));
            })
            ->orderBy('name')
            ->get()
            ->map(function (User $user) use ($year) {
                $payments = SalaryPayment::where('user_id', $user->id)
                    ->where('period_year', $year)
                    ->get()
                    ->keyBy('period_month');

                return [
                    'id' => 'user-'.$user->id,
                    'name' => $user->name,
                    'position' => $user->position,
                    'type' => 'user',
                    'payment_type' => 'fixe',
                    'monthly_salary' => $user->monthly_salary ? (float) $user->monthly_salary : null,
                    'hourly_rate' => null,
                    'months' => $this->monthsBreakdown($payments),
                ];
            });

        $teachers = Teacher::orderBy('last_name')
            ->get()
            ->map(function (Teacher $teacher) use ($year) {
                $payments = TeacherSalaryPayment::where('teacher_id', $teacher->id)
                    ->where('period_year', $year)
                    ->get()
                    ->keyBy('period_month');

                return [
                    'id' => 'teacher-'.$teacher->id,
                    'name' => $teacher->full_name,
                    'position' => 'Enseignant — '.($teacher->specialty ?: '—'),
                    'type' => 'teacher',
                    'payment_type' => $teacher->payment_type,
                    'monthly_salary' => $teacher->monthly_salary ? (float) $teacher->monthly_salary : null,
                    'hourly_rate' => $teacher->hourly_rate ? (float) $teacher->hourly_rate : null,
                    'months' => $this->monthsBreakdown($payments, includeHours: true),
                ];
            });

        $staff = $adminStaff->values()->concat($teachers->values());

        return Inertia::render('Admin/Salaries/Index', [
            'staff' => $staff,
            'year' => $year,
            'months' => self::MONTHS,
            'monthLabels' => Invoice::MONTH_LABELS,
            'paymentMethods' => Payment::METHODS,
            'paymentTypes' => Teacher::PAYMENT_TYPES,
        ]);
    }

    private function monthsBreakdown($payments, bool $includeHours = false)
    {
        return collect(self::MONTHS)->mapWithKeys(function ($month) use ($payments, $includeHours) {
            $payment = $payments->get($month);

            return [$month => [
                'salary_payment_id' => $payment?->id,
                'amount' => $payment ? (float) $payment->amount : null,
                'hours_worked' => $includeHours ? ($payment?->hours_worked ? (float) $payment->hours_worked : null) : null,
                'paid_at' => $payment?->paid_at?->toDateString(),
                'status' => $payment ? 'payee' : 'impayee',
            ]];
        });
    }

    public function store(Request $request, SalaryRecorder $recorder)
    {
        $data = $request->validate([
            'user_id' => ['required_without:teacher_id', 'nullable', 'exists:users,id'],
            'teacher_id' => ['required_without:user_id', 'nullable', 'exists:teachers,id'],
            'period_year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'period_month' => ['required', 'integer', 'between:1,12'],
            'hours_worked' => ['nullable', 'numeric', 'min:0'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_at' => ['required', 'date'],
            'payment_method' => ['required', 'in:'.implode(',', array_keys(Payment::METHODS))],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $payee = ! empty($data['teacher_id']) ? Teacher::findOrFail($data['teacher_id']) : User::findOrFail($data['user_id']);

        try {
            $recorder->record(
                $payee,
                (int) $data['period_year'],
                (int) $data['period_month'],
                (float) $data['amount'],
                $data['paid_at'],
                $data['payment_method'],
                isset($data['hours_worked']) ? (float) $data['hours_worked'] : null,
                $data['notes'] ?? null,
                $request->user()->id,
            );
        } catch (SalaryException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Salaire enregistré avec succès.');
    }

    private function exportRowsForYear(int $year)
    {
        $userRows = SalaryPayment::with('user:id,name,position')
            ->where('period_year', $year)
            ->orderBy('period_month')
            ->get()
            ->map(fn (SalaryPayment $p) => [
                'name' => $p->user->name,
                'position' => $p->user->position,
                'month' => Invoice::MONTH_LABELS[$p->period_month],
                'amount' => number_format((float) $p->amount, 0, ',', ' ').' FCFA',
                'paid_at' => $p->paid_at->format('d/m/Y'),
                'payment_method' => Payment::METHODS[$p->payment_method] ?? $p->payment_method,
            ]);

        $teacherRows = TeacherSalaryPayment::with('teacher:id,first_name,last_name,specialty')
            ->where('period_year', $year)
            ->orderBy('period_month')
            ->get()
            ->map(fn (TeacherSalaryPayment $p) => [
                'name' => $p->teacher->full_name,
                'position' => 'Enseignant — '.($p->teacher->specialty ?: '—'),
                'month' => Invoice::MONTH_LABELS[$p->period_month],
                'amount' => number_format((float) $p->amount, 0, ',', ' ').' FCFA',
                'paid_at' => $p->paid_at->format('d/m/Y'),
                'payment_method' => Payment::METHODS[$p->payment_method] ?? $p->payment_method,
            ]);

        return $userRows->concat($teacherRows)->sortBy('paid_at')->values();
    }

    private function exportColumns(): array
    {
        return [
            ['key' => 'name', 'label' => 'Membre du personnel'],
            ['key' => 'position', 'label' => 'Fonction'],
            ['key' => 'month', 'label' => 'Mois'],
            ['key' => 'amount', 'label' => 'Montant', 'align' => 'right'],
            ['key' => 'paid_at', 'label' => 'Date de paiement'],
            ['key' => 'payment_method', 'label' => 'Mode de paiement'],
        ];
    }

    public function exportCsv(Request $request)
    {
        $year = $request->integer('year') ?: (int) now()->format('Y');

        return $this->csvResponse("salaires-{$year}.csv", $this->exportColumns(), $this->exportRowsForYear($year));
    }

    public function exportPdf(Request $request)
    {
        $year = $request->integer('year') ?: (int) now()->format('Y');
        $rows = $this->exportRowsForYear($year);
        $total = SalaryPayment::where('period_year', $year)->sum('amount')
            + TeacherSalaryPayment::where('period_year', $year)->sum('amount');

        return $this->pdfResponse(
            "salaires-{$year}.pdf",
            "Registre des salaires — {$year}",
            $this->exportColumns(),
            $rows,
            null,
            ['Total versé en '.$year => number_format((float) $total, 0, ',', ' ').' FCFA'],
        );
    }

    public function destroy(SalaryPayment $salaryPayment)
    {
        DB::transaction(function () use ($salaryPayment) {
            $salaryPayment->expense?->delete();
            $salaryPayment->delete();
        });

        return back()->with('success', 'Paiement de salaire annulé.');
    }

    public function destroyTeacherPayment(TeacherSalaryPayment $teacherSalaryPayment)
    {
        DB::transaction(function () use ($teacherSalaryPayment) {
            $teacherSalaryPayment->expense?->delete();
            $teacherSalaryPayment->delete();
        });

        return back()->with('success', 'Paiement de salaire annulé.');
    }

    public function payslipUser(SalaryPayment $salaryPayment)
    {
        // Un versement issu de la paie mensuelle a son bulletin détaillé (base, primes, retenues) ; les anciens gardent le rendu minimal.
        if ($line = PayrollLine::where('salary_payment_id', $salaryPayment->id)->first()) {
            return Payslip::pdf($line)->stream(Payslip::filename($line));
        }

        $user = $salaryPayment->user;

        $pdf = Pdf::loadView('pdf.payslip', [
            'name' => $user->name,
            'position' => $user->position ?: '—',
            'periodLabel' => Invoice::MONTH_LABELS[$salaryPayment->period_month].' '.$salaryPayment->period_year,
            'amount' => (float) $salaryPayment->amount,
            'hoursWorked' => null,
            'paymentMethod' => Payment::METHODS[$salaryPayment->payment_method] ?? $salaryPayment->payment_method,
            'paidAt' => $salaryPayment->paid_at,
        ]);

        return $pdf->stream("bulletin-salaire-{$salaryPayment->period_year}-{$salaryPayment->period_month}-{$user->id}.pdf");
    }

    public function payslipTeacher(TeacherSalaryPayment $teacherSalaryPayment)
    {
        if ($line = PayrollLine::where('teacher_salary_payment_id', $teacherSalaryPayment->id)->first()) {
            return Payslip::pdf($line)->stream(Payslip::filename($line));
        }

        $teacher = $teacherSalaryPayment->teacher;

        $pdf = Pdf::loadView('pdf.payslip', [
            'name' => $teacher->full_name,
            'position' => 'Enseignant — '.($teacher->specialty ?: '—'),
            'periodLabel' => Invoice::MONTH_LABELS[$teacherSalaryPayment->period_month].' '.$teacherSalaryPayment->period_year,
            'amount' => (float) $teacherSalaryPayment->amount,
            'hoursWorked' => $teacherSalaryPayment->hours_worked !== null ? (float) $teacherSalaryPayment->hours_worked : null,
            'paymentMethod' => Payment::METHODS[$teacherSalaryPayment->payment_method] ?? $teacherSalaryPayment->payment_method,
            'paidAt' => $teacherSalaryPayment->paid_at,
        ]);

        return $pdf->stream("bulletin-salaire-{$teacherSalaryPayment->period_year}-{$teacherSalaryPayment->period_month}-{$teacher->id}.pdf");
    }
}
