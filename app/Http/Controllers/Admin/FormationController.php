<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Support\ImageOptimizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FormationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Formation/Index', [
            'formations' => Formation::withCount('students')->orderBy('order')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Formation/Form');
    }

    private function rules(?Formation $formation = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:formations,code'.($formation ? ",{$formation->id}" : '')],
            'diploma' => ['nullable', 'string', 'max:100'],
            'diploma_recognition' => ['nullable', 'string', 'max:255'],
            'level' => ['nullable', 'string', 'max:100'],
            'duration' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'admission_conditions' => ['nullable', 'string'],
            'registration_fee' => ['nullable', 'numeric', 'min:0'],
            'tuition_fee' => ['nullable', 'numeric', 'min:0'],
            'program' => ['nullable', 'string'],
            'objectives' => ['nullable', 'string'],
            'career_prospects' => ['nullable', 'string'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'next_intake_date' => ['nullable', 'date'],
            'is_active' => ['boolean'],
            'order' => ['nullable', 'integer'],
            'image' => ['nullable', 'image', 'max:5120'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $data['slug'] = Str::slug($data['name']);

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'formations');
        }

        Formation::create($data);

        return redirect()->route('admin.formations.index')->with('success', 'Formation créée avec succès.');
    }

    public function edit(Formation $formation): Response
    {
        return Inertia::render('Admin/Formation/Form', [
            'formation' => $formation,
        ]);
    }

    public function update(Request $request, Formation $formation)
    {
        $data = $request->validate($this->rules($formation));
        $data['slug'] = Str::slug($data['name']);

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'formations');
        } else {
            unset($data['image']);
        }

        $formation->update($data);

        return redirect()->route('admin.formations.index')->with('success', 'Formation mise à jour avec succès.');
    }

    public function destroy(Formation $formation)
    {
        $formation->delete();

        return back()->with('success', 'Formation supprimée.');
    }
}
