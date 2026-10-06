<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\JobOffer;
use Inertia\Inertia;
use Inertia\Response;

class JobOfferController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/Career/Job/Index', [
            'offers' => JobOffer::published()
                ->with('partner:id,name,logo')
                ->orderByDesc('created_at')
                ->get(),
        ]);
    }
}
