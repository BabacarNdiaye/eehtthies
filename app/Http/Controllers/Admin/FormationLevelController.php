<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\FormationLevel;
use App\Models\Skill;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class FormationLevelController extends Controller
{
    // Garde-fou TEMPORAIRE — à retirer une fois la migration formation_levels exécutée sur cet environnement
    // (déploiement du moteur de progression, 2026-09-28).
    private function migrated(): bool
    {
        return Schema::hasTable('formation_levels');
    }

    public function index(Request $request): Response
    {
        abort_unless($this->migrated(), 503, 'Cette page sera disponible sous peu (mise à jour en cours de déploiement).');

        $formationId = $request->integer('formation_id') ?: null;

        $levels = $formationId
            ? FormationLevel::where('formation_id', $formationId)
                ->with(['requiredSubjects:id,name', 'requiredSkills:id,name'])
                ->orderBy('level_number')
                ->get()
            : collect();

        return Inertia::render('Admin/FormationLevels/Index', [
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'levels' => $levels,
            'subjects' => $formationId ? Subject::where('formation_id', $formationId)->orderBy('name')->get(['id', 'name']) : collect(),
            'skills' => $formationId ? Skill::where('formation_id', $formationId)->orderBy('name')->get(['id', 'name']) : collect(),
            'selectedFormationId' => $formationId,
        ]);
    }

    private function rules(): array
    {
        return [
            'formation_id' => ['required', 'exists:formations,id'],
            'level_number' => ['required', 'integer', 'min:1'],
            'label' => ['required', 'string', 'max:255'],
            'is_final_level' => ['boolean'],
            'min_average' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'max_unjustified_absences' => ['nullable', 'integer', 'min:0'],
            'internship_required' => ['boolean'],
            'final_exam_required' => ['boolean'],
            'required_subject_ids' => ['nullable', 'array'],
            'required_subject_ids.*' => ['integer', 'exists:subjects,id'],
            'required_skill_ids' => ['nullable', 'array'],
            'required_skill_ids.*' => ['integer', 'exists:skills,id'],
        ];
    }

    public function store(Request $request)
    {
        abort_unless($this->migrated(), 503);
        $data = $request->validate($this->rules());

        $level = FormationLevel::create($data);
        $level->requiredSubjects()->sync($data['required_subject_ids'] ?? []);
        $level->requiredSkills()->sync($data['required_skill_ids'] ?? []);

        return back()->with('success', 'Niveau ajouté.');
    }

    public function update(Request $request, FormationLevel $formationLevel)
    {
        $data = $request->validate($this->rules());

        $formationLevel->update($data);
        $formationLevel->requiredSubjects()->sync($data['required_subject_ids'] ?? []);
        $formationLevel->requiredSkills()->sync($data['required_skill_ids'] ?? []);

        return back()->with('success', 'Niveau mis à jour.');
    }

    public function destroy(FormationLevel $formationLevel)
    {
        $formationLevel->delete();

        return back()->with('success', 'Niveau supprimé.');
    }
}
