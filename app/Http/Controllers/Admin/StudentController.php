<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\WelcomeStudent;
use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Models\User;
use App\Support\Exportable;
use App\Support\InstitutionalEmail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class StudentController extends Controller
{
    use Exportable;

    private function exportColumns(): array
    {
        return [
            ['key' => 'matricule', 'label' => 'Matricule'],
            ['key' => 'name', 'label' => 'Nom complet'],
            ['key' => 'formation', 'label' => 'Formation'],
            ['key' => 'classe', 'label' => 'Classe'],
            ['key' => 'phone', 'label' => 'Téléphone'],
            ['key' => 'email', 'label' => 'E-mail personnel'],
            ['key' => 'professional_email', 'label' => 'E-mail professionnel'],
            ['key' => 'status', 'label' => 'Statut'],
        ];
    }

    private function exportRows()
    {
        return Student::with(['formation:id,name', 'schoolClass:id,name'])
            ->orderBy('last_name')
            ->get()
            ->map(fn (Student $s) => [
                'matricule' => $s->matricule,
                'name' => $s->full_name,
                'formation' => $s->formation?->name,
                'classe' => $s->schoolClass?->name,
                'phone' => $s->phone,
                'email' => $s->email,
                'professional_email' => $s->professional_email,
                'status' => $s->status,
            ]);
    }

    public function exportCsv()
    {
        return $this->csvResponse('eleves-'.now()->format('Y-m-d').'.csv', $this->exportColumns(), $this->exportRows());
    }

    public function exportPdf()
    {
        return $this->pdfResponse(
            'eleves-'.now()->format('Y-m-d').'.pdf',
            'Liste des élèves',
            $this->exportColumns(),
            $this->exportRows(),
        );
    }

    public function index(Request $request): Response
    {
        $query = Student::with(['formation:id,name', 'schoolClass:id,name']);

        if ($request->filled('formation_id')) {
            $query->where('formation_id', $request->integer('formation_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('matricule', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Admin/Students/Index', [
            'students' => $query->latest()->paginate(15)->withQueryString(),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['formation_id', 'status', 'search']),
        ]);
    }

    public function create(): Response
    {
        return $this->formResponse();
    }

    private function formResponse(?Student $student = null): Response
    {
        $student?->load(['documents' => fn ($q) => $q->latest(), 'documents.uploader:id,name']);

        return Inertia::render('Admin/Students/Form', [
            'student' => $student,
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name', 'formation_id']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'documentTypes' => StudentDocument::TYPES,
            // Full bulletin history across every academic year — a promotion to a
            // new class/year never deletes or hides these (ReportCard rows keep
            // their own academic_year_id independently of the student's current
            // one), so this is what makes that history visible in the dossier.
            'reportCards' => $student
                ? $student->reportCards()
                    ->with('academicYear:id,label')
                    ->orderByDesc('academic_year_id')
                    ->orderByDesc('generated_at')
                    ->get(['id', 'student_id', 'academic_year_id', 'term', 'average', 'decision', 'is_published', 'generated_at'])
                : collect(),
        ]);
    }

    private function rules(?Student $student = null): array
    {
        return [
            'matricule' => ['required', 'string', 'max:50', 'unique:students,matricule'.($student ? ",{$student->id}" : '')],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date'],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'is_repeating' => ['boolean'],
            'gender' => ['nullable', 'in:M,F'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'formation_id' => ['nullable', 'exists:formations,id'],
            'school_class_id' => ['nullable', 'exists:school_classes,id'],
            'academic_year_id' => ['nullable', 'exists:academic_years,id'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:30'],
            'guardian_email' => ['nullable', 'email', 'max:255'],
            'emergency_contact' => ['nullable', 'string', 'max:255'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'allergies' => ['nullable', 'string', 'max:2000'],
            'chronic_conditions' => ['nullable', 'string', 'max:2000'],
            'current_medication' => ['nullable', 'string', 'max:2000'],
            'health_insurance' => ['nullable', 'string', 'max:255'],
            'doctor_name' => ['nullable', 'string', 'max:255'],
            'doctor_phone' => ['nullable', 'string', 'max:30'],
            'health_notes' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', 'in:actif,suspendu,abandon,diplome,transfere,exclu'],
            'graduation_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'current_position' => ['nullable', 'string', 'max:255'],
            'current_employer' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'alumni_bio' => ['nullable', 'string', 'max:2000'],
            'is_alumni_public' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $data['professional_email'] = InstitutionalEmail::generate("{$data['first_name']} {$data['last_name']}");

        Student::create($data);

        return redirect()->route('admin.students.index')->with('success', 'Élève ajouté avec succès.');
    }

    public function edit(Student $student): Response
    {
        return $this->formResponse($student);
    }

    public function update(Request $request, Student $student)
    {
        $student->update($request->validate($this->rules($student)));

        return redirect()->route('admin.students.index')->with('success', 'Élève mis à jour avec succès.');
    }

    public function destroy(Student $student)
    {
        $student->delete();

        return back()->with('success', 'Élève supprimé.');
    }

    public function importTemplate()
    {
        return $this->csvResponse('modele-import-eleves.csv', [
            ['key' => 'matricule', 'label' => 'matricule'],
            ['key' => 'first_name', 'label' => 'first_name'],
            ['key' => 'last_name', 'label' => 'last_name'],
            ['key' => 'birth_date', 'label' => 'birth_date'],
            ['key' => 'birth_place', 'label' => 'birth_place'],
            ['key' => 'gender', 'label' => 'gender'],
            ['key' => 'phone', 'label' => 'phone'],
            ['key' => 'email', 'label' => 'email'],
            ['key' => 'formation', 'label' => 'formation'],
            ['key' => 'status', 'label' => 'status'],
        ], [
            ['matricule' => 'ELV-2027-0001', 'first_name' => 'Prénom', 'last_name' => 'Nom', 'birth_date' => '2005-01-31', 'birth_place' => 'Thiès', 'gender' => 'M', 'phone' => '77 000 00 00', 'email' => '', 'formation' => 'Nom exact de la formation', 'status' => 'actif'],
        ]);
    }

    public function importCsv(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt']]);

        $result = $this->processImportFile($request->file('file')->getRealPath());

        return back()->with('success', "{$result['created']} élève(s) importé(s). {$result['skipped']} ligne(s) ignorée(s) (matricule déjà existant ou données manquantes).");
    }

    private function processImportFile(string $path): array
    {
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle, escape: '\\');

        if (! $header) {
            fclose($handle);

            return ['created' => 0, 'skipped' => 0, 'unmatched_formations' => []];
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $formationsByName = Formation::pluck('id', 'name')->mapWithKeys(fn ($id, $name) => [strtolower($name) => $id]);

        $created = 0;
        $skipped = 0;
        $unmatchedFormations = [];

        DB::transaction(function () use ($handle, $header, $formationsByName, &$created, &$skipped, &$unmatchedFormations) {
            while (($row = fgetcsv($handle, escape: '\\')) !== false) {
                $entry = array_combine($header, array_pad($row, count($header), null));

                if (empty($entry['matricule']) || empty($entry['first_name']) || empty($entry['last_name'])) {
                    $skipped++;

                    continue;
                }

                if (Student::where('matricule', $entry['matricule'])->exists()) {
                    $skipped++;

                    continue;
                }

                $formationId = ! empty($entry['formation'])
                    ? $formationsByName->get(strtolower(trim($entry['formation'])))
                    : null;

                if (! empty($entry['formation']) && ! $formationId) {
                    $unmatchedFormations[$entry['formation']] = true;
                }

                $student = Student::create([
                    'matricule' => $entry['matricule'],
                    'first_name' => $entry['first_name'],
                    'last_name' => $entry['last_name'],
                    'birth_date' => $entry['birth_date'] ?: null,
                    'birth_place' => $entry['birth_place'] ?? null,
                    'gender' => in_array($entry['gender'] ?? null, ['M', 'F']) ? $entry['gender'] : null,
                    'phone' => $entry['phone'] ?: null,
                    'email' => $entry['email'] ?: null,
                    'formation_id' => $formationId,
                    'status' => $entry['status'] ?: 'actif',
                ]);

                $student->update(['professional_email' => InstitutionalEmail::generate($student->full_name)]);
                $created++;
            }
        });

        fclose($handle);

        return ['created' => $created, 'skipped' => $skipped, 'unmatched_formations' => array_keys($unmatchedFormations)];
    }

    public function generateMissingEmails()
    {
        $studentCount = Student::where(fn ($q) => $q->whereNull('professional_email')->orWhere('professional_email', ''))
            ->get()
            ->each(fn (Student $student) => $student->update(['professional_email' => InstitutionalEmail::generate($student->full_name)]))
            ->count();

        $guardianCount = Student::where(fn ($q) => $q->whereNull('guardian_email')->orWhere('guardian_email', ''))
            ->whereNotNull('guardian_name')
            ->where('guardian_name', '!=', '')
            ->get()
            ->each(fn (Student $student) => $student->update(['guardian_email' => InstitutionalEmail::generate($student->guardian_name)]))
            ->count();

        return back()->with('success', "{$studentCount} e-mail(s) élève(s) et {$guardianCount} e-mail(s) tuteur(s) généré(s) automatiquement.");
    }

    public function createAccess(Student $student)
    {
        if (! $student->professional_email) {
            $student->update(['professional_email' => InstitutionalEmail::generate($student->full_name)]);
        }

        $password = config('eeht.default_password');

        $user = User::updateOrCreate(
            ['email' => $student->professional_email],
            [
                'name' => $student->full_name,
                'password' => bcrypt($password),
                'email_verified_at' => now(),
            ]
        );
        $user->syncRoles(['eleve']);
        $student->update(['user_id' => $user->id]);

        try {
            Mail::to($student->email)->send(new WelcomeStudent($student, $password));

            return back()->with('success', "Accès élève créé. Un e-mail avec les identifiants a été envoyé à {$student->email}.");
        } catch (\Throwable $e) {
            report($e);

            return back()->with('success', "Accès élève créé, mais l'e-mail n'a pas pu être envoyé. Identifiant : {$student->professional_email} — Mot de passe par défaut : {$password}");
        }
    }

    public function createParentAccess(Student $student)
    {
        if (! $student->guardian_email) {
            $guardianName = $student->guardian_name ?: "Parent {$student->last_name}";
            $student->update(['guardian_email' => InstitutionalEmail::generate($guardianName)]);
        }

        $existing = User::where('email', $student->guardian_email)->first();

        if ($existing) {
            $existing->syncRoles(['parent']);
            $student->update(['parent_user_id' => $existing->id]);

            return back()->with('success', "Le compte parent existant ({$student->guardian_email}) a été lié à cet élève.");
        }

        $password = config('eeht.default_password');

        $user = User::create([
            'name' => $student->guardian_name ?: 'Parent de '.$student->full_name,
            'email' => $student->guardian_email,
            'password' => bcrypt($password),
            'email_verified_at' => now(),
        ]);
        $user->syncRoles(['parent']);
        $student->update(['parent_user_id' => $user->id]);

        return back()->with('success', "Accès parent créé. Identifiant : {$student->guardian_email} — Mot de passe par défaut : {$password}");
    }

    public function diplomaPdf(Student $student)
    {
        abort_unless($student->status === 'diplome', 422, 'Le diplôme ne peut être généré que pour un élève diplômé.');
        abort_unless($student->formation, 422, "Cet élève n'a pas de formation associée.");

        $student->generateDiplomaNumber();

        $verificationUrl = route('diplomas.verify', $student->diploma_number);
        $qrCode = base64_encode(QrCode::format('svg')->size(150)->generate($verificationUrl));

        $pdf = Pdf::loadView('pdf.diploma', [
            'student' => $student->load('formation'),
            'qrCode' => $qrCode,
        ])->setPaper('a4', 'landscape');

        return $pdf->stream("diplome-{$student->matricule}.pdf");
    }

    public function attestationPdf(Student $student)
    {
        abort_unless($student->formation, 422, "Cet élève n'a pas de formation associée.");

        $student->generateTrainingAttestationNumber();

        $pdf = Pdf::loadView('pdf.training-attestation', [
            'student' => $student->load('formation', 'schoolClass'),
        ])->setPaper('a4', 'portrait');

        return $pdf->stream("attestation-formation-{$student->matricule}.pdf");
    }

    public function updatePhoto(Request $request, Student $student)
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if ($student->photo) {
            Storage::disk('public')->delete($student->photo);
        }

        $path = $request->file('photo')->store('students/photos', 'public');
        $student->update(['photo' => $path]);

        return back()->with('success', 'Photo mise à jour avec succès.');
    }

    public function idCardPdf(Student $student)
    {
        $student->generateQrToken();

        $pdf = Pdf::loadView('pdf.student-card', [
            'students' => collect([$student->load('formation', 'schoolClass', 'academicYear')])
                ->map(fn (Student $s) => $this->withCardQrCode($s)),
        ])->setPaper('a4', 'portrait');

        return $pdf->stream("carte-{$student->matricule}.pdf");
    }

    public function idCardsBulk(Request $request)
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'exists:school_classes,id'],
        ]);

        $students = Student::with('formation', 'schoolClass', 'academicYear')
            ->where('school_class_id', $data['school_class_id'])
            ->where('status', 'actif')
            ->orderBy('last_name')
            ->get();

        abort_if($students->isEmpty(), 404, 'Aucun élève actif dans cette classe.');

        $students->each(fn (Student $s) => $s->generateQrToken());

        $schoolClass = SchoolClass::findOrFail($data['school_class_id']);

        $pdf = Pdf::loadView('pdf.student-card', [
            'students' => $students->map(fn (Student $s) => $this->withCardQrCode($s)),
        ])->setPaper('a4', 'portrait');

        return $pdf->stream('cartes-'.preg_replace('/[^A-Za-z0-9-_]/', '_', $schoolClass->name).'.pdf');
    }

    private function withCardQrCode(Student $student): Student
    {
        $student->qr_code = base64_encode(QrCode::format('svg')->size(140)->generate($student->qr_token));

        return $student;
    }
}
