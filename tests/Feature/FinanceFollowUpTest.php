<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\PaymentReminder;
use App\Models\Setting;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Le suivi des mensualités distingue « en retard » de « à venir », totalise chaque mois et indique à qui envoyer une
 * relance ; la liste des impayés montre l'ancienneté et la dernière relance ; les réglages des paiements commandent
 * le rappel avant échéance et la génération automatique.
 */
class FinanceFollowUpTest extends TestCase
{
    use RefreshDatabase;

    private AcademicYear $year;

    private Formation $formation;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-06 09:00:00'));

        $this->year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $this->admin = User::where('email', 'admin@eeht-thies.sn')->first();
    }

    private function student(string $first, string $last = 'Diop'): Student
    {
        return Student::create([
            'matricule' => 'T-'.uniqid(), 'first_name' => $first, 'last_name' => $last, 'status' => 'actif',
            'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id,
        ]);
    }

    private function mensualite(Student $student, int $month, ?string $due, float $amount = 25000, float $paid = 0): Invoice
    {
        $invoice = Invoice::create([
            'student_id' => $student->id, 'academic_year_id' => $this->year->id, 'type' => 'mensualite', 'period_month' => $month,
            'label' => 'Mensualité '.Invoice::MONTH_LABELS[$month], 'amount' => $amount, 'due_date' => $due,
        ]);

        if ($paid > 0) {
            $invoice->payments()->create(['amount' => $paid, 'method' => 'especes', 'paid_at' => now()]);
        }

        return $invoice;
    }

    private function tracker(): TestResponse
    {
        return $this->actingAs($this->admin)->get(route('admin.invoices.monthly', [
            'formation_id' => $this->formation->id, 'academic_year_id' => $this->year->id,
        ]));
    }

    /** Comparaison d'un montant JSON (entier ou décimal) sans dépendre de son type. */
    private function amount(float $expected): \Closure
    {
        return fn ($value) => (float) $value === $expected;
    }

    public function test_the_tracker_tells_an_overdue_month_from_an_upcoming_one(): void
    {
        $awa = $this->student('Awa');
        $this->mensualite($awa, 9, '2026-09-05');                 // échue, rien payé
        $this->mensualite($awa, 10, '2026-10-05', 25000, 10000);  // échue, payée en partie
        $this->mensualite($awa, 11, '2026-11-05');                // à venir
        $this->mensualite($awa, 12, null);                        // sans échéance

        $this->tracker()->assertInertia(fn (Assert $page) => $page
            ->where('students.0.months.9.status', 'impayee')
            ->where('students.0.months.9.overdue', true)
            ->where('students.0.months.9.due_date', '2026-09-05')
            ->where('students.0.months.9.balance', $this->amount(25000))
            ->where('students.0.months.10.status', 'partielle')
            ->where('students.0.months.10.overdue', true)
            ->where('students.0.months.10.balance', $this->amount(15000))
            ->where('students.0.months.11.status', 'impayee')
            ->where('students.0.months.11.overdue', false)
            ->where('students.0.months.12.overdue', false)
            ->where('students.0.months.12.due_date', null)
            ->where('students.0.months.1.status', 'non_genere')
            ->where('students.0.months.1.balance', null));
    }

    public function test_a_settled_month_is_never_overdue(): void
    {
        $awa = $this->student('Awa');
        $this->mensualite($awa, 9, '2026-09-05', 25000, 25000);

        $this->tracker()->assertInertia(fn (Assert $page) => $page
            ->where('students.0.months.9.status', 'payee')
            ->where('students.0.months.9.overdue', false)
            ->where('students.0.months.9.balance', $this->amount(0)));
    }

    public function test_the_tracker_totals_each_month_and_the_overdue_part(): void
    {
        $awa = $this->student('Awa', 'Ba');
        $bineta = $this->student('Bineta', 'Cissé');
        $this->mensualite($awa, 9, '2026-09-05');                  // 25 000 en retard
        $this->mensualite($awa, 11, '2026-11-05');                 // 25 000 à venir
        $this->mensualite($bineta, 9, '2026-09-05', 25000, 25000);
        $this->mensualite($bineta, 10, '2026-10-05', 30000, 5000); // 25 000 en retard

        $this->tracker()->assertInertia(fn (Assert $page) => $page
            ->where('totals.by_month.9', $this->amount(25000))
            ->where('totals.by_month.10', $this->amount(25000))
            ->where('totals.by_month.11', $this->amount(25000))
            ->where('totals.by_month.12', $this->amount(0))
            ->where('totals.balance', $this->amount(75000))
            ->where('totals.overdue', $this->amount(50000)));
    }

    public function test_the_tracker_says_who_can_be_reminded(): void
    {
        $awa = $this->student('Awa', 'Ba');
        $bineta = $this->student('Bineta', 'Cissé');
        $this->mensualite($awa, 9, '2026-09-05');                  // en retard
        $this->mensualite($bineta, 11, '2026-11-05');              // à venir seulement

        $this->tracker()->assertInertia(fn (Assert $page) => $page
            ->where('students.0.name', 'Awa Ba')
            ->where('students.0.overdue.count', 1)
            ->where('students.0.overdue.balance', $this->amount(25000))
            ->where('students.1.overdue.count', 0));
    }

    public function test_the_unpaid_page_reports_ageing_and_the_last_reminder(): void
    {
        $awa = $this->student('Awa');
        $late = $this->mensualite($awa, 9, '2026-09-24', 25000);   // 12 jours de retard
        $soon = $this->mensualite($awa, 11, '2026-11-05', 10000);  // à venir
        foreach ([[3, '2026-09-27 08:00:00'], [7, '2026-10-01 08:00:00']] as [$days, $at]) {
            PaymentReminder::create([
                'invoice_id' => $late->id, 'student_id' => $awa->id, 'kind' => 'auto', 'milestone' => $days, 'days_overdue' => $days,
                'balance' => 25000, 'channels' => ['mail'],
            ])->forceFill(['created_at' => $at])->save();
        }

        $this->actingAs($this->admin)->get(route('admin.invoices.overdue'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('totalOutstanding', $this->amount(35000))
                ->where('totalOverdue', $this->amount(25000))
                ->where('familiesOverdue', 1)
                ->where('invoices.0.id', $late->id)
                ->where('invoices.0.reminders_count', 2)
                ->where('invoices.0.last_reminder_at', fn ($at) => str_starts_with((string) $at, '2026-10-01'))
                ->where('invoices.1.id', $soon->id)
                ->where('invoices.1.reminders_count', 0)
                ->where('invoices.1.last_reminder_at', null));
    }

    public function test_the_settings_page_saves_the_two_automatic_options_and_the_due_day(): void
    {
        $this->actingAs($this->admin)->get(route('admin.finance.settings'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('settings.remind_before_due', false)
                ->where('settings.auto_generate_monthly', false));

        $this->put(route('admin.finance.settings.update'), ['due_day' => 10, 'remind_before_due' => true, 'auto_generate_monthly' => true])
            ->assertSessionHasNoErrors();

        $this->assertSame('1', Setting::get('finance_remind_before_due'));
        $this->assertSame('1', Setting::get('finance_auto_generate_monthly'));

        $this->get(route('admin.finance.settings'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('settings.due_day', 10)
                ->where('settings.remind_before_due', true)
                ->where('settings.auto_generate_monthly', true));

        $this->put(route('admin.finance.settings.update'), ['due_day' => 10, 'remind_before_due' => false, 'auto_generate_monthly' => false]);

        $this->assertSame('0', Setting::get('finance_remind_before_due'));
        $this->assertSame('0', Setting::get('finance_auto_generate_monthly'));
    }
}
