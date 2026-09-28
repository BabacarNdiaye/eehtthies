<?php

namespace Tests\Feature;

use App\Models\LoginLog;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LoginTrafficTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Regression test for a real incident: this table was created by a
     * migration deployed in the same batch as the listener that writes to
     * it, and a real user's login hit this exact table-missing error in the
     * gap before the migration ran. The listener must never let that (or
     * any other traffic-logging failure) block a real login again.
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
}
