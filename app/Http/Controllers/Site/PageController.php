<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Models\Partner;
use App\Models\Teacher;
use App\Models\Testimonial;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    public function about(): Response
    {
        return Inertia::render('Public/Page/About');
    }

    public function teachers(): Response
    {
        return Inertia::render('Public/Page/Teachers', [
            'teachers' => Teacher::where('status', 'actif')->orderBy('last_name')->get(),
        ]);
    }

    public function partners(): Response
    {
        return Inertia::render('Public/Page/Partners', [
            'partners' => Partner::where('is_published', true)->get(),
        ]);
    }

    public function testimonials(): Response
    {
        return Inertia::render('Public/Page/Testimonials', [
            'testimonials' => Testimonial::where('is_published', true)->latest()->get(),
        ]);
    }

    public function faq(): Response
    {
        return Inertia::render('Public/Page/Faq', [
            'faqs' => Faq::where('is_published', true)->orderBy('order')->get()->groupBy('category'),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('Public/Page/Contact');
    }

    public function legalNotice(): Response
    {
        return Inertia::render('Public/Page/LegalNotice');
    }

    public function privacyPolicy(): Response
    {
        return Inertia::render('Public/Page/PrivacyPolicy');
    }

    public function storeContact(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        \App\Models\ContactMessage::create($data);

        return back()->with('success', 'Votre message a bien été envoyé. Nous vous répondrons dans les plus brefs délais.');
    }
}
