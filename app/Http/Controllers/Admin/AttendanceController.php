<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Services\AttendanceCheckInResolver;
use App\Support\Exportable;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class AttendanceController extends Controller
{
    use Exportable;

    public function index(Request $request): Response
    {
        $schoolClassId = $request->integer('school_class_id') ?: null;
        $date = $request->string('date')->toString() ?: now()->toDateString();
        $subjectId = $request->integer('subject_id') ?: null;

        $students = collect();
        $existing = collect();

        if ($schoolClassId) {
            $students = Student::where('school_class_id', $schoolClassId)
                ->where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'matricule', 'first_name', 'last_name'])
                ->map(function (Student $student) use ($schoolClassId, $date) {
                    $payload = json_encode([
                        'student_id' => $student->id,
                        'school_class_id' => $schoolClassId,
                        'date' => $date,
                    ], JSON_THROW_ON_ERROR);

                    $student->qr_code = base64_encode(QrCode::format('svg')->size(120)->generate($payload));

                    return $student;
                });

            $existing = Attendance::where('school_class_id', $schoolClassId)
                ->where('date', $date)
                ->when($subjectId, fn ($q) => $q->where('subject_id', $subjectId))
                ->when(! $subjectId, fn ($q) => $q->whereNull('subject_id'))
                ->get()
                ->keyBy('student_id');
        }

        return Inertia::render('Admin/Pointage/Index', [
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::orderBy('name')->get(['id', 'name']),
            'students' => $students,
            'existing' => $existing,
            'selectedClassId' => $schoolClassId,
            'selectedSubjectId' => $subjectId,
            'date' => $date,
            'statuses' => Attendance::STATUSES,
        ]);
    }

    public function kiosk(Request $request): Response
    {
        return $this->renderKiosk($this->modeFromRequest($request));
    }

    // Point d'entrée destiné au personnel pour scanner les badges des cartes d'élève (mode portique),
    // accessible depuis le menu d'administration sans qu'il faille connaître l'astuce du paramètre
    // ?mode=gate.
    public function kioskGate(): Response
    {
        return $this->renderKiosk('gate');
    }

    // Vue publique de la borne — jeton requis dans l'URL (GET /borne/pointage/open?token=...)
    public function kioskOpen(Request $request): Response
    {
        if (! $this->validKioskToken($request->query('token'))) {
            abort(403, 'Jeton invalide ou manquant.');
        }

        return $this->renderKiosk($this->modeFromRequest($request));
    }

    // Borne ouverte depuis une session de connexion du personnel (route /borne/pointage, derrière « staff »).
    public function kioskPublic(Request $request): Response
    {
        return $this->renderKiosk($this->modeFromRequest($request));
    }

    /** Le jeton de la borne : comparaison à temps constant, et refus si aucun jeton n'est configuré. */
    private function validKioskToken(mixed $given): bool
    {
        $expected = (string) config('eeht.kiosk_token');

        return $expected !== '' && is_string($given) && hash_equals($expected, $given);
    }

    private function modeFromRequest(Request $request): string
    {
        return $request->query('mode') === 'gate' ? 'gate' : 'classroom';
    }

    // mode=gate affiche la variante « portique » de la borne (scan du qr_token d'un badge, sans liste
    // d'élèves préchargée) au lieu de la variante « salle de classe » (scan du student_id).
    private function renderKiosk(string $mode): Response
    {
        $students = $mode === 'gate'
            ? []
            : Student::where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'matricule', 'first_name', 'last_name', 'school_class_id', 'photo']);

        return Inertia::render('Admin/Pointage/Kiosk', [
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::orderBy('name')->get(['id', 'name']),
            'students' => $students,
            'date' => now()->toDateString(),
            'mode' => $mode,
        ]);
    }

    public function store(Request $request, AttendanceCheckInResolver $resolver)
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'subject_id' => ['nullable', 'exists:subjects,id'],
            'date' => ['required', 'date'],
            'records' => ['required', 'array'],
            'records.*.student_id' => ['required', 'exists:students,id'],
            'records.*.status' => ['required', 'in:present,absent,retard,absence_justifiee'],
            'records.*.justification' => ['nullable', 'string', 'max:1000'],
        ]);

        // Résolu une seule fois (identique pour tous les élèves de ce lot) plutôt qu'enregistrement par
        // enregistrement, pour éviter une recherche d'emploi du temps en N+1.
        $entry = $resolver->scheduledPeriod(
            (int) $data['school_class_id'],
            isset($data['subject_id']) ? (int) $data['subject_id'] : null,
            $data['date']
        );

        foreach ($data['records'] as $record) {
            $resolver->recordAttendance(
                (int) $record['student_id'],
                (int) $data['school_class_id'],
                isset($data['subject_id']) ? (int) $data['subject_id'] : null,
                $data['date'],
                $record['status'],
                $record['justification'] ?? null,
                $request->user()->id,
                $entry,
            );
        }

        return back()->with('success', 'Présences enregistrées avec succès.');
    }

    public function qrScan(Request $request, AttendanceCheckInResolver $resolver)
    {
        $data = $request->validate([
            'student_id' => ['required_without:qr_token', 'nullable', 'exists:students,id'],
            'qr_token' => ['required_without:student_id', 'nullable', 'string'],
            'school_class_id' => ['nullable', 'exists:school_classes,id'],
            'date' => ['required', 'date'],
            'status' => ['nullable', 'in:present,absent,retard,absence_justifiee'],
        ]);

        $student = $this->resolveStudentFromScan($data);

        return $this->recordScan($student, $data, $request->user()->id, $resolver);
    }

    // Point d'entrée public de scan (POST /borne/pointage/scan/open) — attend kiosk_token dans le corps de la
    // requête
    public function qrScanOpen(Request $request, AttendanceCheckInResolver $resolver)
    {
        if (! $this->validKioskToken($request->input('kiosk_token'))) {
            return response()->json(['message' => 'Jeton de borne invalide.'], 403);
        }

        $data = $request->validate([
            'student_id' => ['required_without:qr_token', 'nullable', 'exists:students,id'],
            'qr_token' => ['required_without:student_id', 'nullable', 'string'],
            'school_class_id' => ['nullable', 'exists:school_classes,id'],
            'date' => ['required', 'date'],
            'status' => ['nullable', 'in:present,absent,retard,absence_justifiee'],
        ]);

        $student = $this->resolveStudentFromScan($data);

        return $this->recordScan($student, $data, null, $resolver);
    }

    // student_id (borne en salle de classe) ou qr_token (scan de badge au portique) identifie l'élève.
    private function resolveStudentFromScan(array $data): Student
    {
        $student = ! empty($data['qr_token'])
            ? Student::where('qr_token', $data['qr_token'])->first()
            : Student::find($data['student_id'] ?? null);

        abort_unless($student, 404, 'Badge non reconnu.');

        return $student;
    }

    private function recordScan(Student $student, array $data, ?int $recordedBy, AttendanceCheckInResolver $resolver)
    {
        $schoolClassId = $data['school_class_id'] ?? $student->school_class_id;

        abort_unless($schoolClassId, 422, 'L’élève n’est associé à aucune classe.');

        $attendance = $resolver->recordScan((int) $student->id, (int) $schoolClassId, $data['date'], $recordedBy);

        $lateMinutes = 0;
        if ($attendance->status === 'retard' && $attendance->checked_in_at && $attendance->timetable_entry_id) {
            $entry = $attendance->timetableEntry;
            if ($entry) {
                $start = Carbon::parse($attendance->checked_in_at->toDateString().' '.$entry->start_time);
                $lateMinutes = max(0, (int) floor($start->diffInMinutes($attendance->checked_in_at, false)));
            }
        }

        return response()->json([
            'message' => $attendance->status === 'retard'
                ? $student->full_name.' a été marqué(e) en retard.'
                : $student->full_name.' a été marqué(e) comme présent(e).',
            'student' => [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'first_name' => $student->first_name,
                'photo' => $student->photo,
            ],
            'school_class' => SchoolClass::find($schoolClassId)?->name,
            'status' => $attendance->status,
            'late_minutes' => $lateMinutes,
        ]);
    }

    public function report(Request $request): Response
    {
        $schoolClassId = $request->integer('school_class_id') ?: null;
        $from = $request->string('from')->toString() ?: now()->subDays(30)->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();

        $summary = collect();

        if ($schoolClassId) {
            $summary = Student::where('school_class_id', $schoolClassId)
                ->where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'matricule', 'first_name', 'last_name'])
                ->map(function ($student) use ($from, $to) {
                    $counts = Attendance::where('student_id', $student->id)
                        ->whereBetween('date', [$from, $to])
                        ->selectRaw('status, count(*) as total')
                        ->groupBy('status')
                        ->pluck('total', 'status');

                    return [
                        'student' => $student,
                        'present' => (int) ($counts['present'] ?? 0),
                        'absent' => (int) ($counts['absent'] ?? 0),
                        'retard' => (int) ($counts['retard'] ?? 0),
                        'absence_justifiee' => (int) ($counts['absence_justifiee'] ?? 0),
                    ];
                });
        }

        return Inertia::render('Admin/Pointage/Report', [
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'summary' => $summary,
            'selectedClassId' => $schoolClassId,
            'from' => $from,
            'to' => $to,
        ]);
    }

    /** Cahier d'absence — registre chronologique des lignes non « présent », et pas seulement des totaux agrégés. */
    private function registerQuery(Request $request)
    {
        $schoolClassId = $request->integer('school_class_id') ?: null;
        $subjectId = $request->integer('subject_id') ?: null;
        $from = $request->string('from')->toString() ?: now()->subDays(30)->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();

        return Attendance::where('status', '!=', 'present')
            ->when($schoolClassId, fn ($q) => $q->where('school_class_id', $schoolClassId))
            ->when($subjectId, fn ($q) => $q->where('subject_id', $subjectId))
            // whereDate (et non whereBetween sur la colonne brute) pour que le résultat soit correct que le
            // pilote stocke ou non une composante horaire dans les colonnes converties en `date` (SQLite
            // conserve « Y-m-d H:i:s » ; MySQL non).
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->with([
                'student:id,matricule,first_name,last_name',
                'subject:id,name',
                'schoolClass:id,name',
                'timetableEntry:id,start_time,end_time',
            ])
            ->orderByDesc('date');
    }

    public function register(Request $request): Response
    {
        $records = $this->registerQuery($request)->paginate(30)->withQueryString();

        return Inertia::render('Admin/Pointage/Register', [
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::orderBy('name')->get(['id', 'name']),
            'records' => $records,
            'statuses' => Attendance::STATUSES,
            'selectedClassId' => $request->integer('school_class_id') ?: null,
            'selectedSubjectId' => $request->integer('subject_id') ?: null,
            'from' => $request->string('from')->toString() ?: now()->subDays(30)->toDateString(),
            'to' => $request->string('to')->toString() ?: now()->toDateString(),
        ]);
    }

    public function registerPdf(Request $request)
    {
        $rows = $this->registerQuery($request)->get()->map(fn (Attendance $a) => [
            'date' => $a->date->format('d/m/Y'),
            'student' => $a->student ? "{$a->student->first_name} {$a->student->last_name}" : '—',
            'matricule' => $a->student->matricule ?? '—',
            'class' => $a->schoolClass->name ?? '—',
            'subject' => $a->subject->name ?? 'Journée entière',
            'status' => Attendance::STATUSES[$a->status] ?? $a->status,
            'expected' => $a->timetableEntry?->start_time ? substr($a->timetableEntry->start_time, 0, 5) : '—',
            'checked_in' => $a->checked_in_at?->format('H:i') ?? '—',
        ]);

        return $this->pdfResponse(
            'registre-absences.pdf',
            "Registre d'absences",
            [
                ['key' => 'date', 'label' => 'Date'],
                ['key' => 'student', 'label' => 'Élève'],
                ['key' => 'matricule', 'label' => 'Matricule'],
                ['key' => 'class', 'label' => 'Classe'],
                ['key' => 'subject', 'label' => 'Matière'],
                ['key' => 'status', 'label' => 'Statut'],
                ['key' => 'expected', 'label' => 'Heure prévue'],
                ['key' => 'checked_in', 'label' => 'Heure d’arrivée'],
            ],
            $rows
        );
    }
}
