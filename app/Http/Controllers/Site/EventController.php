<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\EventItem;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/Events/Index', [
            'upcoming' => EventItem::where('is_published', true)->upcoming()->orderBy('start_at')->get(),
            'past' => EventItem::where('is_published', true)->where('start_at', '<', now())->orderByDesc('start_at')->take(9)->get(),
        ]);
    }
}
