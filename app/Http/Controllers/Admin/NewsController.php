<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use App\Support\ImageOptimizer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class NewsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/News/Index', [
            'articles' => NewsArticle::latest()->paginate(15),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/News/Form');
    }

    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['required', 'string'],
            'category' => ['nullable', 'string', 'max:100'],
            'source' => ['required', 'in:manuel,facebook'],
            'facebook_post_url' => ['nullable', 'url', 'max:500'],
            'is_published' => ['boolean'],
            'is_featured' => ['boolean'],
            'published_at' => ['nullable', 'date'],
            'image' => ['nullable', 'image', 'max:5120'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $data['slug'] = Str::slug($data['title']).'-'.Str::random(5);
        $data['author_id'] = $request->user()->id;

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'news');
        }

        NewsArticle::create($data);

        return redirect()->route('admin.news.index')->with('success', 'Article créé avec succès.');
    }

    public function edit(NewsArticle $news): Response
    {
        return Inertia::render('Admin/News/Form', ['article' => $news->load('photos')]);
    }

    public function update(Request $request, NewsArticle $news)
    {
        $data = $request->validate($this->rules());

        if ($request->hasFile('image')) {
            $data['image'] = ImageOptimizer::store($request->file('image'), 'news');
        } else {
            unset($data['image']);
        }

        $news->update($data);

        return redirect()->route('admin.news.index')->with('success', 'Article mis à jour avec succès.');
    }

    public function destroy(NewsArticle $news)
    {
        $news->delete();

        return back()->with('success', 'Article supprimé.');
    }
}
