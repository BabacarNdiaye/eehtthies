<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use Inertia\Inertia;
use Inertia\Response;

class FormationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/Formation/Index', [
            'formations' => Formation::where('is_active', true)->orderBy('order')->get(),
        ]);
    }

    public function show(Formation $formation): Response
    {
        abort_unless($formation->is_active, 404);

        return Inertia::render('Public/Formation/Show', [
            'formation' => $formation->load('subjects', 'testimonials'),
            'others' => Formation::where('is_active', true)->where('id', '!=', $formation->id)->take(3)->get(),
        ]);
    }
}
