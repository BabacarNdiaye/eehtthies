<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Candidature;
use App\Models\Formation;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CandidatureController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Candidature::with('formation:id,name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('formation_id')) {
            $query->where('formation_id', $request->integer('formation_id'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Admin/Candidatures/Index', [
            'candidatures' => $query->latest()->paginate(15)->withQueryString(),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'statuses' => Candidature::STATUSES,
            'filters' => $request->only(['status', 'formation_id', 'search']),
        ]);
    }

    public function show(Candidature $candidature): Response
    {
        return Inertia::render('Admin/Candidatures/Show', [
            'candidature' => $candidature->load('formation', 'academicYear')->loadCount('student'),
            'documents' => $candidature->getMedia('documents')->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'url' => $m->getUrl(),
                'size' => $m->human_readable_size,
            ]),
            'statuses' => Candidature::STATUSES,
        ]);
    }

    public function updateStatus(Request $request, Candidature $candidature)
    {
        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', array_keys(Candidature::STATUSES))],
            'admin_notes' => ['nullable', 'string', 'max:3000'],
            'interview_at' => ['nullable', 'date'],
        ]);

        $candidature->update($data);

        return back()->with('success', 'Statut de la candidature mis à jour.');
    }

    public function convertToStudent(Candidature $candidature)
    {
        abort_if($candidature->student()->exists(), 422, 'Cette candidature a déjà été transformée en élève.');

        $currentYear = AcademicYear::where('is_current', true)->first();

        $student = Student::create([
            'matricule' => 'ELV-'.now()->format('Y').'-'.str_pad((string) (Student::count() + 1), 4, '0', STR_PAD_LEFT),
            'first_name' => $candidature->first_name,
            'last_name' => $candidature->last_name,
            'birth_date' => $candidature->birth_date,
            'gender' => $candidature->gender,
            'address' => $candidature->address,
            'phone' => $candidature->phone,
            'email' => $candidature->email,
            'formation_id' => $candidature->formation_id,
            'academic_year_id' => $currentYear?->id,
            'guardian_name' => $candidature->guardian_name,
            'guardian_phone' => $candidature->guardian_phone,
            'status' => 'actif',
            'candidature_id' => $candidature->id,
        ]);

        $candidature->update(['status' => 'inscription_finalisee']);

        return redirect()->route('admin.students.edit', $student)->with('success', 'Candidat inscrit en tant qu\'élève avec succès.');
    }
}
