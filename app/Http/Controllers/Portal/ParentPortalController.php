<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\ReportCard;
use App\Models\Student;
use App\Models\TimetableEntry;
use App\Services\Council\FamilyCouncilService;
use App\Services\OnlinePayments;
use App\Services\PortalFeed;
use App\Services\ReportCardCalculator;
use App\Support\ClassSchedule;
use App\Support\Receipt;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class ParentPortalController extends Controller
{
    public function dashboard(Request $request, ReportCardCalculator $calculator, PortalFeed $feed): Response
    {
        $children = $request->user()->childStudents()->with('formation:id,name', 'schoolClass:id,name')->get();

        // Résumé de chaque enfant calculé d'un coup : l'écran passe d'un enfant à l'autre sans recharger.
        $children->each(function (Student $child) use ($calculator) {
            $entries = $child->school_class_id
                ? TimetableEntry::where('school_class_id', $child->school_class_id)
                    ->with('subject:id,name', 'teacher:id,first_name,last_name', 'room:id,name')
                    ->orderBy('day_of_week')
                    ->orderBy('start_time')
                    ->get()
                : collect();

            $child->setAttribute('summary', [
                'average' => $calculator->summaryForStudent($child)['overall'],
                'absences' => $child->attendances()->whereIn('status', ['absent', 'absence_justifiee'])->count(),
                'balance_due' => $child->balanceDue(),
                'next_class' => ClassSchedule::next($entries, now()),
            ]);
        });

        return Inertia::render('Portal/Parent/Dashboard', [
            'children' => $children,
            'announcements' => $feed->forUser($request->user()),
        ]);
    }

    private function authorizeChild(Request $request, Student $student): Student
    {
        abort_unless($student->parent_user_id === $request->user()->id, 403);

        return $student;
    }

    public function child(Request $request, Student $student, ReportCardCalculator $calculator, OnlinePayments $online): Response
    {
        $student = $this->authorizeChild($request, $student)->load('formation:id,name', 'schoolClass:id,name', 'academicYear:id,label');

        $attendanceStats = $student->attendances()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $reportCards = $student->reportCards()->where('is_published', true)->orderByDesc('generated_at')->get();

        $exams = $student->school_class_id
            ? Exam::where('school_class_id', $student->school_class_id)
                ->where('is_published', true)
                ->with('subject:id,name')
                ->orderByDesc('exam_date')
                ->get()
            : collect();

        $grades = $student->grades()->whereIn('exam_id', $exams->pluck('id'))->get()->keyBy('exam_id');

        $timetable = $student->school_class_id
            ? TimetableEntry::where('school_class_id', $student->school_class_id)
                ->with('subject:id,name', 'teacher:id,first_name,last_name', 'room:id,name')
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get()
            : collect();

        $invoices = $student->invoices()
            ->withSum('payments', 'amount')
            ->with('payments:id,invoice_id,amount,method,channel,paid_at,receipt_number')
            ->orderByDesc('due_date')
            ->get()
            ->map(function (Invoice $invoice) {
                $paid = (float) ($invoice->payments_sum_amount ?? 0);
                $net = (float) $invoice->amount - (float) $invoice->discount;
                $balance = round($net - $paid, 2);
                $invoice->computed_status = $balance <= 0 ? 'payee' : ($paid > 0 ? 'partielle' : 'impayee');
                $invoice->computed_balance = $balance;
                $invoice->computed_paid = $paid;

                return $invoice;
            });

        return Inertia::render('Portal/Parent/Child', [
            'student' => $student,
            'attendanceStats' => $attendanceStats,
            'reportCards' => $reportCards,
            // DIR-06 : conseils clôturés seulement, appréciation et décisions publiables (jamais d'interne).
            'councils' => app(FamilyCouncilService::class)->forStudent($student),
            'exams' => $exams,
            'grades' => $grades,
            'timetable' => $timetable,
            'days' => TimetableEntry::DAYS,
            'invoices' => $invoices,
            // « Payer en ligne » n'apparaît que lorsqu'un pilote de paiement est actif.
            'online' => $online->forPortal(route('parent.payments.start', $student, false)),
            // Les 30 derniers pointages, du plus récent au plus ancien (les totaux sont dans attendanceStats).
            'attendanceRecords' => $student->attendances()
                ->with('subject:id,name')
                ->orderByDesc('date')
                ->orderByDesc('id')
                ->limit(30)
                ->get(['id', 'date', 'status', 'justification', 'subject_id']),
            'summary' => [
                'average' => $calculator->summaryForStudent($student)['overall'],
                'balance_due' => $student->balanceDue(),
            ],
        ]);
    }

    public function invoiceReceiptPdf(Request $request, Student $student, Invoice $invoice, Payment $payment)
    {
        $this->authorizeChild($request, $student);
        abort_unless($invoice->student_id === $student->id && $payment->invoice_id === $invoice->id, 403);

        // Un encaissement qui a réglé plusieurs factures donne un seul reçu, quel que soit le paiement demandé.
        return Receipt::pdf($payment)->stream(Receipt::filename($payment));
    }

    public function reportCardPdf(Request $request, Student $student, ReportCard $reportCard, ReportCardCalculator $calculator)
    {
        $this->authorizeChild($request, $student);
        abort_unless($reportCard->student_id === $student->id && $reportCard->is_published, 403);

        $breakdown = $calculator->computeForStudent(
            $reportCard->student,
            $reportCard->school_class_id,
            $reportCard->academic_year_id,
            $reportCard->term
        );

        $verificationUrl = route('bulletins.verify', $reportCard->qr_token);
        $qrCode = base64_encode(QrCode::format('svg')->size(150)->generate($verificationUrl));

        $pdf = Pdf::loadView('pdf.bulletin', [
            'reportCard' => $reportCard->load('student', 'schoolClass', 'academicYear'),
            'subjects' => $breakdown['subjects'],
            'qrCode' => $qrCode,
        ]);

        return $pdf->stream("bulletin-{$reportCard->term}.pdf");
    }
}
