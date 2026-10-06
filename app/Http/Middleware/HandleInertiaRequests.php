<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * Le gabarit racine chargé lors de la première visite d'une page.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Détermine la version courante des ressources.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Définit les props partagées par défaut.
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
                'site_name' => Setting::get('site_name', 'EEHT de Thiès'),
                'site_short_name' => Setting::get('site_short_name', 'EEHT'),
                'site_tagline' => Setting::get('site_tagline'),
                'site_logo' => Setting::get('site_logo'),
                'site_email' => Setting::get('site_email'),
                'site_phone' => Setting::get('site_phone'),
                'site_address' => Setting::get('site_address'),
                'opening_hours' => Setting::get('opening_hours'),
                'facebook_url' => Setting::get('facebook_url'),
                'instagram_url' => Setting::get('instagram_url'),
                'whatsapp_url' => Setting::get('whatsapp_url'),
                'linkedin_url' => Setting::get('linkedin_url'),
                'youtube_url' => Setting::get('youtube_url'),
                'director_name' => Setting::get('director_name'),
                'director_role' => Setting::get('director_role'),
                'director_message' => Setting::get('director_message'),
                'director_photo' => Setting::get('director_photo'),
                'about_photo' => Setting::get('about_photo'),
            ],
            'vapidPublicKey' => config('webpush.vapid.public_key'),
            'portalProfile' => fn () => $this->portalProfile($user),
        ];
    }

    /**
     * Profil affiché dans la feuille Menu et l'en-tête des espaces élève, enseignant et parent. Réservé à ces
     * rôles : les pages d'administration n'ont rien de plus à interroger.
     *
     * @return array{kind: string, name: string, subtitle: ?string, photo: ?string, matricule: ?string}|null
     */
    private function portalProfile(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $roles = $user->getRoleNames();
        $avatar = $user->avatar ? '/storage/'.$user->avatar : null;

        if ($roles->contains('eleve') && $student = $user->student) {
            $student->loadMissing('formation:id,name', 'schoolClass:id,name');

            return [
                'kind' => 'student',
                'name' => $student->full_name,
                'subtitle' => collect([$student->formation?->name, $student->schoolClass?->name])->filter()->implode(' — ') ?: null,
                'photo' => $student->photo ? '/storage/'.$student->photo : $avatar,
                'matricule' => $student->matricule,
            ];
        }

        if ($roles->contains('enseignant') && $teacher = $user->teacher) {
            return [
                'kind' => 'teacher',
                'name' => $teacher->full_name,
                'subtitle' => $teacher->specialty ?: 'Enseignant',
                'photo' => $teacher->photo ? '/storage/'.$teacher->photo : $avatar,
                'matricule' => $teacher->matricule,
            ];
        }

        if ($roles->contains('parent')) {
            $children = $user->childStudents()->count();

            return [
                'kind' => 'parent',
                'name' => $user->name,
                'subtitle' => $children.' '.($children > 1 ? 'enfants' : 'enfant'),
                'photo' => $avatar,
                'matricule' => null,
            ];
        }

        return null;
    }
}
