<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use App\Models\NewsArticlePhoto;
use App\Support\ImageOptimizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class NewsArticlePhotoController extends Controller
{
    public function store(Request $request, NewsArticle $news)
    {
        $data = $request->validate([
            'photos' => ['required', 'array', 'min:1'],
            'photos.*' => ['image', 'max:5120'],
        ]);

        $order = (int) $news->photos()->max('order');

        foreach ($data['photos'] as $file) {
            $order++;
            $news->photos()->create([
                'path' => ImageOptimizer::store($file, 'news'),
                'order' => $order,
            ]);
        }

        return back()->with('success', 'Photo(s) ajoutée(s) avec succès.');
    }

    public function destroy(NewsArticle $news, NewsArticlePhoto $photo)
    {
        abort_unless($photo->news_article_id === $news->id, 404);

        Storage::disk('public')->delete($photo->path);
        $photo->delete();

        return back()->with('success', 'Photo supprimée.');
    }
}
