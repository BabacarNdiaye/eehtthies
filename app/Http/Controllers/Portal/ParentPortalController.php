<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\ReportCard;
use App\Models\Student;
use App\Models\TimetableEntry;
use App\Services\ReportCardCalculator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class ParentPortalController extends Controller
{
    public function dashboard(Request $request): Response
    {
        $children = $request->user()->childStudents()->with('formation:id,name', 'schoolClass:id,name')->get();

        return Inertia::render('Portal/Parent/Dashboard', [
            'children' => $children,
        ]);
    }

    private function authorizeChild(Request $request, Student $student): Student
    {
        abort_unless($student->parent_user_id === $request->user()->id, 403);

        return $student;
    }

    public function child(Request $request, Student $student): Response
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
            ->with('payments:id,invoice_id,amount,method,paid_at,receipt_number')
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
            'exams' => $exams,
            'grades' => $grades,
            'timetable' => $timetable,
            'days' => TimetableEntry::DAYS,
            'invoices' => $invoices,
        ]);
    }

    public function invoiceReceiptPdf(Request $request, Student $student, Invoice $invoice, Payment $payment)
    {
        $this->authorizeChild($request, $student);
        abort_unless($invoice->student_id === $student->id && $payment->invoice_id === $invoice->id, 403);

        $pdf = Pdf::loadView('pdf.receipt', [
            'invoice' => $invoice->load('student'),
            'payment' => $payment,
        ]);

        return $pdf->stream("recu-{$payment->receipt_number}.pdf");
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

    public function messages(): Response
    {
        return Inertia::render('Portal/Parent/Messages');
    }
}
