<?php

namespace Tests\Feature;

use App\Models\PayrollRun;
use App\Models\Teacher;
use App\Models\User;
use App\Support\Payslip;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsPayroll;
use Tests\TestCase;

/**
 * Chacun retrouve ses propres bulletins de paie, une fois le salaire versé : le personnel dans l'administration, les
 * enseignants dans leur espace. Jamais ceux d'un autre, jamais un bulletin non payé, et le numéro de compte n'y figure
 * que masqué.
 */
class MyPayslipsTest extends TestCase
{
    use BuildsPayroll;
    use RefreshDatabase;

    private User $admin;

    private User $awa;

    private User $ndeye;

    private User $teacherUser;

    private Teacher $teacher;

    private PayrollRun $payrollRun;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->withoutDefer();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-31 18:00:00'));
        $this->admin = User::where('email', 'admin@eeht-thies.sn')->first();

        $this->awa = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['payout_channel' => 'wave', 'payout_account' => '77 123 45 67']);
        $this->ndeye = $this->payrollStaff('Ndeye Fall', 200000, 'comptable');
        $this->teacherUser = User::factory()->create();
        $this->teacherUser->assignRole('enseignant');
        $this->teacher = $this->payrollTeacher('Fatou', 'fixe', 300000, null, ['user_id' => $this->teacherUser->id]);

        $this->payrollRun = $this->prepareRun($this->admin);
        $this->post(route('admin.payroll.validate', $this->payrollRun))->assertSessionHas('success');
        $this->post(route('admin.payroll.pay', $this->payrollRun), ['paid_at' => '2026-10-30', 'channel' => 'virement'])->assertSessionHas('success');
    }

    public function test_a_staff_member_sees_only_their_own_paid_payslips(): void
    {
        $this->prepareRun($this->admin, 2026, 11); // préparé, jamais payé : invisible pour les intéressés

        $this->actingAs($this->awa)->get(route('admin.my-payslips.index'))->assertInertia(fn (Assert $page) => $page
            ->has('payslips', 1)
            ->where('payslips.0.period_label', 'Octobre 2026')
            ->where('payslips.0.net_amount', $this->amount(250000))
            ->where('payslips.0.reference', 'BP-2026-10-'.$this->lineFor($this->payrollRun, $this->awa)->id)
            ->where('payslips.0.channel_label', 'Wave'));
    }

    public function test_a_payslip_download_is_limited_to_its_owner_and_to_paid_lines(): void
    {
        $mine = $this->lineFor($this->payrollRun, $this->awa);
        $theirs = $this->lineFor($this->payrollRun, $this->ndeye);
        $unpaid = $this->lineFor($this->prepareRun($this->admin, 2026, 11), $this->awa);

        $response = $this->actingAs($this->awa)->get(route('admin.my-payslips.download', $mine));
        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));

        $this->get(route('admin.my-payslips.download', $theirs))->assertNotFound();
        $this->get(route('admin.my-payslips.download', $unpaid))->assertNotFound();
    }

    public function test_a_teacher_finds_their_payslips_in_the_teacher_portal(): void
    {
        $line = $this->lineFor($this->payrollRun, $this->teacher);

        $this->actingAs($this->teacherUser)->get(route('teacher.payslips.index'))->assertInertia(fn (Assert $page) => $page
            ->has('payslips', 1)
            ->where('payslips.0.period_label', 'Octobre 2026')
            ->where('payslips.0.net_amount', $this->amount(300000)));

        $response = $this->get(route('teacher.payslips.download', $line));
        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));

        $this->get(route('teacher.payslips.download', $this->lineFor($this->payrollRun, $this->awa)))->assertNotFound();
    }

    public function test_students_and_parents_cannot_open_payslips(): void
    {
        $student = User::factory()->create();
        $student->assignRole('eleve');
        $parent = User::factory()->create();
        $parent->assignRole('parent');
        $line = $this->lineFor($this->payrollRun, $this->awa);

        foreach ([$student, $parent] as $outsider) {
            $this->actingAs($outsider)->get(route('admin.my-payslips.index'))->assertForbidden();
            $this->get(route('admin.my-payslips.download', $line))->assertForbidden();
            $this->get(route('teacher.payslips.index'))->assertForbidden();
            $this->get(route('teacher.payslips.download', $line))->assertForbidden();
        }
    }

    public function test_a_guest_is_sent_to_the_login_page(): void
    {
        $this->post(route('logout'));

        $this->get(route('admin.my-payslips.index'))->assertRedirect(route('login'));
    }

    public function test_the_payslip_shows_the_breakdown_and_masks_the_account(): void
    {
        $line = $this->lineFor($this->payrollRun, $this->awa);
        $line->update([
            'adjustments' => [
                ['type' => 'prime', 'label' => 'Prime de rendement', 'amount' => 20000],
                ['type' => 'retenue', 'label' => 'Avance', 'amount' => 5000],
            ],
            'net_amount' => 265000,
        ]);

        $data = Payslip::viewData($line->fresh());

        $this->assertSame('Awa Sow', $data['name']);
        $this->assertSame('Octobre 2026', $data['periodLabel']);
        $this->assertSame('BP-2026-10-'.$line->id, $data['reference']);
        $this->assertEquals(250000, $data['baseAmount']);
        $this->assertEquals(20000, $data['bonuses']->sum('amount'));
        $this->assertEquals(5000, $data['deductions']->sum('amount'));
        $this->assertEquals(265000, $data['netAmount']);
        $this->assertSame('Wave', $data['channelLabel']);
        $this->assertSame('•••• 4567', $data['accountMasked']);
        $this->assertStringNotContainsString('77 123', json_encode($data, JSON_UNESCAPED_UNICODE));
    }
}
