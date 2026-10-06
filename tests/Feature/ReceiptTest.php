<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Services\PaymentRecorder;
use App\Support\Receipt;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Un encaissement qui règle plusieurs factures donne un seul reçu, avec un QR code que n'importe qui peut scanner
 * pour vérifier qu'il est authentique. Les anciens reçus (un paiement, sans jeton) continuent de s'imprimer.
 */
class ReceiptTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    private User $pupil;

    private User $parent;

    private Collection $batch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(AccountingSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->pupil = User::factory()->create();
        $this->pupil->assignRole('eleve');
        $this->parent = User::factory()->create();
        $this->parent->assignRole('parent');
        $this->student = Student::create([
            'matricule' => 'E-100', 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif',
            'user_id' => $this->pupil->id, 'parent_user_id' => $this->parent->id,
        ]);

        $first = $this->invoice('Mensualité — Septembre');
        $second = $this->invoice('Mensualité — Octobre');
        $this->batch = app(PaymentRecorder::class)->record($this->student, [$first->id => 25000, $second->id => 10000], 'wave', '2026-10-06', 'WV-1');
    }

    private function invoice(string $label): Invoice
    {
        return Invoice::create(['student_id' => $this->student->id, 'type' => 'mensualite', 'label' => $label, 'amount' => 25000]);
    }

    private function legacyPayment(): Payment
    {
        $invoice = $this->invoice('Frais divers');

        return $invoice->payments()->create(['amount' => 5000, 'method' => 'especes', 'paid_at' => '2026-10-01']);
    }

    public function test_a_batch_receipt_covers_every_payment_of_the_encaissement(): void
    {
        $data = Receipt::viewData($this->batch->last());

        $this->assertCount(2, $data['payments']);
        $this->assertEquals(35000.0, $data['total']);
        $this->assertSame($this->batch->first()->receipt_number, $data['primary']->receipt_number);
        $this->assertSame('Wave', $data['channelLabel']);
        $this->assertSame('WV-1', $data['reference']);
        $this->assertSame(route('receipts.verify', $this->batch->first()->batch_token), $data['verificationUrl']);
        $this->assertSame(Receipt::batchFor($this->batch->first())->pluck('id')->all(), $this->batch->pluck('id')->all());
    }

    public function test_the_rendered_receipt_lists_the_invoices_and_carries_a_qr_code(): void
    {
        $html = view('pdf.receipt', Receipt::viewData($this->batch->first()))->render();

        $this->assertStringContainsString('Mensualité — Septembre', $html);
        $this->assertStringContainsString('Mensualité — Octobre', $html);
        $this->assertStringContainsString($this->batch->first()->receipt_number, $html);
        $this->assertStringContainsString('data:image/svg+xml;base64,', $html);
        $this->assertStringContainsString('35 000', $html);
    }

    public function test_an_old_receipt_prints_without_qr_code_or_remaining_balance(): void
    {
        $payment = $this->legacyPayment();
        $data = Receipt::viewData($payment);

        $this->assertNull($data['verificationUrl']);
        $this->assertCount(1, Receipt::batchFor($payment));

        $html = view('pdf.receipt', $data)->render();

        $this->assertStringContainsString($payment->receipt_number, $html);
        $this->assertStringNotContainsString('data:image/svg+xml', $html);
    }

    public function test_the_admin_receipt_route_serves_the_grouped_pdf(): void
    {
        $admin = User::where('email', 'admin@eeht-thies.sn')->first();
        $payment = $this->batch->first();

        $this->actingAs($admin)
            ->get(route('admin.invoices.payments.receipt', [$payment->invoice_id, $payment->id]))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_the_student_and_parent_receipt_routes_serve_the_grouped_pdf(): void
    {
        $payment = $this->batch->first();

        $this->actingAs($this->pupil)
            ->get(route('student.invoices.receipt', [$payment->invoice_id, $payment->id]))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($this->parent)
            ->get(route('parent.invoices.receipt', [$this->student->id, $payment->invoice_id, $payment->id]))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $otherParent = User::factory()->create();
        $otherParent->assignRole('parent');
        $this->actingAs($otherParent)
            ->get(route('parent.invoices.receipt', [$this->student->id, $payment->invoice_id, $payment->id]))
            ->assertForbidden();
    }

    public function test_a_known_token_confirms_the_receipt_without_the_full_name_or_matricule(): void
    {
        $token = $this->batch->first()->batch_token;

        $this->get(route('receipts.verify', $token))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Public/ReceiptVerification')
                ->where('receipt.student', 'Awa D.')
                ->where('receipt.total', fn ($total) => (float) $total === 35000.0)
                ->where('receipt.channel', 'Wave')
                ->where('receipt.paid_at', '2026-10-06')
                ->has('receipt.numbers', 2)
                ->has('receipt.invoices', 2)
                ->missing('receipt.matricule')
                ->missing('receipt.student_id'));
    }

    public function test_an_unknown_token_or_an_old_receipt_cannot_be_verified(): void
    {
        $this->get(route('receipts.verify', str_repeat('x', 40)))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Public/ReceiptVerification')->where('receipt', null));

        $this->get(route('receipts.verify', 'court'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('receipt', null));
    }
}
