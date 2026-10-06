<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\InternshipOffer;
use App\Models\Partner;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InternshipOfferController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/InternshipOffers/Index', [
            'offers' => InternshipOffer::with('partner:id,name', 'formation:id,name')->withCount('internships')->latest()->paginate(15),
        ]);
    }

    public function create(): Response
    {
        return $this->formResponse();
    }

    private function formResponse(?InternshipOffer $offer = null): Response
    {
        return Inertia::render('Admin/InternshipOffers/Form', [
            'offer' => $offer,
            'partners' => Partner::orderBy('name')->get(['id', 'name']),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function rules(): array
    {
        return [
            'partner_id' => ['required', 'exists:partners,id'],
            'formation_id' => ['nullable', 'exists:formations,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'positions_available' => ['required', 'integer', 'min:1'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'expires_at' => ['nullable', 'date'],
            'is_published' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        InternshipOffer::create($request->validate($this->rules()));

        return redirect()->route('admin.internship-offers.index')->with('success', 'Offre de stage créée avec succès.');
    }

    public function edit(InternshipOffer $internshipOffer): Response
    {
        return $this->formResponse($internshipOffer);
    }

    public function update(Request $request, InternshipOffer $internshipOffer)
    {
        $internshipOffer->update($request->validate($this->rules()));

        return redirect()->route('admin.internship-offers.index')->with('success', 'Offre de stage mise à jour avec succès.');
    }

    public function destroy(InternshipOffer $internshipOffer)
    {
        $internshipOffer->delete();

        return back()->with('success', 'Offre de stage supprimée.');
    }
}
