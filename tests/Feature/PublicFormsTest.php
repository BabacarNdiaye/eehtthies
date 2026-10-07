<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Formulaire de contact du site public : il enregistre le message, et son piège anti-robots (champ caché « website_url »)
 * ignore en silence tout envoi où ce champ est rempli, avec la même réponse qu'un envoi réussi.
 */
class PublicFormsTest extends TestCase
{
    use RefreshDatabase;

    private function message(array $extra = []): array
    {
        return $extra + ['name' => 'Awa Diop', 'email' => 'awa@example.com', 'subject' => 'Inscription', 'message' => 'Bonjour, je souhaite des informations.'];
    }

    public function test_a_visitor_message_is_saved(): void
    {
        $this->post(route('pages.contact.store'), $this->message())->assertSessionHas('success');

        $this->assertSame(1, ContactMessage::count());
    }

    public function test_a_robot_that_fills_the_hidden_field_is_ignored_without_any_hint(): void
    {
        $this->post(route('pages.contact.store'), $this->message(['website_url' => 'http://spam.example']))->assertSessionHas('success');

        $this->assertSame(0, ContactMessage::count());
    }
}
