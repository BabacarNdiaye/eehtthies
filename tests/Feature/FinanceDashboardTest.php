<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Formation;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Le tableau de bord financier et la caisse du jour chiffrent les encaissements, le recouvrement et les retards. */
class FinanceDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function bootSchool(): array
    {
        $this->withoutVite();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->travelTo(Carbon::parse('2026-10-06 09:00:00'));

        $year = AcademicYear::create(['label' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $formation = Formation::create(['name' => 'BTS Cuisine', 'code' => 'BTS-'.uniqid(), 'slug' => 'bts-'.uniqid()]);
        $student = Student::create([
            'matricule' => 'T-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif',
            'formation_id' => $formation->id, 'academic_year_id' => $year->id,
        ]);

        return [User::where('email', 'admin@eeht-thies.sn')->first(), $student, $year];
    }

    public function test_the_dashboard_reports_collection_and_overdue_amounts(): void
    {
        [$admin, $student, $year] = $this->bootSchool();

        $inscription = Invoice::create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'type' => 'inscription', 'label' => 'Inscription', 'amount' => 50000, 'due_date' => '2026-09-10']);
        $inscription->payments()->create(['amount' => 50000, 'method' => 'especes', 'paid_at' => now()]);
        Invoice::create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'type' => 'mensualite', 'period_month' => 9, 'label' => 'Mensualité Septembre', 'amount' => 25000, 'due_date' => '2026-09-05']);

        $this->actingAs($admin)->get(route('admin.finance.dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Finance/Dashboard')
            ->where('insight.todayTotal', fn ($v) => (float) $v === 50000.0)
            ->where('insight.todayCount', 1)
            ->where('insight.overdueTotal', fn ($v) => (float) $v === 25000.0)
            ->where('insight.overdueStudents', 1)
            ->where('insight.collectionRate', fn ($v) => (float) $v === 66.7)
            ->has('insight.topOverdue', 1)
            ->has('insight.recent', 1)
            ->has('insight.byType', 4));
    }

    public function test_the_cashier_search_screen_shows_the_day_desk(): void
    {
        [$admin, $student, $year] = $this->bootSchool();

        $invoice = Invoice::create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'type' => 'inscription', 'label' => 'Inscription', 'amount' => 40000]);
        $invoice->payments()->create(['amount' => 40000, 'method' => 'especes', 'paid_at' => now()]);

        $this->actingAs($admin)->get(route('admin.cashier.create'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('desk.count', 1)
            ->where('desk.total', fn ($v) => (float) $v === 40000.0)
            ->has('desk.recent', 1));
    }

    public function test_the_invoice_list_filters_by_status_across_all_pages_and_totals_them(): void
    {
        [$admin, $student, $year] = $this->bootSchool();

        $paid = Invoice::create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'type' => 'inscription', 'label' => 'Inscription', 'amount' => 50000]);
        $paid->payments()->create(['amount' => 50000, 'method' => 'especes', 'paid_at' => now()]);
        $partial = Invoice::create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'type' => 'mensualite', 'period_month' => 9, 'label' => 'Sept', 'amount' => 20000]);
        $partial->payments()->create(['amount' => 5000, 'method' => 'especes', 'paid_at' => now()]);
        Invoice::create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'type' => 'mensualite', 'period_month' => 10, 'label' => 'Oct', 'amount' => 20000]);

        $this->actingAs($admin)->get(route('admin.invoices.index', ['status' => 'partielle']))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('invoices.data', 1)
            ->where('invoices.data.0.label', 'Sept')
            ->where('stats.total', 3)
            ->where('stats.payee', 1)
            ->where('stats.partielle', 1)
            ->where('stats.impayee', 1)
            ->where('stats.invoiced', fn ($v) => (float) $v === 90000.0)
            ->where('stats.collected', fn ($v) => (float) $v === 55000.0)
            ->where('stats.outstanding', fn ($v) => (float) $v === 35000.0));

        $this->actingAs($admin)->get(route('admin.invoices.index', ['status' => 'impayee']))->assertInertia(fn (Assert $page) => $page
            ->has('invoices.data', 1)->where('invoices.data.0.label', 'Oct'));
    }
}
