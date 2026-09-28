<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\SalaryPayment;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Recording a salary payment must simultaneously create a matching Expense
 * (so payroll costs show up in Finance and the accounting ledger), and
 * cancelling it must remove both sides together — otherwise the books and
 * the payroll page silently disagree.
 */
class SalaryPaymentTest extends TestCase
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

    public function test_recording_a_salary_payment_creates_a_linked_expense(): void
    {
        $this->actingAsAdmin();
        $staff = User::factory()->create(['monthly_salary' => 250000]);
        $staff->assignRole('comptable');

        $response = $this->post(route('admin.salaries.store'), [
            'user_id' => $staff->id,
            'period_year' => 2026,
            'period_month' => 1,
            'amount' => 250000,
            'paid_at' => '2026-01-31',
            'payment_method' => 'virement',
        ]);

        $response->assertSessionHasNoErrors();

        $salaryPayment = SalaryPayment::where('user_id', $staff->id)->first();
        $this->assertNotNull($salaryPayment);
        $this->assertNotNull($salaryPayment->expense_id);

        $expense = Expense::find($salaryPayment->expense_id);
        $this->assertNotNull($expense);
        $this->assertEquals('salaires', $expense->category);
        $this->assertEquals(250000.0, (float) $expense->amount);
    }

    public function test_cannot_record_two_salary_payments_for_the_same_staff_and_month(): void
    {
        $this->actingAsAdmin();
        $staff = User::factory()->create(['monthly_salary' => 100000]);

        $payload = [
            'user_id' => $staff->id,
            'period_year' => 2026,
            'period_month' => 3,
            'amount' => 100000,
            'paid_at' => '2026-03-31',
            'payment_method' => 'especes',
        ];

        $this->post(route('admin.salaries.store'), $payload);
        $this->post(route('admin.salaries.store'), $payload);

        $this->assertEquals(1, SalaryPayment::where('user_id', $staff->id)->where('period_month', 3)->count());
    }

    public function test_deleting_a_salary_payment_also_deletes_its_linked_expense(): void
    {
        $this->actingAsAdmin();
        $staff = User::factory()->create(['monthly_salary' => 150000]);

        $this->post(route('admin.salaries.store'), [
            'user_id' => $staff->id,
            'period_year' => 2026,
            'period_month' => 5,
            'amount' => 150000,
            'paid_at' => '2026-05-31',
            'payment_method' => 'virement',
        ]);

        $salaryPayment = SalaryPayment::where('user_id', $staff->id)->first();
        $expenseId = $salaryPayment->expense_id;

        $this->delete(route('admin.salaries.destroy', $salaryPayment->id));

        $this->assertDatabaseMissing('salary_payments', ['id' => $salaryPayment->id]);
        $this->assertDatabaseMissing('expenses', ['id' => $expenseId]);
    }
}
