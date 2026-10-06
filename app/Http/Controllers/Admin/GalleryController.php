<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gallery;
use App\Models\GalleryMedia;
use App\Support\ImageOptimizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class GalleryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Galleries/Index', [
            'galleries' => Gallery::withCount('media')->latest()->paginate(15),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Galleries/Form');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'is_published' => ['boolean'],
        ]);
        $data['slug'] = Str::slug($data['title']);

        Gallery::create($data);

        return redirect()->route('admin.galleries.index')->with('success', 'Album créé avec succès.');
    }

    public function edit(Gallery $gallery): Response
    {
        return Inertia::render('Admin/Galleries/Form', [
            'gallery' => $gallery->load('media'),
        ]);
    }

    public function update(Request $request, Gallery $gallery)
    {
        $gallery->update($request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'is_published' => ['boolean'],
        ]));

        return redirect()->route('admin.galleries.index')->with('success', 'Album mis à jour avec succès.');
    }

    public function destroy(Gallery $gallery)
    {
        $gallery->delete();

        return back()->with('success', 'Album supprimé.');
    }

    public function storeMedia(Request $request, Gallery $gallery)
    {
        $data = $request->validate([
            'files.*' => ['required', 'file', 'max:20480', 'mimes:jpg,jpeg,png,webp,mp4,mov'],
        ]);

        foreach ($data['files'] as $file) {
            $isVideo = in_array($file->getClientOriginalExtension(), ['mp4', 'mov']);
            $path = $isVideo
                ? $file->store('galleries/'.$gallery->id, 'public')
                : ImageOptimizer::store($file, 'galleries/'.$gallery->id, 1600);

            GalleryMedia::create([
                'gallery_id' => $gallery->id,
                'type' => $isVideo ? 'video' : 'image',
                'path' => $path,
            ]);
        }

        return back()->with('success', 'Médias ajoutés avec succès.');
    }

    public function destroyMedia(Gallery $gallery, GalleryMedia $media)
    {
        $media->delete();

        return back()->with('success', 'Média supprimé.');
    }
}
