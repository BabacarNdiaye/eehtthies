<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\SchoolClass;
use App\Models\SkillAssessment;
use App\Models\Student;
use App\Support\Exportable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SkillAssessmentController extends Controller
{
    use Exportable;

    public function index(Request $request): Response
    {
        $schoolClassId = $request->integer('school_class_id') ?: null;
        $studentId = $request->integer('student_id') ?: null;

        $assessments = SkillAssessment::with(['student:id,first_name,last_name,matricule,school_class_id', 'skill:id,name,formation_id', 'teacher:id,first_name,last_name'])
            ->when($schoolClassId, fn ($q) => $q->whereHas('student', fn ($s) => $s->where('school_class_id', $schoolClassId)))
            ->when($studentId, fn ($q) => $q->where('student_id', $studentId))
            ->latest('assessed_at')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('Admin/SkillAssessments/Index', [
            'assessments' => $assessments,
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'levels' => SkillAssessment::LEVELS,
            'selectedClassId' => $schoolClassId,
            'selectedStudentId' => $studentId,
        ]);
    }

    /** « Fiche de compétences » — le niveau le plus récent d'un élève pour chaque compétence de sa formation. */
    public function studentPdf(Student $student)
    {
        abort_unless($student->formation_id, 404, "Cet élève n'est associé à aucune filière.");

        $formation = Formation::findOrFail($student->formation_id);
        $skills = $formation->skills()->orderBy('order')->orderBy('name')->get();

        $latestByskill = $student->skillAssessments()
            ->with('teacher:id,first_name,last_name')
            ->latest('assessed_at')
            ->get()
            ->unique('skill_id')
            ->keyBy('skill_id');

        $rows = $skills->map(function ($skill) use ($latestByskill) {
            $assessment = $latestByskill->get($skill->id);

            return [
                'skill' => $skill->name,
                'level' => $assessment ? SkillAssessment::LEVELS[$assessment->level] : 'Non évalué',
                'date' => $assessment?->assessed_at?->format('d/m/Y') ?? '—',
                'teacher' => $assessment?->teacher ? "{$assessment->teacher->first_name} {$assessment->teacher->last_name}" : '—',
            ];
        });

        return $this->pdfResponse(
            'competences-'.$student->matricule.'.pdf',
            'Fiche de compétences',
            [
                ['key' => 'skill', 'label' => 'Compétence'],
                ['key' => 'level', 'label' => 'Niveau'],
                ['key' => 'date', 'label' => 'Dernière évaluation'],
                ['key' => 'teacher', 'label' => 'Évalué par'],
            ],
            $rows,
            "{$student->full_name} ({$student->matricule}) — {$formation->name}"
        );
    }
}
