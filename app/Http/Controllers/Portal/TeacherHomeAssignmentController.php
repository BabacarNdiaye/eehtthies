<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\HomeAssignment;
use App\Models\Teacher;
use App\Models\TimetableEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Travaux à faire à la maison : l'enseignant les donne aux classes et matières qu'il enseigne réellement. */
class TeacherHomeAssignmentController extends Controller
{
    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()->teacher;
        abort_unless($teacher, 404, "Aucun profil enseignant n'est associé à ce compte.");

        return $teacher;
    }

    private function pairs(Teacher $teacher)
    {
        return TimetableEntry::taughtBy($teacher)
            ->with('schoolClass:id,name', 'subject:id,name')
            ->get(['school_class_id', 'subject_id'])
            ->unique(fn ($e) => $e->school_class_id.'-'.$e->subject_id)
            ->values();
    }

    public function index(Request $request): Response
    {
        $teacher = $this->teacher($request);

        return Inertia::render('Portal/Teacher/Assignments', [
            'assignments' => HomeAssignment::where('teacher_id', $teacher->id)
                ->with('schoolClass:id,name', 'subject:id,name')
                ->orderByDesc('due_date')
                ->limit(100)
                ->get(),
            'pairs' => $this->pairs($teacher)->map(fn ($e) => [
                'school_class_id' => $e->school_class_id,
                'subject_id' => $e->subject_id,
                'class_name' => $e->schoolClass->name,
                'subject_name' => $e->subject->name,
            ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $teacher = $this->teacher($request);

        $data = $request->validate([
            'school_class_id' => ['required', 'integer'],
            'subject_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'instructions' => ['nullable', 'string', 'max:10000'],
            'due_date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $allowed = $this->pairs($teacher)->contains(
            fn ($e) => $e->school_class_id === (int) $data['school_class_id'] && $e->subject_id === (int) $data['subject_id']
        );
        abort_unless($allowed, 403, "Vous n'enseignez pas cette matière dans cette classe.");

        HomeAssignment::create([
            ...$data,
            'teacher_id' => $teacher->id,
            'given_on' => now()->toDateString(),
        ]);

        return back()->with('success', 'Travail à la maison enregistré. Les élèves de la classe le voient.');
    }

    public function destroy(Request $request, HomeAssignment $homeAssignment)
    {
        abort_unless($homeAssignment->teacher_id === $this->teacher($request)->id, 403);

        $homeAssignment->delete();

        return back()->with('success', 'Travail supprimé.');
    }
}
