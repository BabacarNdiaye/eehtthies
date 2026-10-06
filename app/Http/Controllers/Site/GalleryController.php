<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Gallery;
use Inertia\Inertia;
use Inertia\Response;

class GalleryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/Gallery/Index', [
            'galleries' => Gallery::where('is_published', true)->with('media')->latest()->get(),
        ]);
    }
}
