<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Permet à un enseignant d'évaluer les élèves de ses propres classes sur les compétences de la formation de cette classe. */
class TeacherSkillController extends Controller
{
    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()->teacher;
        abort_unless($teacher, 404, "Aucun profil enseignant n'est associé à ce compte.");

        return $teacher;
    }

    private function classIds(Teacher $teacher): array
    {
        return TimetableEntry::where('teacher_id', $teacher->id)->distinct()->pluck('school_class_id')->all();
    }

    public function index(Request $request): Response
    {
        $teacher = $this->teacher($request);
        $classIds = $this->classIds($teacher);

        $classes = SchoolClass::whereIn('id', $classIds)->orderBy('name')->get(['id', 'name', 'formation_id']);

        $schoolClassId = $request->integer('school_class_id') ?: ($classes->first()->id ?? null);
        abort_unless(! $schoolClassId || in_array($schoolClassId, $classIds, true), 403);

        $students = collect();
        $skills = collect();
        $levels = collect();

        if ($schoolClassId) {
            $class = $classes->firstWhere('id', $schoolClassId);
            $students = Student::where('school_class_id', $schoolClassId)
                ->where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'matricule', 'first_name', 'last_name']);

            $skills = Skill::where('formation_id', $class->formation_id)->orderBy('order')->orderBy('name')->get();

            $levels = SkillAssessment::whereIn('student_id', $students->pluck('id'))
                ->whereIn('skill_id', $skills->pluck('id'))
                ->orderByDesc('assessed_at')
                ->get()
                ->unique(fn ($a) => $a->student_id.'-'.$a->skill_id)
                ->groupBy('student_id')
                ->map(fn ($group) => $group->keyBy('skill_id'));
        }

        return Inertia::render('Portal/Teacher/Skills', [
            'classes' => $classes,
            'students' => $students,
            'skills' => $skills,
            'levels' => $levels,
            'selectedClassId' => $schoolClassId,
            'levelLabels' => SkillAssessment::LEVELS,
        ]);
    }

    public function store(Request $request)
    {
        $teacher = $this->teacher($request);
        $classIds = $this->classIds($teacher);

        $data = $request->validate([
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'student_id' => ['required', 'exists:students,id'],
            'skill_id' => ['required', 'exists:skills,id'],
            'level' => ['required', 'integer', 'min:1', 'max:4'],
        ]);

        abort_unless(in_array((int) $data['school_class_id'], $classIds, true), 403, "Vous n'enseignez pas dans cette classe.");

        $student = Student::where('id', $data['student_id'])->where('school_class_id', $data['school_class_id'])->firstOrFail();
        $skill = Skill::where('id', $data['skill_id'])->where('formation_id', $student->formation_id)->firstOrFail();

        SkillAssessment::create([
            'student_id' => $student->id,
            'skill_id' => $skill->id,
            'teacher_id' => $teacher->id,
            'level' => $data['level'],
            'assessed_at' => now()->toDateString(),
        ]);

        return back()->with('success', 'Évaluation enregistrée.');
    }
}
