<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Une mensualité sans échéance n'est jamais « en retard » : elle échappe aux relances. Les mensualités générées
 * reçoivent donc une date (le jour réglé dans les réglages des paiements, le 5 par défaut), calculée dans la bonne
 * année civile (septembre à décembre : année de début ; janvier à juin : année de fin).
 */
class MonthlyDueDateTest extends TestCase
{
    use RefreshDatabase;

    private AcademicYear $year;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-06 09:00:00'));

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->admin = User::where('email', 'admin@eeht-thies.sn')->first();
    }

    private function student(array $attributes = []): Student
    {
        return Student::create($attributes + ['matricule' => 'T-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif']);
    }

    public function test_a_school_month_gets_its_calendar_year_from_the_academic_year(): void
    {
        $this->assertSame('2026-09-05', Invoice::dueDateFor($this->year, 9, 5)->toDateString());
        $this->assertSame('2026-12-05', Invoice::dueDateFor($this->year, 12, 5)->toDateString());
        $this->assertSame('2027-01-05', Invoice::dueDateFor($this->year, 1, 5)->toDateString());
        $this->assertSame('2027-06-05', Invoice::dueDateFor($this->year, 6, 5)->toDateString());
    }

    public function test_the_day_is_clamped_to_the_length_of_the_month(): void
    {
        $this->assertSame('2027-02-28', Invoice::dueDateFor($this->year, 2, 31)->toDateString());
        $this->assertSame('2026-11-30', Invoice::dueDateFor($this->year, 11, 31)->toDateString());
    }

    public function test_without_an_academic_year_the_current_school_year_is_assumed(): void
    {
        $this->assertSame('2026-10-05', Invoice::dueDateFor(null, 10, 5)->toDateString());

        $this->travelTo(Carbon::parse('2027-02-10 09:00:00'));

        $this->assertSame('2027-03-05', Invoice::dueDateFor(null, 3, 5)->toDateString());
        $this->assertSame('2026-11-05', Invoice::dueDateFor(null, 11, 5)->toDateString());
    }

    public function test_generated_monthly_invoices_carry_a_due_date(): void
    {
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-CUI', 'is_active' => true, 'tuition_fee' => 250000]);
        $this->student(['formation_id' => $formation->id]);

        $this->actingAs($this->admin)->post(route('admin.invoices.generateMonthly'), [
            'formation_id' => $formation->id, 'academic_year_id' => $this->year->id, 'months' => [10, 1], 'amount' => 25000,
        ])->assertSessionHasNoErrors();

        $this->assertSame(
            ['2026-10-05', '2027-01-05'],
            Invoice::orderBy('period_month', 'desc')->get()->map(fn (Invoice $invoice) => $invoice->due_date?->toDateString())->all(),
        );

        Setting::set('finance_due_day', 10, 'finance');
        $other = $this->student(['formation_id' => $formation->id]);

        $this->post(route('admin.invoices.generateMonthly'), [
            'formation_id' => $formation->id, 'academic_year_id' => $this->year->id, 'months' => [10], 'amount' => 25000,
        ]);

        $this->assertSame('2026-10-10', Invoice::where('student_id', $other->id)->first()->due_date->toDateString());
    }

    public function test_missing_due_dates_are_fixed_by_one_explicit_action_and_nothing_else_changes(): void
    {
        $student = $this->student(['academic_year_id' => $this->year->id]);
        $make = fn (array $attributes) => Invoice::create($attributes + [
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => 'Mensualité', 'amount' => 25000,
        ]);

        $october = $make(['academic_year_id' => $this->year->id, 'period_month' => 10]);
        $january = $make(['academic_year_id' => $this->year->id, 'period_month' => 1]);
        $dated = $make(['academic_year_id' => $this->year->id, 'period_month' => 11, 'due_date' => '2026-11-20']);
        $noYear = $make(['period_month' => 12]);
        $other = $make(['type' => 'inscription', 'label' => "Frais d'inscription"]);

        $this->actingAs($this->admin)->get(route('admin.invoices.monthly'))
            ->assertInertia(fn (Assert $page) => $page->where('missingDueDates', 2));

        $this->post(route('admin.invoices.fixDueDates'))->assertSessionHasNoErrors()->assertSessionHas('success');

        $this->assertSame('2026-10-05', $october->fresh()->due_date->toDateString());
        $this->assertSame('2027-01-05', $january->fresh()->due_date->toDateString());
        $this->assertSame('2026-11-20', $dated->fresh()->due_date->toDateString());
        $this->assertNull($noYear->fresh()->due_date);
        $this->assertNull($other->fresh()->due_date);

        $this->get(route('admin.invoices.monthly'))
            ->assertInertia(fn (Assert $page) => $page->where('missingDueDates', 0));
    }

    public function test_fixing_due_dates_needs_the_permission_to_edit_accounting(): void
    {
        $stocks = User::factory()->create();
        $stocks->assignRole('responsable-stocks');

        $this->actingAs($stocks)->post(route('admin.invoices.fixDueDates'))->assertForbidden();
    }

    public function test_the_finance_settings_are_validated_and_saved(): void
    {
        $this->actingAs($this->admin);

        $this->get(route('admin.finance.settings'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Finance/Settings')->where('settings.due_day', 5));

        $this->put(route('admin.finance.settings.update'), ['due_day' => 12])->assertSessionHasNoErrors();
        $this->assertSame(12, (int) Setting::get('finance_due_day'));

        $this->put(route('admin.finance.settings.update'), ['due_day' => 40])->assertSessionHasErrors('due_day');
        $this->put(route('admin.finance.settings.update'), ['due_day' => 0])->assertSessionHasErrors('due_day');
        $this->assertSame(12, (int) Setting::get('finance_due_day'));

        $stocks = User::factory()->create();
        $stocks->assignRole('responsable-stocks');
        $this->actingAs($stocks)->get(route('admin.finance.settings'))->assertForbidden();
    }
}
