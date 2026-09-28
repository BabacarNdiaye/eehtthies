<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'roles' => $user?->getRoleNames() ?? [],
                'permissions' => $user?->getAllPermissions()->pluck('name') ?? [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'siteSettings' => fn () => [
                'site_name' => \App\Models\Setting::get('site_name', 'EEHT de Thiès'),
                'site_short_name' => \App\Models\Setting::get('site_short_name', 'EEHT'),
                'site_tagline' => \App\Models\Setting::get('site_tagline'),
                'site_logo' => \App\Models\Setting::get('site_logo'),
                'site_email' => \App\Models\Setting::get('site_email'),
                'site_phone' => \App\Models\Setting::get('site_phone'),
                'site_address' => \App\Models\Setting::get('site_address'),
                'opening_hours' => \App\Models\Setting::get('opening_hours'),
                'facebook_url' => \App\Models\Setting::get('facebook_url'),
                'instagram_url' => \App\Models\Setting::get('instagram_url'),
                'whatsapp_url' => \App\Models\Setting::get('whatsapp_url'),
                'linkedin_url' => \App\Models\Setting::get('linkedin_url'),
                'youtube_url' => \App\Models\Setting::get('youtube_url'),
                'director_name' => \App\Models\Setting::get('director_name'),
                'director_role' => \App\Models\Setting::get('director_role'),
                'director_message' => \App\Models\Setting::get('director_message'),
                'director_photo' => \App\Models\Setting::get('director_photo'),
                'about_photo' => \App\Models\Setting::get('about_photo'),
            ],
            'vapidPublicKey' => config('webpush.vapid.public_key'),
        ];
    }
}
