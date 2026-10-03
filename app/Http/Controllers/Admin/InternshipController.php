<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Internship;
use App\Models\InternshipOffer;
use App\Models\Partner;
use App\Models\Student;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InternshipController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Internship::with('student:id,first_name,last_name,matricule', 'partner:id,name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return Inertia::render('Admin/Internships/Index', [
            'internships' => $query->latest()->paginate(15)->withQueryString(),
            'statuses' => Internship::STATUSES,
            'filters' => $request->only(['status']),
        ]);
    }

    public function create(): Response
    {
        return $this->formResponse();
    }

    private function formResponse(?Internship $internship = null): Response
    {
        return Inertia::render('Admin/Internships/Form', [
            'internship' => $internship?->load('attachments'),
            'students' => Student::orderBy('last_name')->get(['id', 'first_name', 'last_name', 'matricule']),
            'partners' => Partner::orderBy('name')->get(['id', 'name']),
            'offers' => InternshipOffer::orderByDesc('created_at')->get(['id', 'title', 'partner_id']),
            'statuses' => Internship::STATUSES,
        ]);
    }

    private function rules(): array
    {
        return [
            'student_id' => ['required', 'exists:students,id'],
            'partner_id' => ['required', 'exists:partners,id'],
            'internship_offer_id' => ['nullable', 'exists:internship_offers,id'],
            'title' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'supervisor_name' => ['nullable', 'string', 'max:255'],
            'supervisor_phone' => ['nullable', 'string', 'max:30'],
            'supervisor_email' => ['nullable', 'email', 'max:255'],
            'status' => ['required', 'in:en_cours,termine,abandonne'],
            'evaluation_score' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'evaluation_appreciation' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function store(Request $request)
    {
        Internship::create($request->validate($this->rules()));

        return redirect()->route('admin.internships.index')->with('success', 'Stage créé avec succès.');
    }

    public function edit(Internship $internship): Response
    {
        return $this->formResponse($internship);
    }

    public function update(Request $request, Internship $internship)
    {
        $internship->update($request->validate($this->rules()));

        return redirect()->route('admin.internships.index')->with('success', 'Stage mis à jour avec succès.');
    }

    public function destroy(Internship $internship)
    {
        $internship->delete();

        return back()->with('success', 'Stage supprimé.');
    }

    public function attestationPdf(Internship $internship)
    {
        abort_unless($internship->status === 'termine', 422, "L'attestation ne peut être générée que pour un stage terminé.");

        $internship->generateAttestationNumber();

        $pdf = Pdf::loadView('pdf.internship-attestation', [
            'internship' => $internship->load('student', 'partner'),
        ]);

        return $pdf->stream("attestation-stage-{$internship->attestation_number}.pdf");
    }
}
