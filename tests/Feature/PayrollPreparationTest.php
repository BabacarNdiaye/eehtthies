<?php

namespace Tests\Feature;

use App\Models\PayrollLine;
use App\Models\PayrollRun;
use App\Models\SalaryPayment;
use App\Models\User;
use App\Services\SalaryRecorder;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\BuildsPayroll;
use Tests\TestCase;

/**
 * Préparer un mois de paie : une ligne par personne rémunérée (salaire fixe, ou heures du cahier de texte × taux), sans
 * jamais toucher à l'argent. Les personnes déjà payées par le registre sont reconnues, celles qui n'ont aucune
 * rémunération sont signalées, et préparer deux fois le même mois ne change rien.
 */
class PayrollPreparationTest extends TestCase
{
    use BuildsPayroll;
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-31 18:00:00'));
        $this->admin = User::where('email', 'admin@eeht-thies.sn')->first();
    }

    public function test_a_month_is_prepared_with_one_draft_line_per_paid_person(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $fixed = $this->payrollTeacher('Fatou', 'fixe', 300000);
        $hourly = $this->payrollTeacher('Moussa', 'horaire', null, 5000);

        $run = $this->prepareRun($this->admin);

        $this->assertSame('brouillon', $run->status);
        $this->assertSame(2026, $run->period_year);
        $this->assertSame(10, $run->period_month);
        $this->assertSame($this->admin->id, $run->created_by);
        $this->assertSame(3, $run->lines()->count());

        $line = $this->lineFor($run, $staff);
        $this->assertSame('Awa Sow', $line->name);
        $this->assertSame('Comptable', $line->position);
        $this->assertSame('fixe', $line->payment_type);
        $this->assertEquals(250000, $line->base_amount);
        $this->assertEquals(250000, $line->net_amount);
        $this->assertNull($line->hours);
        $this->assertEquals(300000, $this->lineFor($run, $fixed)->net_amount);
        $this->assertSame('horaire', $this->lineFor($run, $hourly)->payment_type);
    }

    public function test_an_hourly_teacher_is_paid_for_the_sessions_of_the_cahier_de_texte(): void
    {
        $teacher = $this->payrollTeacher('Moussa', 'horaire', null, 5000);
        $other = $this->payrollTeacher('Ibra', 'horaire', null, 4000);
        $this->payrollSession($teacher, '2026-10-05', ['08:00', '10:00']);        // 2 h
        $this->payrollSession($teacher, '2026-10-07', ['14:00:00', '15:30:00']);  // 1 h 30
        $this->payrollSession($teacher, '2026-09-30', ['08:00', '10:00']);        // septembre : ignorée
        $this->payrollSession($teacher, '2026-11-02', ['08:00', '10:00']);        // novembre : ignorée
        $this->payrollSession($other, '2026-10-06', ['08:00', '09:00']);          // un autre enseignant

        $run = $this->prepareRun($this->admin);

        $line = $this->lineFor($run, $teacher);
        $this->assertEquals(3.5, $line->hours);
        $this->assertEquals(5000, $line->hourly_rate);
        $this->assertEquals(17500, $line->base_amount);
        $this->assertEquals(17500, $line->net_amount);
        $this->assertSame(0, $line->unmatched_sessions);
        $this->assertEquals(4000, $this->lineFor($run, $other)->net_amount);
    }

    public function test_sessions_on_the_first_and_last_day_of_the_month_are_counted_whatever_the_stored_date_format(): void
    {
        $teacher = $this->payrollTeacher('Moussa', 'horaire', null, 5000);

        // Une base qui stocke « 2026-10-01 » sans l'heure (SQLite) ne doit pas faire perdre la séance du premier jour du mois.
        foreach (['2026-09-30' => false, '2026-10-01' => true, '2026-10-31' => true, '2026-11-01' => false] as $date => $counted) {
            $session = $this->payrollSession($teacher, '2026-10-15', ['08:00', '10:00']);
            DB::table('lesson_logs')->where('id', $session->id)->update(['date' => $date]);
        }

        $line = $this->lineFor($this->prepareRun($this->admin), $teacher);

        $this->assertEquals(4, $line->hours, 'seules les séances du 1er et du 31 octobre comptent');
        $this->assertEquals(20000, $line->base_amount);
    }

    public function test_a_session_without_a_timetable_slot_is_flagged_and_not_counted(): void
    {
        $teacher = $this->payrollTeacher('Moussa', 'horaire', null, 5000);
        $this->payrollSession($teacher, '2026-10-05', ['08:00', '10:00']);
        $this->payrollSession($teacher, '2026-10-06', null);

        $run = $this->prepareRun($this->admin);

        $line = $this->lineFor($run, $teacher);
        $this->assertEquals(2.0, $line->hours);
        $this->assertSame(1, $line->unmatched_sessions);

        $this->get(route('admin.payroll.show', $run))->assertInertia(fn (Assert $page) => $page
            ->where('lines.0.unmatched_sessions', 1));
    }

    public function test_people_without_remuneration_are_listed_and_inactive_or_non_staff_are_left_out(): void
    {
        $this->payrollStaff('Avec salaire', 200000);
        $this->payrollStaff('Sans salaire', null);
        $this->payrollStaff('Compte inactif', 200000, 'comptable', ['is_active' => false]);
        $this->payrollStaff('Élève', 200000, 'eleve');
        $this->payrollStaff('Parent', 200000, 'parent');
        $this->payrollTeacher('Taux', 'horaire', null, null);
        $this->payrollTeacher('Ancien', 'fixe', 300000, null, ['status' => 'inactif']);
        $this->payrollTeacher('Paye', 'fixe', 300000);

        $run = $this->prepareRun($this->admin);

        $this->assertEqualsCanonicalizing(['Avec salaire', 'Paye Ba'], $run->lines()->pluck('name')->all());

        $this->get(route('admin.payroll.show', $run))->assertInertia(fn (Assert $page) => $page
            ->where('missing', function ($missing) {
                $names = collect($missing)->pluck('name')->all();

                return in_array('Sans salaire', $names, true) && in_array('Taux Ba', $names, true)
                    && array_intersect(['Compte inactif', 'Élève', 'Parent', 'Ancien Ba', 'Avec salaire'], $names) === [];
            }));
    }

    public function test_a_month_already_paid_through_the_registry_is_marked_paid(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $payment = app(SalaryRecorder::class)->record($staff, 2026, 10, 240000.0, '2026-10-30', 'virement', null, null, $this->admin->id);

        $run = $this->prepareRun($this->admin);

        $line = $this->lineFor($run, $staff);
        $this->assertSame($payment->id, $line->salary_payment_id);
        $this->assertTrue($line->is_paid);
        $this->assertEquals(240000, $line->net_amount);
        $this->assertSame(1, SalaryPayment::count());
    }

    public function test_preparing_the_same_month_twice_changes_nothing(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);
        $this->lineFor($run, $staff)->update(['notes' => 'Vérifié']);

        $this->post(route('admin.payroll.store'), ['period_year' => 2026, 'period_month' => 10])
            ->assertRedirect(route('admin.payroll.show', $run));

        $this->assertSame(1, PayrollRun::count());
        $this->assertSame(1, PayrollLine::count());
        $this->assertSame('Vérifié', $this->lineFor($run, $staff)->notes);
    }

    public function test_refresh_adds_newly_eligible_people_without_touching_existing_lines(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $teacher = $this->payrollTeacher('Moussa', 'horaire', null, 5000);
        $this->payrollSession($teacher, '2026-10-05', ['08:00', '10:00']);
        $run = $this->prepareRun($this->admin);
        $this->lineFor($run, $teacher)->update(['hours' => 10, 'base_amount' => 50000, 'net_amount' => 50000]);
        $late = $this->payrollStaff('Arrivé en cours de mois', 180000);

        $this->post(route('admin.payroll.refresh', $run))->assertSessionHas('success');

        $this->assertSame(3, $run->lines()->count());
        $this->assertEquals(180000, $this->lineFor($run, $late)->net_amount);
        $this->assertEquals(10, $this->lineFor($run, $teacher)->hours);
        $this->assertEquals(50000, $this->lineFor($run, $teacher)->net_amount);
    }

    public function test_a_validated_run_cannot_be_refreshed(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $run = $this->prepareRun($this->admin);
        $run->update(['status' => 'validee']);
        $this->payrollStaff('Arrivé trop tard', 180000);

        $this->post(route('admin.payroll.refresh', $run))->assertSessionHas('error');

        $this->assertSame(1, $run->lines()->count());
    }

    public function test_the_payout_details_are_copied_to_the_line(): void
    {
        $staff = $this->payrollStaff('Awa Sow', 250000, 'comptable', ['payout_channel' => 'wave', 'payout_account' => '77 123 45 67']);

        $line = $this->lineFor($this->prepareRun($this->admin), $staff);

        $this->assertSame('wave', $line->payout_channel);
        $this->assertSame('77 123 45 67', $line->payout_account);
    }

    public function test_preparation_needs_the_right_permissions(): void
    {
        $stocks = $this->payrollStaff('Stock', null, 'responsable-stocks');
        $viewer = $this->payrollActor('voir_salaires');
        $accountant = $this->payrollStaff('Compta', 100000, 'comptable');
        $payload = ['period_year' => 2026, 'period_month' => 10];

        $this->actingAs($stocks)->get(route('admin.payroll.index'))->assertForbidden();
        $this->actingAs($stocks)->post(route('admin.payroll.store'), $payload)->assertForbidden();
        $this->actingAs($viewer)->get(route('admin.payroll.index'))->assertOk();
        $this->actingAs($viewer)->post(route('admin.payroll.store'), $payload)->assertForbidden();
        $this->assertSame(0, PayrollRun::count());

        $this->actingAs($accountant)->post(route('admin.payroll.store'), $payload)->assertRedirect();
        $this->assertSame(1, PayrollRun::count());
    }

    public function test_the_period_reads_well_in_a_sentence(): void
    {
        foreach ([10 => "d'octobre 2026", 3 => 'de mars 2026', 4 => "d'avril 2026", 8 => "d'août 2026", 2 => 'de février 2026', 12 => 'de décembre 2026'] as $month => $expected) {
            $run = new PayrollRun(['period_year' => 2026, 'period_month' => $month]);

            $this->assertSame($expected, $run->of_label);
        }
    }

    public function test_the_period_must_be_a_real_month(): void
    {
        $this->actingAs($this->admin)->post(route('admin.payroll.store'), ['period_year' => 2026, 'period_month' => 13])
            ->assertSessionHasErrors('period_month');
        $this->post(route('admin.payroll.store'), ['period_year' => 1999, 'period_month' => 3])->assertSessionHasErrors('period_year');

        $this->assertSame(0, PayrollRun::count());
    }

    public function test_the_index_lists_the_runs_with_their_totals(): void
    {
        $this->payrollStaff('Awa Sow', 250000);
        $this->payrollTeacher('Fatou', 'fixe', 300000);
        $this->prepareRun($this->admin);

        $this->get(route('admin.payroll.index'))->assertInertia(fn (Assert $page) => $page
            ->where('runs.0.label', 'Octobre 2026')
            ->where('runs.0.status', 'brouillon')
            ->where('runs.0.lines_count', 2)
            ->where('runs.0.payroll', $this->amount(550000))
            ->where('runs.0.paid', $this->amount(0))
            ->where('runs.0.remaining', $this->amount(550000)));
    }
}
