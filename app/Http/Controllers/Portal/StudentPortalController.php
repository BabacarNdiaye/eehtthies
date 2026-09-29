<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\Invoice;
use App\Models\LibraryResource;
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

class StudentPortalController extends Controller
{
    private function student(Request $request): Student
    {
        $student = $request->user()->student;
        abort_unless($student, 404, "Aucun profil élève n'est associé à ce compte.");

        return $student;
    }

    public function dashboard(Request $request): Response
    {
        $student = $this->student($request)->load('formation:id,name', 'schoolClass:id,name', 'academicYear:id,label');

        $upcoming = $student->school_class_id
            ? TimetableEntry::where('school_class_id', $student->school_class_id)
                ->with('subject:id,name', 'teacher:id,first_name,last_name', 'room:id,name')
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get()
            : collect();

        $latestReportCard = $student->reportCards()->where('is_published', true)->latest('generated_at')->first();

        $attendanceStats = $student->attendances()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $student->generateQrToken();
        $qrCode = base64_encode(QrCode::format('svg')->size(220)->generate($student->qr_token));

        return Inertia::render('Portal/Student/Dashboard', [
            'student' => $student,
            'upcomingCount' => $upcoming->count(),
            'latestReportCard' => $latestReportCard,
            'attendanceStats' => $attendanceStats,
            'qrCode' => $qrCode,
        ]);
    }

    private function timetableEntries(Student $student)
    {
        return $student->school_class_id
            ? TimetableEntry::where('school_class_id', $student->school_class_id)
                ->with('subject:id,name', 'teacher:id,first_name,last_name', 'room:id,name')
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get()
            : collect();
    }

    /** Épreuves publiées de la classe de l'élève, avec ses propres notes indexées par épreuve. */
    private function publishedExamsWithGrades(Student $student): array
    {
        $exams = $student->school_class_id
            ? Exam::where('school_class_id', $student->school_class_id)
                ->where('is_published', true)
                ->with('subject:id,name')
                ->orderByDesc('exam_date')
                ->get()
            : collect();

        $grades = $student->grades()->whereIn('exam_id', $exams->pluck('id'))->get()->keyBy('exam_id');

        return [$exams, $grades];
    }

    public function timetable(Request $request): Response
    {
        $student = $this->student($request);
        $entries = $this->timetableEntries($student);

        return Inertia::render('Portal/Student/Timetable', [
            'entries' => $entries,
            'days' => TimetableEntry::DAYS,
            'schoolClassName' => $student->schoolClass?->name,
            'schoolClassId' => $student->school_class_id,
        ]);
    }

    public function timetablePdf(Request $request)
    {
        $student = $this->student($request)->load('schoolClass:id,name');

        return Pdf::loadView('pdf.admin_timetable', [
            'entries' => $this->timetableEntries($student),
            'schoolClass' => $student->schoolClass,
            'days' => TimetableEntry::DAYS,
        ])->stream('emploi-du-temps.pdf');
    }

    public function grades(Request $request): Response
    {
        $student = $this->student($request);
        [$exams, $grades] = $this->publishedExamsWithGrades($student);

        $reportCards = $student->reportCards()
            ->where('is_published', true)
            ->orderByDesc('generated_at')
            ->get();

        return Inertia::render('Portal/Student/Grades', [
            'exams' => $exams,
            'grades' => $grades,
            'reportCards' => $reportCards,
            'schoolClassId' => $student->school_class_id,
        ]);
    }

    public function gradesPdf(Request $request)
    {
        $student = $this->student($request)->load('schoolClass:id,name');
        [$exams, $grades] = $this->publishedExamsWithGrades($student);

        return Pdf::loadView('pdf.student_grades', [
            'student' => $student,
            'exams' => $exams,
            'grades' => $grades,
        ])->stream('releve-de-notes.pdf');
    }

    public function reportCardPdf(Request $request, ReportCard $reportCard, ReportCardCalculator $calculator)
    {
        $student = $this->student($request);
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

    public function attendance(Request $request): Response
    {
        $student = $this->student($request);

        $records = $student->attendances()
            ->with('subject:id,name')
            ->orderByDesc('date')
            ->paginate(20);

        $stats = $student->attendances()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('Portal/Student/Attendance', [
            'records' => $records,
            'stats' => $stats,
        ]);
    }

    public function library(): Response
    {
        return Inertia::render('Portal/Student/Library', [
            'resources' => LibraryResource::with('uploadedBy:id,name')->latest()->get(),
        ]);
    }

    public function invoices(Request $request): Response
    {
        $student = $this->student($request);

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

        return Inertia::render('Portal/Student/Invoices', [
            'invoices' => $invoices,
        ]);
    }

    public function invoiceReceiptPdf(Request $request, Invoice $invoice, Payment $payment)
    {
        $student = $this->student($request);
        abort_unless($invoice->student_id === $student->id && $payment->invoice_id === $invoice->id, 403);

        $pdf = Pdf::loadView('pdf.receipt', [
            'invoice' => $invoice->load('student'),
            'payment' => $payment,
        ]);

        return $pdf->stream("recu-{$payment->receipt_number}.pdf");
    }
}
