<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Formation;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $announcement = Announcement::create([...$data, 'created_by' => $request->user()->id]);

        $recipientIds = $announcement->recipientUserIds();

        // Remise en base en une fois ; les notifications push partent en différé
        // via app:push-pending-messages (pushed_at null) pour ne pas bloquer la
        // requête sur des centaines d'appels HTTP.
        $now = now();
        $recipientIds->chunk(500)->each(fn ($chunk) => DB::table('announcement_user')->insertOrIgnore(
            $chunk->map(fn (int $userId) => [
                'announcement_id' => $announcement->id,
                'user_id' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ])->values()->all()
        ));

        $announcement->update(['recipients_count' => $recipientIds->count()]);

        return back()->with('success', "Annonce envoyée à {$recipientIds->count()} destinataire(s).");
    }
}
