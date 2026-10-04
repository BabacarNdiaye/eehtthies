<?php

namespace Tests\Feature;

use App\Models\Teacher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * La page publique « Notre équipe pédagogique » est vue par n'importe quel visiteur : sa charge Inertia (lisible
 * dans le code source de la page) ne doit contenir que ce que la page affiche. Elle renvoyait auparavant la fiche
 * entière de chaque enseignant : salaire mensuel, taux horaire, téléphone, adresse personnelle et e-mails.
 */
class PublicTeachersPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_public_team_page_exposes_only_what_it_displays(): void
    {
        $this->withoutVite();

        Teacher::create([
            'matricule' => 'ENS-1', 'first_name' => 'Moussa', 'last_name' => 'Ba', 'status' => 'actif',
            'specialty' => 'Cuisine', 'experience_years' => 8, 'diplomas' => 'CAP Cuisine',
            'phone' => '771112233', 'email' => 'moussa@example.test', 'professional_email' => 'm.ba@eeht.test',
            'address' => 'Thiès, quartier Randoulène',
            'payment_type' => 'horaire', 'monthly_salary' => 350000, 'hourly_rate' => 4500,
        ]);

        $this->get(route('pages.teachers'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Page/Teachers')
            ->has('teachers', 1, fn (Assert $teacher) => $teacher
                ->where('first_name', 'Moussa')
                ->where('specialty', 'Cuisine')
                ->hasAll(['id', 'last_name', 'photo', 'experience_years', 'diplomas'])
                ->missingAll([
                    'monthly_salary', 'hourly_rate', 'payment_type', 'phone', 'email', 'professional_email',
                    'address', 'user_id', 'matricule',
                ])));
    }

    public function test_inactive_teachers_stay_out_of_the_public_page(): void
    {
        $this->withoutVite();

        Teacher::create(['matricule' => 'ENS-2', 'first_name' => 'Awa', 'last_name' => 'Fall', 'status' => 'inactif']);

        $this->get(route('pages.teachers'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/Page/Teachers')
            ->has('teachers', 0));
    }
}
