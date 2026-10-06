<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Exceptions\RegisterErrorViewPaths;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

/**
 * Pages d'erreur. Un rôle limité qui ouvre une rubrique interdite (lien enregistré, ancien favori) ne doit pas tomber
 * sur une page anglaise sans issue : le message est en français et un lien ramène à son espace. Le gabarit est celui de
 * resources/views/errors/minimal.blade.php, qui remplace celui du framework.
 */
class ErrorPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_forbidden_admin_page_explains_itself_in_french_and_offers_a_way_back(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $cashier = User::factory()->create();
        $cashier->assignRole('caissier');

        // Le caissier n'a pas la permission voir_eleves.
        $response = $this->actingAs($cashier)->get(route('admin.students.index'));

        $response->assertForbidden()
            ->assertSee('Accès interdit')
            ->assertSee('Votre rôle ne vous donne pas accès à cette page.')
            ->assertDontSee('User does not have')
            ->assertSee(route('dashboard'), false)
            ->assertSee('lang="fr"', false);
    }

    public function test_an_unknown_address_gets_a_french_page_with_a_link_home_and_to_sign_in(): void
    {
        $this->get('/cette-page-n-existe-pas')
            ->assertNotFound()
            ->assertSee('Page introuvable')
            ->assertSee("L'adresse est peut-être erronée")
            ->assertSee(route('home'), false)
            ->assertSee(route('login'), false);
    }

    public function test_every_status_the_framework_renders_uses_the_same_french_layout(): void
    {
        // Le gestionnaire d'exceptions déclare l'espace de noms « errors » au premier rendu d'erreur ; ici on le fait à la main.
        (new RegisterErrorViewPaths)();

        foreach ([401, 403, 404, 419, 429, 500, 503] as $status) {
            $html = view("errors::{$status}", ['exception' => new HttpException($status)])->render();

            $this->assertStringContainsString('lang="fr"', $html, "La page {$status} n'utilise pas le gabarit français.");
            $this->assertStringContainsString("Erreur {$status}", $html);
            $this->assertStringContainsString('target="_top"', $html, "La page {$status} n'a pas de lien de sortie.");
        }
    }
}
