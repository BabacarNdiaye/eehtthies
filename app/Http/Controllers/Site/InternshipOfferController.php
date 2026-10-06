<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\InternshipOffer;
use Inertia\Inertia;
use Inertia\Response;

class InternshipOfferController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/Career/Internship/Index', [
            'offers' => InternshipOffer::published()
                ->with('partner:id,name,logo', 'formation:id,name')
                ->orderByDesc('created_at')
                ->get(),
        ]);
    }
}
