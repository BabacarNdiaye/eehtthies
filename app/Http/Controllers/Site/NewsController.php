<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use Inertia\Inertia;
use Inertia\Response;

class NewsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/News/Index', [
            'articles' => NewsArticle::published()->orderByDesc('published_at')->paginate(9),
        ]);
    }

    public function show(NewsArticle $article): Response
    {
        abort_unless($article->is_published, 404);

        return Inertia::render('Public/News/Show', [
            'article' => $article->load('author', 'photos'),
            'others' => NewsArticle::published()->where('id', '!=', $article->id)->take(3)->get(),
        ]);
    }
}
