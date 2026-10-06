<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Testimonial;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TestimonialController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Testimonials/Index', [
            'testimonials' => Testimonial::with('formation:id,name')->latest()->paginate(15),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Testimonials/Form', [
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:255'],
            'formation_id' => ['nullable', 'exists:formations,id'],
            'content' => ['required', 'string'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'is_published' => ['boolean'],
        ];
    }

    public function store(Request $request)
    {
        Testimonial::create($request->validate($this->rules()));

        return redirect()->route('admin.testimonials.index')->with('success', 'Témoignage ajouté avec succès.');
    }

    public function edit(Testimonial $testimonial): Response
    {
        return Inertia::render('Admin/Testimonials/Form', [
            'testimonial' => $testimonial,
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Testimonial $testimonial)
    {
        $testimonial->update($request->validate($this->rules()));

        return redirect()->route('admin.testimonials.index')->with('success', 'Témoignage mis à jour avec succès.');
    }

    public function destroy(Testimonial $testimonial)
    {
        $testimonial->delete();

        return back()->with('success', 'Témoignage supprimé.');
    }
}
