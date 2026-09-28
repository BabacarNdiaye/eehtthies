<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Teacher;
use App\Models\TeacherSalaryPayment;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Mirrors SalaryPaymentTest but for teachers, who are paid either a fixed
 * monthly salary or by the hour (Teacher::payment_type) via a separate
 * teacher_salary_payments table — kept separate from salary_payments rather
 * than making user_id nullable there, since altering an existing column
 * needs doctrine/dbal (not installed) and this was safer to deploy without
 * SSH/CLI access to production anyway.
 */
class TeacherSalaryPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function actingAsAdmin(): User
    {
        $admin = User::where('email', 'admin@eeht-thies.sn')->first();
        $this->actingAs($admin);

        return $admin;
    }

    public function test_recording_a_fixed_salary_teacher_payment_creates_a_linked_expense(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::create([
            'matricule' => 'PROF-1', 'first_name' => 'Fatou', 'last_name' => 'Ba',
            'status' => 'actif', 'payment_type' => 'fixe', 'monthly_salary' => 300000,
        ]);

        $response = $this->post(route('admin.salaries.store'), [
            'teacher_id' => $teacher->id,
            'period_year' => 2026,
            'period_month' => 1,
            'amount' => 300000,
            'paid_at' => '2026-01-31',
            'payment_method' => 'virement',
        ]);

        $response->assertSessionHasNoErrors();

        $payment = TeacherSalaryPayment::where('teacher_id', $teacher->id)->first();
        $this->assertNotNull($payment);
        $this->assertNull($payment->hours_worked);

        $expense = Expense::find($payment->expense_id);
        $this->assertNotNull($expense);
        $this->assertEquals('salaires', $expense->category);
        $this->assertEquals(300000.0, (float) $expense->amount);
    }

    public function test_recording_an_hourly_teacher_payment_stores_the_hours_worked(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::create([
            'matricule' => 'PROF-2', 'first_name' => 'Moussa', 'last_name' => 'Sarr',
            'status' => 'actif', 'payment_type' => 'horaire', 'hourly_rate' => 5000,
        ]);

        $this->post(route('admin.salaries.store'), [
            'teacher_id' => $teacher->id,
            'period_year' => 2026,
            'period_month' => 2,
            'hours_worked' => 24,
            'amount' => 120000, // 24h * 5000
            'paid_at' => '2026-02-28',
            'payment_method' => 'especes',
        ])->assertSessionHasNoErrors();

        $payment = TeacherSalaryPayment::where('teacher_id', $teacher->id)->first();
        $this->assertEquals(24.0, (float) $payment->hours_worked);
        $this->assertEquals(120000.0, (float) $payment->amount);
    }

    public function test_cannot_record_two_teacher_payments_for_the_same_month(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::create([
            'matricule' => 'PROF-3', 'first_name' => 'Awa', 'last_name' => 'Diop',
            'status' => 'actif', 'payment_type' => 'fixe', 'monthly_salary' => 200000,
        ]);

        $payload = [
            'teacher_id' => $teacher->id,
            'period_year' => 2026,
            'period_month' => 3,
            'amount' => 200000,
            'paid_at' => '2026-03-31',
            'payment_method' => 'virement',
        ];

        $this->post(route('admin.salaries.store'), $payload);
        $this->post(route('admin.salaries.store'), $payload);

        $this->assertEquals(1, TeacherSalaryPayment::where('teacher_id', $teacher->id)->where('period_month', 3)->count());
    }

    public function test_deleting_a_teacher_payment_also_deletes_its_linked_expense(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::create([
            'matricule' => 'PROF-4', 'first_name' => 'Ousmane', 'last_name' => 'Diallo',
            'status' => 'actif', 'payment_type' => 'fixe', 'monthly_salary' => 180000,
        ]);

        $this->post(route('admin.salaries.store'), [
            'teacher_id' => $teacher->id,
            'period_year' => 2026,
            'period_month' => 4,
            'amount' => 180000,
            'paid_at' => '2026-04-30',
            'payment_method' => 'virement',
        ]);

        $payment = TeacherSalaryPayment::where('teacher_id', $teacher->id)->first();
        $expenseId = $payment->expense_id;

        $this->delete(route('admin.salaries.destroyTeacherPayment', $payment->id));

        $this->assertDatabaseMissing('teacher_salary_payments', ['id' => $payment->id]);
        $this->assertDatabaseMissing('expenses', ['id' => $expenseId]);
    }

    public function test_the_salary_index_page_lists_both_admin_staff_and_teachers(): void
    {
        $this->actingAsAdmin();
        Teacher::create([
            'matricule' => 'PROF-5', 'first_name' => 'Ndeye', 'last_name' => 'Faye',
            'status' => 'actif', 'payment_type' => 'horaire', 'hourly_rate' => 4500,
        ]);

        $response = $this->get(route('admin.salaries.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Salaries/Index')
            ->where('paymentTypes.horaire', 'Taux horaire')
        );
    }
}
