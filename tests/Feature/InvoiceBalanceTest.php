<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Student;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The invoice balance/status accessors drive the "impayée / partielle /
 * payée" badges parents and staff rely on across the tuition-tracking pages
 * — getting the arithmetic wrong here misreports who actually owes money.
 */
class InvoiceBalanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    private function makeInvoice(float $amount, float $discount = 0): Invoice
    {
        $student = Student::create([
            'matricule' => 'TEST-'.uniqid(),
            'first_name' => 'Awa',
            'last_name' => 'Test',
        ]);

        return Invoice::create([
            'student_id' => $student->id,
            'type' => 'mensualite',
            'label' => 'Mensualité',
            'amount' => $amount,
            'discount' => $discount,
        ]);
    }

    public function test_unpaid_invoice_has_full_balance_and_impayee_status(): void
    {
        $invoice = $this->makeInvoice(50000);

        $this->assertEquals(50000.0, $invoice->balance);
        $this->assertEquals('impayee', $invoice->status);
    }

    public function test_partial_payment_leaves_a_remaining_balance_and_partielle_status(): void
    {
        $invoice = $this->makeInvoice(50000);
        $invoice->payments()->create(['amount' => 20000, 'method' => 'especes', 'paid_at' => now()]);

        $this->assertEquals(30000.0, $invoice->fresh()->balance);
        $this->assertEquals('partielle', $invoice->fresh()->status);
    }

    public function test_full_payment_clears_the_balance_and_marks_payee(): void
    {
        $invoice = $this->makeInvoice(50000);
        $invoice->payments()->create(['amount' => 50000, 'method' => 'virement', 'paid_at' => now()]);

        $this->assertEquals(0.0, $invoice->fresh()->balance);
        $this->assertEquals('payee', $invoice->fresh()->status);
    }

    public function test_discount_reduces_the_net_amount_owed(): void
    {
        $invoice = $this->makeInvoice(100000, 25000);

        $this->assertEquals(75000.0, $invoice->net_amount);
        $this->assertEquals(75000.0, $invoice->balance);
    }

    public function test_overpaying_never_produces_a_negative_displayed_balance_status_mismatch(): void
    {
        $invoice = $this->makeInvoice(50000);
        $invoice->payments()->create(['amount' => 60000, 'method' => 'especes', 'paid_at' => now()]);

        // Balance can go negative (credit in favour of the student), but it must never
        // still read as "impayée"/"partielle" once fully covered.
        $this->assertEquals('payee', $invoice->fresh()->status);
    }
}
