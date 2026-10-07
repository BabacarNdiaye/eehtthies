<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LibraryResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class LibraryResourceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Library/Index', [
            'resources' => LibraryResource::with('uploadedBy:id,name')->latest()->get(),
            'uploadLimitMb' => \App\Support\UploadLimit::megabytes(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'type' => ['required', 'in:document,lien'],
            'file' => ['required_if:type,document', 'nullable', 'file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png', 'max:'.\App\Support\UploadLimit::kilobytes()],
            'thumbnail' => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
            'url' => ['required_if:type,lien', 'nullable', 'url', 'max:2048'],
        ], [
            'file.uploaded' => "Le fichier dépasse la taille que l'hébergement accepte (".\App\Support\UploadLimit::megabytes().' Mo maximum). Réduisez-le, ou demandez d\'augmenter « upload_max_filesize » et « post_max_size » dans PHP.',
            'file.max' => 'Le fichier est trop volumineux ('.\App\Support\UploadLimit::megabytes().' Mo maximum).',
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

    public function update(Request $request, LibraryResource $libraryResource)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $libraryResource->update($data);

        return back()->with('success', 'Ressource mise à jour.');
    }

    public function destroy(LibraryResource $libraryResource)
    {
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
