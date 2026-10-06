<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\JobOffer;
use App\Models\Partner;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobOfferController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/JobOffers/Index', [
            'offers' => JobOffer::with('partner:id,name')->latest()->paginate(15),
            'contractTypes' => JobOffer::CONTRACT_TYPES,
        ]);
    }

    public function create(): Response
    {
        return $this->formResponse();
    }

    private function formResponse(?JobOffer $offer = null): Response
    {
        return Inertia::render('Admin/JobOffers/Form', [
            'offer' => $offer,
            'partners' => Partner::orderBy('name')->get(['id', 'name']),
            'contractTypes' => JobOffer::CONTRACT_TYPES,
        ]);
    }

    private function rules(): array
    {
        return [
            'partner_id' => ['required', 'exists:partners,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'contract_type' => ['required', 'in:'.implode(',', array_keys(JobOffer::CONTRACT_TYPES))],
            'location' => ['nullable', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date'],
            'is_published' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        JobOffer::create($request->validate($this->rules()));

        return redirect()->route('admin.job-offers.index')->with('success', "Offre d'emploi créée avec succès.");
    }

    public function edit(JobOffer $jobOffer): Response
    {
        return $this->formResponse($jobOffer);
    }

    public function update(Request $request, JobOffer $jobOffer)
    {
        $jobOffer->update($request->validate($this->rules()));

        return redirect()->route('admin.job-offers.index')->with('success', "Offre d'emploi mise à jour avec succès.");
    }

    public function destroy(JobOffer $jobOffer)
    {
        $jobOffer->delete();

        return back()->with('success', "Offre d'emploi supprimée.");
    }
}
