<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PayoutAccount;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsPayroll;
use Tests\TestCase;

/**
 * Le mode et le numéro de compte de versement (Wave, IBAN…) sont les données les plus sensibles de la paie : visibles
 * et modifiables avec les seules permissions des salaires, jamais dans le journal d'activité, masqués sur les bulletins.
 */
class PayoutPrivacyTest extends TestCase
{
    use BuildsPayroll;
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->withoutDefer();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-31 18:00:00'));
        $this->admin = User::where('email', 'admin@eeht-thies.sn')->first();
    }

    private function everythingLogged(): string
    {
        return Activity::all()
            ->map(fn (Activity $entry) => json_encode([$entry->description, $entry->properties, $entry->attribute_changes], JSON_UNESCAPED_UNICODE))
            ->implode(' ');
    }

    public function test_the_payout_account_never_reaches_the_activity_log(): void
    {
        $this->actingAs($this->admin);
        $user = $this->payrollStaff('Awa Sow', 250000);
        $teacher = $this->payrollTeacher('Fatou');

        $user->update(['payout_channel' => 'wave', 'payout_account' => 'SECRET-USER-9988']);
        $teacher->update(['payout_channel' => 'virement', 'payout_account' => 'SECRET-TEACHER-7766']);
        $teacher->update(['monthly_salary' => 310000]);

        $logged = $this->everythingLogged();
        $this->assertStringNotContainsString('SECRET-USER-9988', $logged);
        $this->assertStringNotContainsString('SECRET-TEACHER-7766', $logged);
        $this->assertStringContainsString('310000', $logged, 'le journal reste utile pour le reste');
    }

    public function test_a_payroll_cycle_never_logs_the_payout_account(): void
    {
        $this->payrollStaff('Awa Sow', 250000, 'comptable', ['payout_channel' => 'wave', 'payout_account' => 'SECRET-CYCLE-5544']);
        $run = $this->prepareRun($this->admin);
        $this->post(route('admin.payroll.validate', $run));
        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement'])->assertSessionHas('success');
        $this->get(route('admin.payroll.payout.csv', $run));

        $this->assertStringNotContainsString('SECRET-CYCLE-5544', $this->everythingLogged());
    }

    public function test_the_edit_forms_show_the_payout_details_only_with_the_salary_permission(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['payout_channel' => 'wave', 'payout_account' => '77 123 45 67']);
        $teacher = $this->payrollTeacher('Fatou', 'fixe', 300000, null, ['payout_channel' => 'virement', 'payout_account' => 'SN08 0152 1234']);
        $hr = $this->payrollActor('voir_utilisateurs', 'modifier_utilisateurs', 'voir_enseignants', 'modifier_enseignants');

        $this->actingAs($hr)->get(route('admin.users.edit', $staff))->assertInertia(fn (Assert $page) => $page
            ->missing('payout')
            ->where('editUser', fn ($user) => ! isset($user['payout_account']) && ! isset($user['payout_channel'])));
        $this->get(route('admin.teachers.edit', $teacher))->assertInertia(fn (Assert $page) => $page
            ->missing('payout')
            ->where('teacher', fn ($row) => ! isset($row['payout_account']) && ! isset($row['payout_channel'])));

        $this->actingAs($this->admin)->get(route('admin.users.edit', $staff))->assertInertia(fn (Assert $page) => $page
            ->where('payout.channel', 'wave')
            ->where('payout.account', '77 123 45 67'));
        $this->get(route('admin.teachers.edit', $teacher))->assertInertia(fn (Assert $page) => $page
            ->where('payout.channel', 'virement')
            ->where('payout.account', 'SN08 0152 1234'));
    }

    public function test_the_payout_details_are_ignored_without_the_permission_to_edit_salaries(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['payout_channel' => 'wave', 'payout_account' => '77 123 45 67']);
        $teacher = $this->payrollTeacher('Fatou', 'fixe', 300000, null, ['payout_channel' => 'virement', 'payout_account' => 'SN08 0152 1234']);
        $hr = $this->payrollActor('voir_utilisateurs', 'modifier_utilisateurs', 'voir_enseignants', 'modifier_enseignants');

        $this->actingAs($hr)->put(route('admin.users.update', $staff), [
            'name' => 'Awa Sow', 'email' => $staff->email, 'roles' => ['comptable'], 'payout_channel' => 'orange_money', 'payout_account' => 'PIRATE-1',
        ])->assertSessionHasNoErrors();
        $this->put(route('admin.teachers.update', $teacher), [
            'matricule' => $teacher->matricule, 'first_name' => 'Fatou', 'last_name' => 'Ba', 'status' => 'actif', 'payment_type' => 'fixe',
            'monthly_salary' => 300000, 'payout_channel' => 'especes', 'payout_account' => 'PIRATE-2',
        ])->assertSessionHasNoErrors();

        $this->assertSame('77 123 45 67', $staff->fresh()->payout_account);
        $this->assertSame('wave', $staff->fresh()->payout_channel);
        $this->assertSame('SN08 0152 1234', $teacher->fresh()->payout_account);
        $this->assertSame('virement', $teacher->fresh()->payout_channel);
    }

    public function test_with_the_permission_the_payout_details_are_saved_and_validated(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $base = ['name' => 'Awa Sow', 'email' => $staff->email, 'roles' => ['comptable']];

        $this->actingAs($this->admin)->put(route('admin.users.update', $staff), $base + ['payout_channel' => 'bitcoin'])
            ->assertSessionHasErrors('payout_channel');

        $this->put(route('admin.users.update', $staff), $base + ['payout_channel' => 'orange_money', 'payout_account' => '77 555 66 77'])
            ->assertSessionHasNoErrors();

        $this->assertSame('orange_money', $staff->fresh()->payout_channel);
        $this->assertSame('77 555 66 77', $staff->fresh()->payout_account);
    }

    public function test_a_teacher_payout_details_are_saved_and_validated_with_the_permission(): void
    {
        $teacher = $this->payrollTeacher('Fatou', 'fixe', 300000);
        $base = [
            'matricule' => $teacher->matricule, 'first_name' => 'Fatou', 'last_name' => 'Ba', 'status' => 'actif', 'payment_type' => 'fixe', 'monthly_salary' => 300000,
        ];

        $this->actingAs($this->admin)->put(route('admin.teachers.update', $teacher), $base + ['payout_channel' => 'bitcoin'])
            ->assertSessionHasErrors('payout_channel');
        // Le canal « carte bancaire » existe au guichet mais ne sert pas à verser un salaire.
        $this->put(route('admin.teachers.update', $teacher), $base + ['payout_channel' => 'carte'])->assertSessionHasErrors('payout_channel');

        $this->put(route('admin.teachers.update', $teacher), $base + ['payout_channel' => 'wave', 'payout_account' => '77 321 65 40'])
            ->assertSessionHasNoErrors();

        $this->assertSame('wave', $teacher->fresh()->payout_channel);
        $this->assertSame('77 321 65 40', $teacher->fresh()->payout_account);
    }

    public function test_the_account_is_masked_to_its_last_four_characters(): void
    {
        $this->assertSame('•••• 4567', PayoutAccount::mask('77 123 45 67'));
        $this->assertSame('•••• 1234', PayoutAccount::mask('SN08 SN01 0152 0000 1234'));
        $this->assertSame('••••', PayoutAccount::mask('1234'));
        $this->assertSame('••••', PayoutAccount::mask('12'));
        $this->assertNull(PayoutAccount::mask(null));
        $this->assertNull(PayoutAccount::mask('   '));
    }
}
