<?php

namespace Tests\Feature;

use App\Models\PayrollRun;
use App\Models\SalaryPayment;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsPayroll;
use Tests\TestCase;

/**
 * L'ordre de paiement est le fichier que l'on remet à la banque ou que l'on suit pour les paiements mobiles : il liste
 * ce qui reste à verser (cycle validé, lignes non payées) avec le mode et le compte de chacun. L'exporter ne crée
 * aucun paiement, et chaque export laisse une trace au journal d'activité.
 */
class PayrollPayoutFileTest extends TestCase
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

    private function validatedRun(): PayrollRun
    {
        $run = $this->prepareRun($this->admin);
        $this->post(route('admin.payroll.validate', $run))->assertSessionHas('success');

        return $run->fresh();
    }

    public function test_the_file_lists_the_unpaid_lines_of_a_validated_run_with_their_payout_details(): void
    {
        $wave = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['payout_channel' => 'wave', 'payout_account' => '77 123 45 67']);
        $paid = $this->payrollStaff('Ndeye Fall', 200000);
        $teacher = $this->payrollTeacher('Fatou', 'fixe', 300000, null, ['payout_channel' => 'virement', 'payout_account' => 'SN08 SN01 0152 0000 1234']);
        $run = $this->validatedRun();
        $this->post(route('admin.payroll.lines.pay', [$run, $this->lineFor($run, $paid)]), ['paid_at' => '2026-10-31', 'channel' => 'especes'])->assertSessionHas('success');

        $response = $this->get(route('admin.payroll.payout.csv', $run));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $csv = $response->streamedContent();
        $this->assertStringContainsString('Awa Sow', $csv);
        $this->assertStringContainsString('Wave', $csv);
        $this->assertStringContainsString('77 123 45 67', $csv);
        $this->assertStringContainsString('250000', $csv);
        $this->assertStringContainsString('Fatou Ba', $csv);
        $this->assertStringContainsString('SN08 SN01 0152 0000 1234', $csv);
        $this->assertStringContainsString('BP-2026-10-'.$this->lineFor($run, $wave)->id, $csv);
        $this->assertStringContainsString('BP-2026-10-'.$this->lineFor($run, $teacher)->id, $csv);
        $this->assertStringNotContainsString('Ndeye Fall', $csv, 'une ligne déjà payée ne figure plus dans l\'ordre de paiement');
    }

    public function test_the_csv_neutralises_cells_that_a_spreadsheet_would_run_as_formulas(): void
    {
        $this->payrollStaff('=HYPERLINK("http://example.test","Cliquer")', 250000, 'comptable', ['payout_channel' => 'wave', 'payout_account' => '@SUM(1+1)']);
        $this->payrollStaff('Awa Sow', 200000, 'comptable', ['payout_channel' => 'orange_money', 'payout_account' => '+221 77 123 45 67']);
        $this->payrollStaff('Ndeye Fall', 100000, 'comptable', ['payout_channel' => 'virement', 'payout_account' => '+cmd|x']);
        $run = $this->validatedRun();

        $csv = $this->get(route('admin.payroll.payout.csv', $run))->streamedContent();
        $handle = fopen('php://temp', 'r+');
        fwrite($handle, ltrim($csv, "\xEF\xBB\xBF"));
        rewind($handle);
        $rows = [];

        while (($row = fgetcsv($handle, escape: '\\')) !== false) {
            $rows[] = $row;
        }

        $byName = collect($rows)->skip(1)->keyBy(fn (array $row) => ltrim($row[1], "'"));

        // Un téléphone reste lisible tel quel ; ce qui ressemble à une formule est précédé d'une apostrophe.
        $this->assertSame("'=HYPERLINK(\"http://example.test\",\"Cliquer\")", $byName['=HYPERLINK("http://example.test","Cliquer")'][1]);
        $this->assertSame("'@SUM(1+1)", $byName['=HYPERLINK("http://example.test","Cliquer")'][4]);
        $this->assertSame('+221 77 123 45 67', $byName['Awa Sow'][4]);
        $this->assertSame("'+cmd|x", $byName['Ndeye Fall'][4]);
        $this->assertSame('250000', $byName['=HYPERLINK("http://example.test","Cliquer")'][5]);
    }

    public function test_exporting_creates_no_payment_and_leaves_a_trace(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validatedRun();

        $this->get(route('admin.payroll.payout.csv', $run))->assertOk()->streamedContent();
        $this->get(route('admin.payroll.payout.pdf', $run))->assertOk();

        $this->assertSame(0, SalaryPayment::count());
        $this->assertSame(2, Activity::where('log_name', 'salaires')->where('description', 'like', '%ordre de paiement%')->count());
    }

    public function test_the_pdf_version_downloads(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validatedRun();

        $response = $this->get(route('admin.payroll.payout.pdf', $run));

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_a_draft_run_has_no_payout_file(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);

        $this->get(route('admin.payroll.payout.csv', $run))->assertRedirect()->assertSessionHas('error');
        $this->get(route('admin.payroll.payout.pdf', $run))->assertRedirect()->assertSessionHas('error');
    }

    public function test_when_everything_is_paid_there_is_nothing_left_to_export(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validatedRun();
        $this->post(route('admin.payroll.pay', $run), ['paid_at' => '2026-10-31', 'channel' => 'virement'])->assertSessionHas('success');

        $this->get(route('admin.payroll.payout.csv', $run))->assertRedirect()->assertSessionHas('error');
    }

    public function test_the_file_needs_the_export_permission(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $run = $this->validatedRun();
        $viewer = $this->payrollActor('voir_salaires');

        $this->actingAs($viewer)->get(route('admin.payroll.payout.csv', $run))->assertForbidden();
        $this->actingAs($viewer)->get(route('admin.payroll.payout.pdf', $run))->assertForbidden();
    }
}
