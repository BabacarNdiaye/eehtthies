<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\TemporaryPassword;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Plus de mot de passe commun : chaque accès créé par l'administration reçoit un mot de passe provisoire aléatoire à
 * changer à la première connexion, et l'ancien mot de passe commun (« eeht2026 ») est repéré puis refusé.
 */
class ForcePasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function user(string $role, string $password = 'Un-bon-mot-de-passe-42', bool $mustChange = false): User
    {
        $user = User::factory()->create(['password' => Hash::make($password)]);
        $user->forceFill(['must_change_password' => $mustChange])->save();
        $user->assignRole($role);

        return $user;
    }

    public function test_generated_passwords_are_random_readable_and_never_the_old_common_one(): void
    {
        $passwords = collect(range(1, 40))->map(fn () => TemporaryPassword::generate());

        $this->assertCount(40, $passwords->unique());
        $this->assertTrue($passwords->every(fn (string $password) => strlen($password) === 10 && ! str_contains($password, 'eeht')));
        $this->assertTrue($passwords->every(fn (string $password) => preg_match('/^[a-zA-Z2-9]+$/', $password) === 1));
    }

    public function test_a_flagged_account_is_sent_to_the_password_page_and_nowhere_else(): void
    {
        $admin = $this->user('direction', mustChange: true);

        $this->actingAs($admin)->get(route('admin.dashboard'))->assertRedirect(route('admin.password'));
        $this->actingAs($admin)->get(route('admin.password'))->assertOk();
    }

    public function test_each_role_is_sent_to_its_own_password_page(): void
    {
        foreach (['eleve' => ['student.dashboard', 'student.password'], 'enseignant' => ['teacher.dashboard', 'teacher.password'], 'parent' => ['parent.dashboard', 'parent.password']] as $role => [$page, $target]) {
            $user = $this->user($role, mustChange: true);

            $this->actingAs($user)->get(route($page))->assertRedirect(route($target));
        }
    }

    public function test_changing_the_password_lifts_the_obligation(): void
    {
        $admin = $this->user('direction', 'Ancien-mot-de-passe-1', mustChange: true);

        $this->actingAs($admin)->put(route('password.update'), [
            'current_password' => 'Ancien-mot-de-passe-1', 'password' => 'Nouveau-mot-de-passe-2026', 'password_confirmation' => 'Nouveau-mot-de-passe-2026',
        ])->assertSessionHasNoErrors();

        $this->assertFalse($admin->fresh()->must_change_password);
        $this->actingAs($admin->fresh())->get(route('admin.dashboard'))->assertOk();
    }

    public function test_the_old_common_password_cannot_be_chosen_again(): void
    {
        $admin = $this->user('direction', 'Ancien-mot-de-passe-1');

        $this->actingAs($admin)->put(route('password.update'), [
            'current_password' => 'Ancien-mot-de-passe-1', 'password' => TemporaryPassword::LEGACY, 'password_confirmation' => TemporaryPassword::LEGACY,
        ])->assertSessionHasErrors('password');
    }

    public function test_an_account_that_still_has_the_old_common_password_is_flagged_at_login(): void
    {
        $student = $this->user('eleve', TemporaryPassword::LEGACY);
        $this->assertFalse($student->fresh()->must_change_password);

        $this->post(route('login'), ['email' => $student->email, 'password' => TemporaryPassword::LEGACY])->assertRedirect();

        $this->assertTrue($student->fresh()->must_change_password);
    }
}
