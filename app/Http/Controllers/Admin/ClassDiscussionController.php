<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassMessage;
use App\Models\SchoolClass;
use Inertia\Inertia;
use Inertia\Response;

class ClassDiscussionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/ClassDiscussions/Index', [
            'schoolClasses' => SchoolClass::withCount('classMessages')
                ->with('formation:id,name')
                ->orderByDesc('id')
                ->get(['id', 'name', 'formation_id']),
        ]);
    }

    public function show(SchoolClass $schoolClass): Response
    {
        return Inertia::render('Admin/ClassDiscussions/Show', [
            'schoolClass' => $schoolClass->only('id', 'name'),
            'messages' => ClassMessage::where('school_class_id', $schoolClass->id)
                ->with('user:id,name')
                ->orderBy('created_at')
                ->get(),
        ]);
    }

    public function destroy(ClassMessage $classMessage)
    {
        $classMessage->delete();

        return back()->with('success', 'Message supprimé.');
    }
}
