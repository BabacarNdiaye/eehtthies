<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/Settings/Edit', [
            'settings' => Setting::pluck('value', 'key'),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'site_name' => ['required', 'string', 'max:255'],
            'site_short_name' => ['required', 'string', 'max:100'],
            'site_tagline' => ['nullable', 'string', 'max:255'],
            'site_email' => ['nullable', 'email', 'max:255'],
            'site_phone' => ['nullable', 'string', 'max:50'],
            'site_address' => ['nullable', 'string', 'max:500'],
            'opening_hours' => ['nullable', 'string', 'max:500'],
            'site_ninea' => ['nullable', 'string', 'max:100'],
            'site_rccm' => ['nullable', 'string', 'max:100'],
            'facebook_url' => ['nullable', 'url', 'max:255'],
            'instagram_url' => ['nullable', 'url', 'max:255'],
            'whatsapp_url' => ['nullable', 'url', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'youtube_url' => ['nullable', 'url', 'max:255'],
            'google_analytics_id' => ['nullable', 'regex:/^G-[A-Za-z0-9]{4,20}$/'],
            'years_experience' => ['nullable', 'string', 'max:10'],
            'students_trained' => ['nullable', 'string', 'max:10'],
            'success_rate' => ['nullable', 'string', 'max:10'],
            'theme_neutral_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'theme_primary_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'theme_secondary_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'theme_accent_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'director_name' => ['nullable', 'string', 'max:255'],
            'director_role' => ['nullable', 'string', 'max:255'],
            'director_message' => ['nullable', 'string', 'max:3000'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'director_photo' => ['nullable', 'image', 'max:2048'],
            'about_photo' => ['nullable', 'image', 'max:4096'],
        ]);

        $logo = null;
        if ($request->hasFile('logo')) {
            $logo = $request->file('logo')->store('settings', 'public');
        }
        unset($data['logo']);

        $directorPhoto = null;
        if ($request->hasFile('director_photo')) {
            $directorPhoto = $request->file('director_photo')->store('settings', 'public');
        }
        unset($data['director_photo']);

        $aboutPhoto = null;
        if ($request->hasFile('about_photo')) {
            $aboutPhoto = $request->file('about_photo')->store('settings', 'public');
        }
        unset($data['about_photo']);

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        if ($logo) {
            Setting::set('site_logo', $logo);
        }

        if ($directorPhoto) {
            Setting::set('director_photo', $directorPhoto);
        }

        if ($aboutPhoto) {
            Setting::set('about_photo', $aboutPhoto);
        }

        return back()->with('success', 'Paramètres mis à jour avec succès.');
    }
}
