<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Gallery;
use App\Models\GalleryMedia;
use App\Models\NewsArticle;
use App\Models\Partner;
use App\Models\Setting;
use App\Models\Slider;
use App\Models\Testimonial;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        $partners = Partner::where('is_published', true)->get();

        return Inertia::render('Public/Home', [
            'sliders' => Slider::where('is_active', true)->orderBy('order')->get(),
            'formations' => Formation::where('is_active', true)->orderBy('order')->take(6)->get(),
            'news' => NewsArticle::published()->orderByDesc('published_at')->take(3)->get(),
            'testimonials' => Testimonial::where('is_published', true)->latest()->take(4)->get(),
            'partners' => $partners,
            'galleryPreview' => GalleryMedia::whereIn(
                'gallery_id',
                Gallery::where('is_published', true)->pluck('id')
            )->where('type', 'image')->latest()->take(8)->get(),
            'stats' => [
                'years_experience' => Setting::get('years_experience', '15'),
                'students_trained' => Setting::get('students_trained', '2000'),
                'success_rate' => Setting::get('success_rate', '90'),
                // Non modifiable par l'administration — toujours le nombre réel de partenaires publiés, pour
                // que cela ne puisse plus jamais diverger des partenaires réellement affichés sur la page
                // Partenaires.
                'partners_count' => (string) $partners->count(),
            ],
        ]);
    }
}
