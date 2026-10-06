<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Candidature;
use App\Models\Formation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CandidatureController extends Controller
{
    public function create(Request $request): Response
    {
        $preselected = Formation::where('is_active', true)
            ->where('slug', $request->query('formation'))
            ->value('id');

        return Inertia::render('Public/Candidature/Create', [
            'formations' => Formation::where('is_active', true)->orderBy('order')->get(['id', 'name', 'diploma', 'level']),
            'selectedFormationId' => $preselected,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'formation_id' => ['required', 'exists:formations,id'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:M,F'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:1000'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:30'],
            'last_school' => ['nullable', 'string', 'max:255'],
            'last_diploma' => ['nullable', 'string', 'max:255'],
            'motivation' => ['nullable', 'string', 'max:3000'],
            'documents.*' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
        ]);

        $documents = $data['documents'] ?? [];
        unset($data['documents']);

        $candidature = Candidature::create([
            ...$data,
            'status' => 'soumise',
            'source' => 'site',
            'submitted_at' => now(),
        ]);

        foreach ($documents as $document) {
            $candidature->addMedia($document)->toMediaCollection('documents');
        }

        return redirect()->route('candidature.confirmation', $candidature->reference);
    }

    public function confirmation(string $reference): Response
    {
        $candidature = Candidature::where('reference', $reference)->firstOrFail();

        return Inertia::render('Public/Candidature/Confirmation', [
            'candidature' => $candidature->only(['reference', 'first_name', 'last_name', 'email', 'status']),
        ]);
    }

    public function trackForm(): Response
    {
        return Inertia::render('Public/Candidature/Track');
    }

    public function track(Request $request)
    {
        $data = $request->validate([
            'reference' => ['required', 'string'],
            'email' => ['required', 'email'],
        ]);

        $candidature = Candidature::where('reference', $data['reference'])
            ->where('email', $data['email'])
            ->with('formation:id,name')
            ->first();

        return Inertia::render('Public/Candidature/Track', [
            'result' => $candidature,
            'searched' => true,
        ]);
    }
}
