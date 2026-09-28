<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Partners/Index', [
            'partners' => Partner::latest()->paginate(15),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Partners/Form');
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'website' => ['nullable', 'url', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'is_published' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        Partner::create($request->validate($this->rules()));

        return redirect()->route('admin.partners.index')->with('success', 'Partenaire ajouté avec succès.');
    }

    public function edit(Partner $partner): Response
    {
        return Inertia::render('Admin/Partners/Form', ['partner' => $partner]);
    }

    public function update(Request $request, Partner $partner)
    {
        $partner->update($request->validate($this->rules()));

        return redirect()->route('admin.partners.index')->with('success', 'Partenaire mis à jour avec succès.');
    }

    public function destroy(Partner $partner)
    {
        $partner->delete();

        return back()->with('success', 'Partenaire supprimé.');
    }
}
