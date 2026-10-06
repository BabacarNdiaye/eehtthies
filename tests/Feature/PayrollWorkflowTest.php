<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Expense;
use App\Models\JournalEntry;
use App\Models\PayrollLine;
use App\Models\PayrollRun;
use App\Models\SalaryPayment;
use App\Models\TeacherSalaryPayment;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsPayroll;
use Tests\TestCase;

/**
 * Le cycle de paie : on prépare, on vérifie (heures, primes, retenues), on valide, puis on enregistre les versements.
 * Rien n'est payé avant la validation ; un paiement est une dépense et une écriture comptable, jamais fait deux fois ;
 * annuler un paiement dans le registre remet la ligne « à payer ».
 */
class PayrollWorkflowTest extends TestCase
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

    private function validated(PayrollRun $run): PayrollRun
    {
        $this->actingAs($this->admin)->post(route('admin.payroll.validate', $run))->assertSessionHas('success');

        return $run->fresh();
    }

    private function payLine(PayrollRun $run, PayrollLine $line, array $overrides = [])
    {
        return $this->actingAs($this->admin)->post(
            route('admin.payroll.lines.pay', [$run, $line]),
            $overrides + ['paid_at' => '2026-10-31', 'channel' => 'virement'],
        );
    }

    // ───────────── Vérifier : heures, primes et retenues ─────────────

    public function test_a_draft_line_can_be_adjusted_and_its_net_is_recomputed(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);
        $line = $this->lineFor($run, $staff);

        $this->put(route('admin.payroll.lines.update', [$run, $line]), [
            'adjustments' => [
                ['type' => 'prime', 'label' => 'Prime de rendement', 'amount' => 20000],
                ['type' => 'retenue', 'label' => 'Avance sur salaire', 'amount' => 5000],
            ],
            'payout_channel' => 'orange_money',
            'payout_account' => '77 000 11 22',
            'notes' => 'Vérifié avec la direction',
        ])->assertSessionHasNoErrors()->assertSessionHas('success');

        $line->refresh();
        $this->assertEquals(250000, $line->base_amount);
        $this->assertEquals(265000, $line->net_amount);
        $this->assertSame('retenue', $line->adjustments[1]['type']);
        $this->assertSame('Avance sur salaire', $line->adjustments[1]['label']);
        $this->assertSame('orange_money', $line->payout_channel);
        $this->assertSame('77 000 11 22', $line->payout_account);
        $this->assertSame('Vérifié avec la direction', $line->notes);
    }

    public function test_the_hours_of_an_hourly_teacher_can_be_corrected_by_hand(): void
    {
        $teacher = $this->payrollTeacher('Moussa', 'horaire', null, 5000);
        $this->payrollSession($teacher, '2026-10-05', ['08:00', '10:00']);
        $run = $this->prepareRun($this->admin);
        $line = $this->lineFor($run, $teacher);

        $this->actingAs($this->admin)->put(route('admin.payroll.lines.update', [$run, $line]), [
            'hours' => 6.5,
            'adjustments' => [['type' => 'prime', 'label' => 'Surveillance', 'amount' => 3000]],
        ])->assertSessionHasNoErrors();

        $line->refresh();
        $this->assertEquals(6.5, $line->hours);
        $this->assertEquals(32500, $line->base_amount);
        $this->assertEquals(35500, $line->net_amount);
    }

    public function test_hours_cannot_be_set_on_a_fixed_salary_line(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);
        $line = $this->lineFor($run, $staff);

        $this->put(route('admin.payroll.lines.update', [$run, $line]), ['hours' => 12, 'adjustments' => []])->assertSessionHasErrors('hours');

        $this->assertNull($line->fresh()->hours);
    }

    public function test_adjustments_are_validated_and_the_net_can_never_be_negative(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);
        $line = $this->lineFor($run, $staff);
        $url = route('admin.payroll.lines.update', [$run, $line]);

        $this->actingAs($this->admin)->put($url, ['adjustments' => [['type' => 'prime', 'label' => 'Prime', 'amount' => 0]]])
            ->assertSessionHasErrors('adjustments.0.amount');
        $this->put($url, ['adjustments' => [['type' => 'cadeau', 'label' => 'Prime', 'amount' => 1000]]])
            ->assertSessionHasErrors('adjustments.0.type');
        $this->put($url, ['adjustments' => [['type' => 'prime', 'label' => '', 'amount' => 1000]]])
            ->assertSessionHasErrors('adjustments.0.label');
        $this->put($url, ['adjustments' => [['type' => 'retenue', 'label' => 'Trop élevée', 'amount' => 250001]]])
            ->assertSessionHasErrors('adjustments');

        $this->assertEquals(250000, $line->fresh()->net_amount);
        $this->assertSame([], $line->fresh()->adjustments ?? []);
    }

    public function test_the_payout_channel_must_be_a_known_one(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);
        $line = $this->lineFor($run, $staff);

        $this->put(route('admin.payroll.lines.update', [$run, $line]), ['adjustments' => [], 'payout_channel' => 'bitcoin'])
            ->assertSessionHasErrors('payout_channel');
    }

    // ───────────── Valider ─────────────

    public function test_only_someone_with_the_validation_permission_can_validate(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);
        $preparer = $this->payrollActor('voir_salaires', 'ajouter_salaires', 'modifier_salaires');

        $this->actingAs($preparer)->post(route('admin.payroll.validate', $run))->assertForbidden();
        $this->assertSame('brouillon', $run->fresh()->status);

        $this->actingAs($this->admin)->post(route('admin.payroll.validate', $run))->assertSessionHas('success');

        $run->refresh();
        $this->assertSame('validee', $run->status);
        $this->assertSame($this->admin->id, $run->validated_by);
        $this->assertNotNull($run->validated_at);
    }

    public function test_a_run_without_any_line_cannot_be_validated(): void
    {
        $run = $this->prepareRun($this->admin);

        $this->actingAs($this->admin)->post(route('admin.payroll.validate', $run))->assertSessionHas('error');

        $this->assertSame('brouillon', $run->fresh()->status);
    }

    public function test_a_validated_run_is_locked(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));
        $line = $this->lineFor($run, $staff);

        $this->put(route('admin.payroll.lines.update', [$run, $line]), [
            'adjustments' => [['type' => 'prime', 'label' => 'Prime tardive', 'amount' => 1000]],
        ])->assertSessionHas('error');

        $this->assertEquals(250000, $line->fresh()->net_amount);
    }

    public function test_a_validated_run_can_be_reopened_until_a_line_is_paid(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $second = $this->payrollStaff('Ndeye Fall', 200000);
        $run = $this->validated($this->prepareRun($this->admin));

        $this->post(route('admin.payroll.reopen', $run))->assertSessionHas('success');
        $this->assertSame('brouillon', $run->fresh()->status);
        $this->assertNull($run->fresh()->validated_at);

        $run = $this->validated($run);
        $this->payLine($run, $this->lineFor($run, $second))->assertSessionHas('success');
        $this->post(route('admin.payroll.reopen', $run))->assertSessionHas('error');

        $this->assertSame('validee', $run->fresh()->status);
    }

    // ───────────── Payer ─────────────

    public function test_paying_a_line_records_the_salary_the_expense_and_the_accounting_entry(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));
        $line = $this->lineFor($run, $staff);

        $this->payLine($run, $line, ['channel' => 'wave', 'paid_at' => '2026-10-30'])->assertSessionHas('success');

        $payment = SalaryPayment::sole();
        $this->assertSame($staff->id, $payment->user_id);
        $this->assertSame(2026, $payment->period_year);
        $this->assertSame(10, $payment->period_month);
        $this->assertEquals(250000, $payment->amount);
        $this->assertSame('mobile_money', $payment->payment_method);
        $this->assertSame('2026-10-30', $payment->paid_at->toDateString());
        $this->assertSame($this->admin->id, $payment->recorded_by);

        $expense = Expense::findOrFail($payment->expense_id);
        $this->assertSame('salaires', $expense->category);
        $this->assertEquals(250000, $expense->amount);

        $entry = JournalEntry::where('entryable_type', Expense::class)->where('entryable_id', $expense->id)->firstOrFail();
        $salaries = Account::where('code', '661000')->firstOrFail();
        $this->assertEquals(250000.0, $entry->lines()->where('account_id', $salaries->id)->sum('debit'));

        $line->refresh();
        $this->assertTrue($line->is_paid);
        $this->assertSame($payment->id, $line->salary_payment_id);
    }

    public function test_a_teacher_line_creates_a_teacher_payment_with_the_hours(): void
    {
        $teacher = $this->payrollTeacher('Moussa', 'horaire', null, 5000);
        $this->payrollSession($teacher, '2026-10-05', ['08:00', '10:00']);
        $this->payrollSession($teacher, '2026-10-12', ['08:00', '10:30']);
        $run = $this->validated($this->prepareRun($this->admin));
        $line = $this->lineFor($run, $teacher);

        $this->payLine($run, $line, ['channel' => 'especes'])->assertSessionHas('success');

        $payment = TeacherSalaryPayment::sole();
        $this->assertSame($teacher->id, $payment->teacher_id);
        $this->assertEquals(4.5, $payment->hours_worked);
        $this->assertEquals(22500, $payment->amount);
        $this->assertSame('especes', $payment->payment_method);
        $this->assertSame($payment->id, $line->fresh()->teacher_salary_payment_id);
    }

    public function test_the_line_own_payout_channel_is_used_when_none_is_given(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['payout_channel' => 'cheque']);
        $run = $this->validated($this->prepareRun($this->admin));

        $this->actingAs($this->admin)->post(route('admin.payroll.lines.pay', [$run, $this->lineFor($run, $staff)]), ['paid_at' => '2026-10-31'])
            ->assertSessionHas('success');

        $this->assertSame('autre', SalaryPayment::sole()->payment_method);
    }

    public function test_paying_without_any_channel_is_refused(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));

        $this->actingAs($this->admin)->post(route('admin.payroll.lines.pay', [$run, $this->lineFor($run, $staff)]), ['paid_at' => '2026-10-31'])
            ->assertSessionHasErrors('channel');

        $this->assertSame(0, SalaryPayment::count());
    }

    public function test_a_line_is_never_paid_twice(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));
        $line = $this->lineFor($run, $staff);

        $this->payLine($run, $line)->assertSessionHas('success');
        $this->payLine($run, $line)->assertSessionHas('error');

        $this->assertSame(1, SalaryPayment::count());
        $this->assertSame(1, Expense::where('category', 'salaires')->count());
    }

    public function test_nothing_is_paid_before_the_run_is_validated(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);

        $this->payLine($run, $this->lineFor($run, $staff))->assertSessionHas('error');
        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement'])->assertSessionHas('error');

        $this->assertSame(0, SalaryPayment::count());
    }

    public function test_paying_needs_the_permission_to_add_salaries(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));
        $viewer = $this->payrollActor('voir_salaires');

        $this->actingAs($viewer)->post(route('admin.payroll.lines.pay', [$run, $this->lineFor($run, $staff)]), ['paid_at' => '2026-10-31', 'channel' => 'virement'])
            ->assertForbidden();

        $this->assertSame(0, SalaryPayment::count());
    }

    public function test_paying_everyone_pays_each_unpaid_line_once_with_its_own_channel_first(): void
    {
        $wave = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['payout_channel' => 'wave']);
        $plain = $this->payrollStaff('Ndeye Fall', 200000);
        $teacher = $this->payrollTeacher('Fatou', 'fixe', 300000);
        $run = $this->validated($this->prepareRun($this->admin));
        $this->payLine($run, $this->lineFor($run, $plain), ['channel' => 'especes'])->assertSessionHas('success');

        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement'])->assertSessionHas('success');
        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement'])->assertSessionHas('error');

        $this->assertSame(2, SalaryPayment::count());
        $this->assertSame(1, TeacherSalaryPayment::count());
        $this->assertSame('mobile_money', SalaryPayment::where('user_id', $wave->id)->sole()->payment_method);
        $this->assertSame('especes', SalaryPayment::where('user_id', $plain->id)->sole()->payment_method);
        $this->assertSame('virement', TeacherSalaryPayment::where('teacher_id', $teacher->id)->sole()->payment_method);
        $this->assertSame(0, $run->lines()->whereNull('salary_payment_id')->whereNull('teacher_salary_payment_id')->count());
    }

    private function registerInTheRegistry(User $staff, float $amount): void
    {
        $this->actingAs($this->admin)->post(route('admin.salaries.store'), [
            'user_id' => $staff->id, 'period_year' => 2026, 'period_month' => 10, 'amount' => $amount, 'paid_at' => '2026-10-30', 'payment_method' => 'virement',
        ])->assertSessionHas('success');
    }

    public function test_a_salary_recorded_in_the_registry_meanwhile_is_attached_instead_of_paid_twice(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));
        $line = $this->lineFor($run, $staff);

        // Le comptable enregistre ce salaire par le registre pendant que le cycle est validé.
        $this->registerInTheRegistry($staff, 250000);

        $this->payLine($run, $line)->assertSessionHas('success', fn (string $message) => str_contains($message, 'déjà enregistré au registre'));

        $this->assertSame(1, SalaryPayment::count(), 'pas de second versement');
        $this->assertSame(1, Expense::where('category', 'salaires')->count());
        $this->assertSame(SalaryPayment::sole()->id, $line->fresh()->salary_payment_id);
    }

    public function test_a_registry_payment_for_another_amount_blocks_the_line_with_an_explanation(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));
        $line = $this->lineFor($run, $staff);
        $this->registerInTheRegistry($staff, 240000);

        $this->payLine($run, $line)->assertSessionHas('error', fn (string $message) => str_contains($message, '240 000') && str_contains($message, '250 000') && str_contains($message, "d'octobre 2026"));

        // Rien n'est rattaché ni doublé : la ligne et le registre ne se contredisent pas.
        $this->assertFalse($line->fresh()->is_paid);
        $this->assertSame(1, SalaryPayment::count());
    }

    public function test_paying_everyone_attaches_what_the_registry_already_holds_and_says_so(): void
    {
        $registered = $this->payrollStaff('Awa Sow', 250000);
        $this->payrollStaff('Ndeye Fall', 200000);
        $mismatch = $this->payrollStaff('Mamadou Ba', 180000);
        $run = $this->validated($this->prepareRun($this->admin));
        $this->registerInTheRegistry($registered, 250000);
        $this->registerInTheRegistry($mismatch, 100000);

        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement'])
            ->assertSessionHas('success', fn (string $message) => str_contains($message, '1 salaire(s) versé(s)')
                && str_contains($message, '1 déjà enregistré(s) au registre')
                && str_contains($message, 'Mamadou Ba'));

        $this->assertTrue($this->lineFor($run, $registered)->is_paid);
        $this->assertFalse($this->lineFor($run, $mismatch)->is_paid);
        $this->assertSame(3, SalaryPayment::count(), 'deux du registre + un seul versement de la paie');
    }

    public function test_cancelling_a_payment_in_the_registry_makes_the_line_payable_again(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));
        $line = $this->lineFor($run, $staff);
        $this->payLine($run, $line)->assertSessionHas('success');

        $this->delete(route('admin.salaries.destroy', SalaryPayment::sole()))->assertSessionHas('success');

        $this->assertFalse($line->fresh()->is_paid);
        $this->assertSame(0, Expense::where('category', 'salaires')->count());

        $this->payLine($run, $line)->assertSessionHas('success');
        $this->assertSame(1, SalaryPayment::count());
    }

    public function test_the_registry_shows_the_salaries_paid_through_payroll(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validated($this->prepareRun($this->admin));
        $this->payLine($run, $this->lineFor($run, $staff), ['paid_at' => '2026-10-30'])->assertSessionHas('success');

        $this->get(route('admin.salaries.index', ['year' => 2026]))->assertInertia(fn (Assert $page) => $page
            ->where('staff', fn ($rows) => collect($rows)->firstWhere('name', 'Awa Sow')['months'][10]['status'] === 'payee'));
    }

    public function test_the_registry_serves_the_detailed_payslip_for_a_payment_made_through_payroll(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $teacher = $this->payrollTeacher('Fatou', 'fixe', 300000);
        $run = $this->validated($this->prepareRun($this->admin));
        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement'])->assertSessionHas('success');

        $this->get(route('admin.salaries.payslip.user', SalaryPayment::sole()))->assertOk()
            ->assertHeader('Content-Disposition', 'inline; filename=bulletin-'.$this->lineFor($run, $staff)->reference.'.pdf');
        $this->get(route('admin.salaries.payslip.teacher', TeacherSalaryPayment::sole()))->assertOk()
            ->assertHeader('Content-Disposition', 'inline; filename=bulletin-'.$this->lineFor($run, $teacher)->reference.'.pdf');
    }

    public function test_a_payment_made_in_the_registry_keeps_the_minimal_payslip(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);

        $this->actingAs($this->admin)->post(route('admin.salaries.store'), [
            'user_id' => $staff->id, 'period_year' => 2026, 'period_month' => 9, 'amount' => 250000, 'paid_at' => '2026-09-30', 'payment_method' => 'virement',
        ])->assertSessionHas('success');

        $this->get(route('admin.salaries.payslip.user', SalaryPayment::sole()))->assertOk()
            ->assertHeader('Content-Disposition', 'inline; filename=bulletin-salaire-2026-9-'.$staff->id.'.pdf');
    }

    // ───────────── Supprimer un brouillon ─────────────

    public function test_a_draft_run_can_be_deleted_but_a_validated_one_cannot(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $draft = $this->prepareRun($this->admin, 2026, 10);
        $kept = $this->validated($this->prepareRun($this->admin, 2026, 9));

        $this->actingAs($this->admin)->delete(route('admin.payroll.destroy', $draft))->assertSessionHas('success');
        $this->delete(route('admin.payroll.destroy', $kept))->assertSessionHas('error');

        $this->assertNull(PayrollRun::find($draft->id));
        $this->assertSame(0, PayrollLine::where('payroll_run_id', $draft->id)->count());
        $this->assertNotNull(PayrollRun::find($kept->id));
    }

    public function test_the_run_page_gives_the_totals_and_the_state_of_each_line(): void
    {
        $paid = $this->payrollStaff('Awa Sow', 250000);
        $this->payrollStaff('Ndeye Fall', 200000);
        $run = $this->validated($this->prepareRun($this->admin));
        $this->payLine($run, $this->lineFor($run, $paid))->assertSessionHas('success');

        $this->get(route('admin.payroll.show', $run))->assertInertia(fn (Assert $page) => $page
            ->where('run.status', 'validee')
            ->where('totals.payroll', $this->amount(450000))
            ->where('totals.paid', $this->amount(250000))
            ->where('totals.remaining', $this->amount(200000))
            ->where('totals.count', 2)
            ->where('totals.paid_count', 1)
            ->where('lines.0.name', 'Awa Sow')
            ->where('lines.0.is_paid', true)
            ->where('lines.1.is_paid', false));
    }
}
