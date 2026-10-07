<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Formation;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Announcements/Index', [
            'announcements' => Announcement::with('createdBy:id,name')->latest()->paginate(15),
            'formations' => Formation::orderBy('name')->get(['id', 'name']),
            'schoolClasses' => SchoolClass::orderBy('name')->get(['id', 'name']),
            'priorities' => Announcement::PRIORITIES,
            'audienceTypes' => Announcement::AUDIENCE_TYPES,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
            'priority' => ['required', Rule::in(array_keys(Announcement::PRIORITIES))],
            'audience_type' => ['required', Rule::in(array_keys(Announcement::AUDIENCE_TYPES))],
            'audience_id' => ['nullable', 'integer', 'required_if:audience_type,formation,classe'],
        ]);

        $announcement = Announcement::broadcast($data, $request->user()->id);

        return back()->with('success', "Annonce envoyée à {$announcement->recipients_count} destinataire(s).");
    }
}
