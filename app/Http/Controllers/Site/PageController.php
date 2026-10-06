<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Faq;
use App\Models\Partner;
use App\Models\Teacher;
use App\Models\Testimonial;
use App\Support\Honeypot;
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
            // Visiteurs anonymes : seulement ce que la page affiche (jamais salaire, taux horaire, contacts, compte de versement).
            'teachers' => Teacher::where('status', 'actif')
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name', 'photo', 'specialty', 'experience_years', 'diplomas']),
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
        if (Honeypot::tripped($request)) {
            return back()->with('success', 'Votre message a bien été envoyé. Nous vous répondrons dans les plus brefs délais.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        ContactMessage::create($data);

        return back()->with('success', 'Votre message a bien été envoyé. Nous vous répondrons dans les plus brefs délais.');
    }
}
