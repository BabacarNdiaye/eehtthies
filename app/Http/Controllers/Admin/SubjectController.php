<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Subject;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubjectController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Subjects/Index', [
            'subjects' => Subject::with('formation:id,name')->latest()->get(),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'formation_id' => ['nullable', 'exists:formations,id'],
            'coefficient' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function store(Request $request)
    {
        Subject::create($request->validate($this->rules()));

        return back()->with('success', 'Matière créée avec succès.');
    }

    public function update(Request $request, Subject $subject)
    {
        $subject->update($request->validate($this->rules()));

        return back()->with('success', 'Matière mise à jour avec succès.');
    }

    public function destroy(Subject $subject)
    {
        $subject->delete();

        return back()->with('success', 'Matière supprimée.');
    }
}
