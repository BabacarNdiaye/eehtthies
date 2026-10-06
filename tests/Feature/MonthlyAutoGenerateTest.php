<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * La génération automatique des mensualités est désactivée par défaut. Activée dans les réglages des paiements, elle
 * crée le 1er du mois la mensualité du mois en cours de chaque élève actif (un dixième des frais de scolarité de sa
 * formation), avec son échéance, sans jamais en doubler une ni toucher à une mensualité déjà générée à la main.
 */
class MonthlyAutoGenerateTest extends TestCase
{
    use RefreshDatabase;

    private AcademicYear $year;

    private Formation $formation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(Carbon::parse('2026-11-01 06:00:00'));
        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->formation = $this->formation('BTS Cuisine', 150000);
    }

    private function formation(string $name, float $fee): Formation
    {
        return Formation::create(['name' => $name, 'code' => 'F-'.uniqid(), 'slug' => 'f-'.uniqid(), 'tuition_fee' => $fee]);
    }

    private function student(Formation $formation, string $status = 'actif'): Student
    {
        return Student::create([
            'matricule' => 'T-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => $status,
            'formation_id' => $formation->id, 'academic_year_id' => $this->year->id,
        ]);
    }

    private function enable(): void
    {
        Setting::set('finance_auto_generate_monthly', '1', 'finance');
    }

    private function generate(): string
    {
        Artisan::call('app:generate-monthly-invoices');

        return Artisan::output();
    }

    public function test_nothing_is_generated_while_the_setting_is_off(): void
    {
        $this->student($this->formation);

        $output = $this->generate();

        $this->assertSame(0, Invoice::count());
        $this->assertStringContainsString('désactivée', $output);
    }

    public function test_it_creates_the_current_months_mensualite_for_active_students_with_a_due_date(): void
    {
        $this->enable();
        $student = $this->student($this->formation);
        $this->student($this->formation, 'abandon');
        $this->student($this->formation('Sans frais', 0));

        $this->generate();

        $invoice = Invoice::sole();
        $this->assertSame($student->id, $invoice->student_id);
        $this->assertSame($this->year->id, $invoice->academic_year_id);
        $this->assertSame('mensualite', $invoice->type);
        $this->assertSame(11, $invoice->period_month);
        $this->assertSame('Mensualité — Novembre — BTS Cuisine', $invoice->label);
        $this->assertEquals(15000, $invoice->amount);
        $this->assertSame('2026-11-05', $invoice->due_date->toDateString());
    }

    public function test_running_it_twice_never_doubles_a_mensualite(): void
    {
        $this->enable();
        $this->student($this->formation);

        $this->generate();
        $this->generate();

        $this->assertSame(1, Invoice::count());
    }

    public function test_a_mensualite_already_generated_by_hand_is_left_untouched(): void
    {
        $this->enable();
        $student = $this->student($this->formation);
        $byHand = Invoice::create([
            'student_id' => $student->id, 'academic_year_id' => $this->year->id, 'type' => 'mensualite', 'period_month' => 11,
            'label' => 'Mensualité — Novembre — BTS Cuisine', 'amount' => 20000, 'due_date' => '2026-11-12',
        ]);

        $this->generate();

        $this->assertSame(1, Invoice::count());
        $this->assertEquals(20000, $byHand->fresh()->amount);
        $this->assertSame('2026-11-12', $byHand->fresh()->due_date->toDateString());
    }

    public function test_it_does_nothing_in_the_summer_months_outside_the_school_calendar(): void
    {
        $this->enable();
        $this->student($this->formation);
        $this->travelTo(Carbon::parse('2027-08-01 06:00:00'));

        $this->generate();

        $this->assertSame(0, Invoice::count());
    }

    public function test_it_needs_a_current_academic_year(): void
    {
        $this->enable();
        $this->student($this->formation);
        $this->year->update(['is_current' => false]);

        $this->generate();

        $this->assertSame(0, Invoice::count());
    }

    public function test_one_line_of_the_activity_log_records_the_run(): void
    {
        $this->enable();
        $this->student($this->formation);
        $this->student($this->formation);

        $this->generate();

        $entry = Activity::where('log_name', 'comptabilite')->where('description', 'like', '%générée%')->sole();
        $this->assertSame('2 mensualité(s) générée(s) automatiquement pour novembre', $entry->description);
    }

    public function test_the_command_is_scheduled_on_the_first_of_each_month_in_the_morning(): void
    {
        Artisan::call('schedule:list');

        $this->assertMatchesRegularExpression('/0\s+6\s+1\s+\*\s+\*\s+.*app:generate-monthly-invoices/', Artisan::output());
    }
}
