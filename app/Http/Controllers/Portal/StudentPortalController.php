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
use App\Services\Council\FamilyCouncilService;
use App\Services\OnlinePayments;
use App\Services\PortalFeed;
use App\Services\ReportCardCalculator;
use App\Support\ClassSchedule;
use App\Support\Receipt;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
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

    public function dashboard(Request $request, ReportCardCalculator $calculator, PortalFeed $feed): Response
    {
        $student = $this->student($request)->load('formation:id,name', 'schoolClass:id,name', 'academicYear:id,label');

        $entries = $this->timetableEntries($student);
        $summary = $calculator->summaryForStudent($student);

        $latestReportCard = $student->reportCards()->where('is_published', true)->latest('generated_at')->first();

        $attendanceStats = $student->attendances()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $student->generateQrToken();
        $qrCode = base64_encode(QrCode::format('svg')->size(220)->generate($student->qr_token));

        return Inertia::render('Portal/Student/Dashboard', [
            'student' => $student,
            'latestReportCard' => $latestReportCard,
            'attendanceStats' => $attendanceStats,
            'qrCode' => $qrCode,
            'nextClass' => ClassSchedule::next($entries, now()),
            'todayEntries' => ClassSchedule::today($entries, now()),
            'weekEntries' => $entries,
            'subjects' => $this->subjectTiles($entries, $summary['subjects']),
            'overallAverage' => $summary['overall'],
            'balanceDue' => $student->balanceDue(),
            'announcements' => $feed->forUser($request->user()),
        ]);
    }

    /**
     * Données de la carte d'étudiant plein écran (recto : identité, verso : code QR de pointage). Réponse jamais
     * mise en cache : elle contient le jeton du badge.
     */
    public function card(Request $request): JsonResponse
    {
        $student = $this->student($request)->load('formation:id,name', 'schoolClass:id,name', 'academicYear:id,label');
        $student->generateQrToken();

        return response()->json([
            'name' => $student->full_name,
            'matricule' => $student->matricule,
            'formation' => $student->formation?->name,
            'class_name' => $student->schoolClass?->name,
            'academic_year' => $student->academicYear?->label,
            'photo' => $student->photo ? '/storage/'.$student->photo : null,
            'qr' => base64_encode(QrCode::format('svg')->size(300)->generate($student->qr_token)),
        ])->header('Cache-Control', 'no-store, private');
    }

    /**
     * Tuiles « Mes matières » : les matières de l'emploi du temps de la classe (avec leurs enseignants), plus
     * celles qui ont déjà une note publiée, chacune avec sa moyenne sur 20 quand elle existe.
     *
     * @param  Collection<int, TimetableEntry>  $entries
     * @param  array<int, array{subject_id: int, subject: string, moy20: ?float}>  $summaryRows
     * @return list<array{id: int, name: string, teacher: ?string, average: ?float}>
     */
    private function subjectTiles(Collection $entries, array $summaryRows): array
    {
        $averages = collect($summaryRows)->pluck('moy20', 'subject_id');

        $tiles = $entries
            ->filter(fn (TimetableEntry $entry) => $entry->subject)
            ->groupBy('subject_id')
            ->map(fn (Collection $group, $subjectId) => [
                'id' => (int) $subjectId,
                'name' => $group->first()->subject->name,
                'teacher' => $group
                    ->map(fn (TimetableEntry $entry) => $entry->teacher ? "{$entry->teacher->first_name} {$entry->teacher->last_name}" : null)
                    ->filter()->unique()->implode(', ') ?: null,
                'average' => $averages->get($subjectId),
            ]);

        foreach ($summaryRows as $row) {
            if (! $tiles->has($row['subject_id'])) {
                $tiles->put($row['subject_id'], ['id' => (int) $row['subject_id'], 'name' => $row['subject'], 'teacher' => null, 'average' => $row['moy20']]);
            }
        }

        return $tiles->sortBy(fn (array $tile) => Str::lower(Str::ascii($tile['name'])))->values()->all();
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
            // DIR-06 : conseils clôturés seulement, appréciation et décisions publiables (jamais d'interne).
            'councils' => app(FamilyCouncilService::class)->forStudent($student),
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

    public function assignments(Request $request): Response
    {
        $student = $this->student($request);

        $assignments = $student->school_class_id
            ? \App\Models\HomeAssignment::where('school_class_id', $student->school_class_id)
                ->with('subject:id,name', 'teacher:id,first_name,last_name')
                ->orderByDesc('due_date')
                ->limit(100)
                ->get()
            : collect();

        return Inertia::render('Portal/Student/Assignments', ['assignments' => $assignments]);
    }

    public function library(): Response
    {
        return Inertia::render('Portal/Student/Library', [
            'resources' => LibraryResource::with('uploadedBy:id,name')->latest()->get(),
        ]);
    }

    public function invoices(Request $request, OnlinePayments $online): Response
    {
        $student = $this->student($request);

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

        return Inertia::render('Portal/Student/Invoices', [
            'invoices' => $invoices,
            // « Payer en ligne » n'apparaît que lorsqu'un pilote de paiement est actif.
            'online' => $online->forPortal(route('student.payments.start', [], false)),
        ]);
    }

    public function invoiceReceiptPdf(Request $request, Invoice $invoice, Payment $payment)
    {
        $student = $this->student($request);
        abort_unless($invoice->student_id === $student->id && $payment->invoice_id === $invoice->id, 403);

        // Un encaissement qui a réglé plusieurs factures donne un seul reçu, quel que soit le paiement demandé.
        return Receipt::pdf($payment)->stream(Receipt::filename($payment));
    }
}
