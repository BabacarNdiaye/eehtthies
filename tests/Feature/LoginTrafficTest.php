<?php

namespace Tests\Feature;

use App\Models\LoginLog;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LoginTrafficTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test de non-régression pour un incident réel : cette table avait été créée par une migration déployée
     * dans le même lot que l'écouteur qui y écrit, et la connexion d'un vrai utilisateur a rencontré
     * exactement cette erreur de table manquante dans l'intervalle avant l'exécution de la migration.
     * L'écouteur ne doit plus jamais laisser cette erreur (ni aucun autre échec de journalisation du trafic)
     * bloquer une vraie connexion.
     */
    public function test_login_still_succeeds_even_if_the_login_logs_table_is_unavailable(): void
    {
        $user = User::factory()->create();
        Schema::drop('login_logs');

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_a_real_login_creates_a_login_log_row_and_updates_last_login_at(): void
    {
        $user = User::factory()->create();
        $this->assertNull($user->last_login_at);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));

        $this->assertDatabaseHas('login_logs', ['user_id' => $user->id]);
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_traffic_statistics_page_is_reachable_with_permission(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');

        LoginLog::create(['user_id' => $admin->id, 'ip_address' => '127.0.0.1']);

        $response = $this->actingAs($admin)->get(route('admin.statistics.traffic'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Statistics/Traffic')
            ->where('logins30d', 1)
        );
    }

    public function test_traffic_statistics_page_is_blocked_without_permission(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('caissier'); // no voir_statistiques

        $response = $this->actingAs($user)->get(route('admin.statistics.traffic'));

        $response->assertForbidden();
    }

    public function test_public_page_visit_is_recorded_with_location(): void
    {
        config(['services.geoip.url' => 'https://geo.test']);
        Http::fake(['geo.test/*' => Http::response([
            'success' => true, 'country_code' => 'SN', 'country' => 'Sénégal', 'region' => 'Dakar', 'city' => 'Dakar',
        ])]);

        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (X11; Linux) Firefox/130.0'])
            ->withServerVariables(['REMOTE_ADDR' => '41.82.10.20'])
            ->get('/formations')
            ->assertOk();

        $this->assertDatabaseHas('site_visits', [
            'ip_address' => '41.82.10.20', 'country' => 'Sénégal', 'region' => 'Dakar', 'path' => '/formations',
        ]);
    }

    public function test_bots_and_admin_pages_are_not_recorded_as_visits(): void
    {
        $this->withHeaders(['User-Agent' => 'Googlebot/2.1'])->get('/formations')->assertOk();
        $this->assertDatabaseCount('site_visits', 0);
    }
}
