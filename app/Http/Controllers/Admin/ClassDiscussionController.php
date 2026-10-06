<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ConversationMessage;
use App\Models\SchoolClass;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Modération des groupes de classe d'EEHT Connect.
 */
class ClassDiscussionController extends Controller
{
    public function index(): Response
    {
        $schoolClasses = SchoolClass::with(['formation:id,name', 'conversation' => fn ($q) => $q->withCount('messages')])
            ->orderByDesc('id')
            ->get(['id', 'name', 'formation_id'])
            ->map(fn (SchoolClass $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'formation' => $c->formation?->only('id', 'name'),
                'messages_count' => $c->conversation?->messages_count ?? 0,
            ]);

        return Inertia::render('Admin/ClassDiscussions/Index', ['schoolClasses' => $schoolClasses]);
    }

    public function show(SchoolClass $schoolClass): Response
    {
        return Inertia::render('Admin/ClassDiscussions/Show', [
            'schoolClass' => $schoolClass->only('id', 'name'),
            'messages' => $schoolClass->conversation
                ? $schoolClass->conversation->messages()->with('user:id,name')->orderBy('id')->get()
                : [],
        ]);
    }

    public function destroy(ConversationMessage $classMessage)
    {
        abort_unless($classMessage->conversation?->school_class_id, 404);

        $classMessage->delete();

        return back()->with('success', 'Message supprimé.');
    }
}
