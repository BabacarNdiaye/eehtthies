<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherSalaryPayment;
use App\Models\User;
use App\Support\Exportable;
use App\Support\InstitutionalEmail;
use App\Support\TemporaryPassword;
use App\Support\PayoutAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    use Exportable;

    private function exportColumns(): array
    {
        return [
            ['key' => 'matricule', 'label' => 'Matricule'],
            ['key' => 'name', 'label' => 'Nom complet'],
            ['key' => 'specialty', 'label' => 'Spécialité'],
            ['key' => 'phone', 'label' => 'Téléphone'],
            ['key' => 'email', 'label' => 'E-mail personnel'],
            ['key' => 'professional_email', 'label' => 'E-mail professionnel'],
            ['key' => 'experience_years', 'label' => "Années d'expérience"],
            ['key' => 'status', 'label' => 'Statut'],
        ];
    }

    private function exportRows()
    {
        return Teacher::orderBy('last_name')->get()->map(fn (Teacher $t) => [
            'matricule' => $t->matricule,
            'name' => "{$t->first_name} {$t->last_name}",
            'specialty' => $t->specialty,
            'phone' => $t->phone,
            'email' => $t->email,
            'professional_email' => $t->professional_email,
            'experience_years' => $t->experience_years,
            'status' => $t->status,
        ]);
    }

    public function exportCsv()
    {
        return $this->csvResponse('enseignants-'.now()->format('Y-m-d').'.csv', $this->exportColumns(), $this->exportRows());
    }

    public function exportPdf()
    {
        return $this->pdfResponse(
            'enseignants-'.now()->format('Y-m-d').'.pdf',
            'Liste des enseignants',
            $this->exportColumns(),
            $this->exportRows(),
        );
    }

    public function importTemplate()
    {
        return $this->csvResponse('modele-import-enseignants.csv', [
            ['key' => 'matricule', 'label' => 'matricule'],
            ['key' => 'first_name', 'label' => 'first_name'],
            ['key' => 'last_name', 'label' => 'last_name'],
            ['key' => 'phone', 'label' => 'phone'],
            ['key' => 'email', 'label' => 'email'],
            ['key' => 'specialty', 'label' => 'specialty'],
            ['key' => 'experience_years', 'label' => 'experience_years'],
            ['key' => 'status', 'label' => 'status'],
        ], [
            ['matricule' => 'ENS-0004', 'first_name' => 'Prénom', 'last_name' => 'Nom', 'phone' => '77 000 00 00', 'email' => '', 'specialty' => 'Spécialité', 'experience_years' => '5', 'status' => 'actif'],
        ]);
    }

    public function importCsv(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt']]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = fgetcsv($handle, escape: '\\');

        if (! $header) {
            fclose($handle);

            return back()->with('error', 'Fichier CSV vide ou illisible.');
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $created = 0;
        $skipped = 0;

        DB::transaction(function () use ($handle, $header, &$created, &$skipped) {
            while (($row = fgetcsv($handle, escape: '\\')) !== false) {
                $entry = array_combine($header, array_pad($row, count($header), null));

                if (empty($entry['matricule']) || empty($entry['first_name']) || empty($entry['last_name'])) {
                    $skipped++;

                    continue;
                }

                if (Teacher::where('matricule', $entry['matricule'])->exists()) {
                    $skipped++;

                    continue;
                }

                $teacher = Teacher::create([
                    'matricule' => $entry['matricule'],
                    'first_name' => $entry['first_name'],
                    'last_name' => $entry['last_name'],
                    'phone' => $entry['phone'] ?: null,
                    'email' => $entry['email'] ?: null,
                    'specialty' => $entry['specialty'] ?: null,
                    'experience_years' => $entry['experience_years'] ?: null,
                    'status' => $entry['status'] ?: 'actif',
                ]);

                $teacher->update(['professional_email' => InstitutionalEmail::generate("{$teacher->first_name} {$teacher->last_name}")]);
                $created++;
            }
        });

        fclose($handle);

        return back()->with('success', "{$created} enseignant(s) importé(s). {$skipped} ligne(s) ignorée(s).");
    }

    public function index(Request $request): Response
    {
        $query = Teacher::query();

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('matricule', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Admin/Teachers/Index', [
            'teachers' => $query->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->formResponse($request);
    }

    private function formResponse(Request $request, ?Teacher $teacher = null): Response
    {
        return Inertia::render('Admin/Teachers/Form', [
            // Le mode et le compte de versement n'existent dans la page que pour qui peut modifier les salaires.
            ...(PayoutAccount::canManage($request->user()) ? ['payout' => PayoutAccount::formValues($teacher)] : []),
            'teacher' => $teacher?->load('subjects', 'attachments'),
            'subjects' => Subject::orderBy('name')->get(['id', 'name']),
            'salaryPayments' => $teacher
                ? TeacherSalaryPayment::where('teacher_id', $teacher->id)
                    ->orderByDesc('period_year')
                    ->orderByDesc('period_month')
                    ->get(['id', 'period_year', 'period_month', 'amount', 'hours_worked', 'paid_at', 'payment_method'])
                    ->map(fn (TeacherSalaryPayment $p) => [
                        'id' => $p->id,
                        'period_year' => $p->period_year,
                        'period_month' => $p->period_month,
                        'amount' => (float) $p->amount,
                        'hours_worked' => $p->hours_worked !== null ? (float) $p->hours_worked : null,
                        'paid_at' => $p->paid_at->toDateString(),
                        'payment_method' => $p->payment_method,
                    ])
                : [],
            'monthLabels' => Invoice::MONTH_LABELS,
            'paymentMethods' => Payment::METHODS,
        ]);
    }

    private function rules(?Teacher $teacher = null): array
    {
        return [
            'matricule' => ['required', 'string', 'max:50', 'unique:teachers,matricule'.($teacher ? ",{$teacher->id}" : '')],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'specialty' => ['nullable', 'string', 'max:255'],
            'diplomas' => ['nullable', 'string'],
            'experience_years' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', 'in:actif,inactif,suspendu'],
            'payment_type' => ['required', 'in:fixe,horaire'],
            'monthly_salary' => ['nullable', 'numeric', 'min:0'],
            'hourly_rate' => ['nullable', 'numeric', 'min:0'],
            // Chaque enseignant a au moins une matière dès que le catalogue en compte : c'est elle qui limite ce qu'il voit.
            'subject_ids' => [\Illuminate\Validation\Rule::requiredIf(fn () => \App\Models\Subject::exists()), 'nullable', 'array', 'min:'.(\App\Models\Subject::exists() ? 1 : 0)],
            'subject_ids.*' => ['exists:subjects,id'],
        ];
    }

    private function messages(): array
    {
        return [
            'subject_ids.required' => 'Choisissez au moins une matière pour cet enseignant.',
            'subject_ids.min' => 'Choisissez au moins une matière pour cet enseignant.',
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules() + $this->payoutRules($request), $this->messages());
        $subjectIds = $data['subject_ids'] ?? [];
        unset($data['subject_ids']);

        $data['professional_email'] = InstitutionalEmail::generate("{$data['first_name']} {$data['last_name']}");

        $teacher = Teacher::create($data);
        $teacher->subjects()->sync($subjectIds);

        return redirect()->route('admin.teachers.index')->with('success', 'Enseignant ajouté avec succès.');
    }

    public function edit(Request $request, Teacher $teacher): Response
    {
        return $this->formResponse($request, $teacher);
    }

    private function payoutRules(Request $request): array
    {
        return PayoutAccount::canManage($request->user()) ? PayoutAccount::rules() : [];
    }

    public function update(Request $request, Teacher $teacher)
    {
        $data = $request->validate($this->rules($teacher) + $this->payoutRules($request), $this->messages());
        $subjectIds = $data['subject_ids'] ?? [];
        unset($data['subject_ids']);

        $teacher->update($data);
        $teacher->subjects()->sync($subjectIds);

        return redirect()->route('admin.teachers.index')->with('success', 'Enseignant mis à jour avec succès.');
    }

    public function destroy(Teacher $teacher)
    {
        $teacher->delete();

        return back()->with('success', 'Enseignant supprimé.');
    }

    public function generateMissingEmails()
    {
        $count = Teacher::where(fn ($q) => $q->whereNull('professional_email')->orWhere('professional_email', ''))
            ->get()
            ->each(fn (Teacher $teacher) => $teacher->update([
                'professional_email' => InstitutionalEmail::generate("{$teacher->first_name} {$teacher->last_name}"),
            ]))
            ->count();

        return back()->with('success', "{$count} e-mail(s) enseignant(s) généré(s) automatiquement.");
    }

    public function createAccess(Teacher $teacher)
    {
        if (! $teacher->professional_email) {
            $teacher->update(['professional_email' => InstitutionalEmail::generate("{$teacher->first_name} {$teacher->last_name}")]);
        }

        $password = TemporaryPassword::generate();

        $user = User::updateOrCreate(
            ['email' => $teacher->professional_email],
            [
                'name' => "{$teacher->first_name} {$teacher->last_name}",
                'password' => bcrypt($password),
                'email_verified_at' => now(),
            ]
        );
        $user->forceFill(TemporaryPassword::flag(true))->save();
        $user->syncRoles(['enseignant']);
        $teacher->update(['user_id' => $user->id]);

        return back()->with('success', "Accès enseignant créé. Identifiant : {$teacher->professional_email} — Mot de passe provisoire : {$password} (à changer à la première connexion ; notez-le maintenant, il ne sera plus affiché)");
    }
}
