<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\LibraryResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/** The library is a single shared space: every teacher and student sees the same list. */
class TeacherLibraryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Portal/Teacher/Library', [
            'resources' => LibraryResource::with('uploadedBy:id,name')->latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'type' => ['required', 'in:document,lien'],
            'file' => ['required_if:type,document', 'nullable', 'file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png', 'max:10240'],
            'thumbnail' => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
            'url' => ['required_if:type,lien', 'nullable', 'url', 'max:2048'],
        ]);

        $filePath = null;
        $thumbnailPath = null;
        if ($data['type'] === 'document') {
            $filePath = $request->file('file')->store('library', 'public');
            if ($request->hasFile('thumbnail')) {
                $thumbnailPath = $request->file('thumbnail')->store('library/thumbnails', 'public');
            }
        }

        LibraryResource::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'],
            'file_path' => $filePath,
            'thumbnail_path' => $thumbnailPath,
            'url' => $data['type'] === 'lien' ? $data['url'] : null,
            'uploaded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Ressource ajoutée.');
    }

    /** Teachers may only remove resources they uploaded themselves — admins moderate the rest. */
    public function destroy(Request $request, LibraryResource $libraryResource)
    {
        abort_unless($libraryResource->uploaded_by === $request->user()->id, 403);

        if ($libraryResource->file_path) {
            Storage::disk('public')->delete($libraryResource->file_path);
        }
        if ($libraryResource->thumbnail_path) {
            Storage::disk('public')->delete($libraryResource->thumbnail_path);
        }

        $libraryResource->delete();

        return back()->with('success', 'Ressource supprimée.');
    }
}
