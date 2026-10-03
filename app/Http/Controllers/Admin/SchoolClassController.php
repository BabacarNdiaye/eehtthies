<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\FormationLevel;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SchoolClassController extends Controller
{
    // Garde-fou TEMPORAIRE — à retirer une fois les migrations
    // formation_levels/school_classes.formation_level_id exécutées sur cet environnement (déploiement du
    // moteur de progression, 2026-09-28).
    private function levelsMigrated(): bool
    {
        return Schema::hasTable('formation_levels') && Schema::hasColumn('school_classes', 'formation_level_id');
    }

    public function index(): Response
    {
        $migrated = $this->levelsMigrated();

        return Inertia::render('Admin/SchoolClasses/Index', [
            'schoolClasses' => SchoolClass::with(array_filter([
                'formation:id,name',
                'academicYear:id,label',
                'nextClass:id,name',
                $migrated ? 'formationLevel:id,formation_id,label' : null,
            ]))->withCount('students')->latest()->get(),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'label']),
            'formationLevels' => $migrated ? FormationLevel::orderBy('level_number')->get(['id', 'formation_id', 'label']) : collect(),
        ]);
    }

    private function rules(?SchoolClass $schoolClass = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'formation_id' => ['required', 'exists:formations,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'formation_level_id' => $this->levelsMigrated() ? ['nullable', 'exists:formation_levels,id'] : ['prohibited'],
            'next_class_id' => array_filter([
                'nullable', 'exists:school_classes,id',
                $schoolClass ? Rule::notIn([$schoolClass->id]) : null,
            ]),
        ];
    }

    public function store(Request $request)
    {
        SchoolClass::create($request->validate($this->rules()));

        return back()->with('success', 'Classe créée avec succès.');
    }

    public function update(Request $request, SchoolClass $schoolClass)
    {
        $schoolClass->update($request->validate($this->rules($schoolClass)));

        return back()->with('success', 'Classe mise à jour avec succès.');
    }

    public function destroy(SchoolClass $schoolClass)
    {
        $schoolClass->delete();

        return back()->with('success', 'Classe supprimée.');
    }
}
