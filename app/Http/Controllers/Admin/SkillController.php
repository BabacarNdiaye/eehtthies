<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Skill;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SkillController extends Controller
{
    public function index(Request $request): Response
    {
        $formationId = $request->integer('formation_id') ?: null;

        $skills = $formationId
            ? Skill::where('formation_id', $formationId)->orderBy('order')->orderBy('name')->get()
            : collect();

        return Inertia::render('Admin/Skills/Index', [
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'skills' => $skills,
            'selectedFormationId' => $formationId,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'formation_id' => ['required', 'exists:formations,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'order' => ['nullable', 'integer', 'min:0'],
        ]);

        Skill::create($data);

        return back()->with('success', 'Compétence ajoutée.');
    }

    public function update(Request $request, Skill $skill)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'order' => ['nullable', 'integer', 'min:0'],
        ]);

        $skill->update($data);

        return back()->with('success', 'Compétence mise à jour.');
    }

    public function destroy(Skill $skill)
    {
        $skill->delete();

        return back()->with('success', 'Compétence supprimée.');
    }
}
