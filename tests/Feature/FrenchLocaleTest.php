<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** Tout le site (messages d'erreur, dates, validation) est en français. */
class FrenchLocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_locale_is_french_whatever_the_env_says(): void
    {
        $this->assertSame('fr', app()->getLocale());
        $this->assertSame('septembre 2026', Carbon::parse('2026-09-01')->translatedFormat('F Y'));
    }

    public function test_validation_errors_use_french_field_names(): void
    {
        $this->postJson(route('login'), [])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Le champ adresse e-mail est obligatoire.');
    }

    public function test_json_errors_are_translated(): void
    {
        $this->getJson(route('connect.unread-count'))
            ->assertStatus(401)
            ->assertJsonPath('message', 'Vous devez être connecté(e).');

        $this->actingAs(User::factory()->create())
            ->getJson('/connect/api/calls/999999')
            ->assertStatus(404)
            ->assertJsonPath('message', 'Élément introuvable.');
    }
}
