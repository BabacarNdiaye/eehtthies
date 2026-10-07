<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Page « Diagnostic des photos » : réservée à la direction ; elle écrit une image de test et signale un dossier vide.
 */
class StorageDiagnosticTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Storage::fake('public');
    }

    private function as(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_only_the_direction_can_open_it(): void
    {
        $this->get(route('diagnostic.storage'))->assertRedirect(route('login'));
        $this->actingAs($this->as('caissier'))->get(route('diagnostic.storage'))->assertForbidden();
        $this->actingAs($this->as('direction'))->get(route('diagnostic.storage'))->assertOk()->assertSee('Diagnostic des photos');
    }

    public function test_it_writes_a_test_image_and_reports_the_state_of_the_photos(): void
    {
        $this->actingAs($this->as('direction'))->get(route('diagnostic.storage'))->assertOk()->assertSee('/storage/diagnostic/test.png', false);

        Storage::disk('public')->assertExists('diagnostic/test.png');
    }
}
