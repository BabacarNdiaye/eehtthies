<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Services\PaymentRecorder;
use App\Support\PaymentException;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * Toute somme encaissée passe par PaymentRecorder (guichet, fiche facture, plus tard paiement en ligne) : un seul
 * endroit où le solde est vérifié sous verrou, où le lot d'un même encaissement reçoit son jeton et où le canal est
 * ramené à la famille de la base. Une erreur ici fausse les soldes des familles et la comptabilité.
 */
class PaymentRecorderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    private function student(): Student
    {
        return Student::create(['matricule' => 'T-'.uniqid(), 'first_name' => 'Awa', 'last_name' => 'Diop', 'status' => 'actif']);
    }

    private function invoice(Student $student, float $amount = 25000, string $label = 'Mensualité', float $discount = 0): Invoice
    {
        return Invoice::create([
            'student_id' => $student->id, 'type' => 'mensualite', 'label' => $label, 'amount' => $amount, 'discount' => $discount,
        ]);
    }

    public function test_it_records_one_payment_per_invoice_under_a_shared_batch_token(): void
    {
        $student = $this->student();
        $first = $this->invoice($student, 25000, 'Mensualité — Septembre');
        $second = $this->invoice($student, 25000, 'Mensualité — Octobre');
        $cashier = User::factory()->create();

        $payments = app(PaymentRecorder::class)->record(
            $student, [$first->id => 25000, $second->id => 10000], 'wave', '2026-10-06', 'WV-1', $cashier, 'Reçu au guichet',
        );

        $this->assertCount(2, $payments);
        $this->assertCount(1, $payments->pluck('batch_token')->unique());
        $this->assertSame(40, strlen($payments->first()->batch_token));
        $this->assertSame(['mobile_money'], $payments->pluck('method')->unique()->values()->all());
        $this->assertSame(['wave'], $payments->pluck('channel')->unique()->values()->all());
        $this->assertSame(['WV-1'], $payments->pluck('reference')->unique()->values()->all());
        $this->assertEquals([0.0, 15000.0], $payments->map(fn (Payment $payment) => (float) $payment->balance_after)->all());
        $this->assertSame($cashier->id, $payments->first()->received_by);
        $this->assertSame('2026-10-06', $payments->first()->paid_at->toDateString());
        $this->assertEquals(0.0, $first->fresh()->balance);
        $this->assertEquals(15000.0, $second->fresh()->balance);
    }

    public function test_an_amount_above_the_balance_is_refused_and_nothing_is_recorded(): void
    {
        $student = $this->student();
        $first = $this->invoice($student);
        $second = $this->invoice($student);

        try {
            app(PaymentRecorder::class)->record($student, [$first->id => 25000, $second->id => 30000], 'especes', '2026-10-06');
            $this->fail('Un trop-perçu aurait dû être refusé.');
        } catch (PaymentException $e) {
            $this->assertStringContainsString('solde', $e->getMessage());
        }

        $this->assertSame(0, Payment::count(), 'Le premier paiement ne doit pas survivre au refus du second.');
    }

    public function test_the_balance_takes_the_discount_into_account(): void
    {
        $student = $this->student();
        $invoice = $this->invoice($student, 30000, 'Mensualité', 5000);

        $this->expectException(PaymentException::class);

        app(PaymentRecorder::class)->record($student, [$invoice->id => 25001], 'especes', '2026-10-06');
    }

    public function test_an_invoice_of_another_student_is_refused(): void
    {
        $student = $this->student();
        $theirs = $this->invoice($this->student());

        try {
            app(PaymentRecorder::class)->record($student, [$theirs->id => 1000], 'especes', '2026-10-06');
            $this->fail("La facture d'un autre élève aurait dû être refusée.");
        } catch (PaymentException) {
            $this->assertSame(0, Payment::count());
        }
    }

    public function test_an_unknown_channel_or_an_empty_allocation_is_refused(): void
    {
        $student = $this->student();
        $invoice = $this->invoice($student);
        $recorder = app(PaymentRecorder::class);

        $attempts = [
            'canal inconnu' => fn () => $recorder->record($student, [$invoice->id => 1000], 'bitcoin', '2026-10-06'),
            'aucune répartition' => fn () => $recorder->record($student, [], 'especes', '2026-10-06'),
            'montant nul' => fn () => $recorder->record($student, [$invoice->id => 0], 'especes', '2026-10-06'),
        ];

        foreach ($attempts as $case => $attempt) {
            try {
                $attempt();
                $this->fail("Le cas « {$case} » aurait dû être refusé.");
            } catch (PaymentException) {
                $this->addToAssertionCount(1);
            }
        }

        $this->assertSame(0, Payment::count());
    }

    public function test_a_second_encaissement_cannot_exceed_what_is_left(): void
    {
        $student = $this->student();
        $invoice = $this->invoice($student);
        $recorder = app(PaymentRecorder::class);

        $recorder->record($student, [$invoice->id => 20000], 'especes', '2026-10-06');

        $this->expectException(PaymentException::class);

        $recorder->record($student, [$invoice->id => 6000], 'especes', '2026-10-07');
    }

    public function test_payments_post_to_the_cash_or_the_bank_account_according_to_the_channel(): void
    {
        $student = $this->student();
        $cash = $this->invoice($student, 10000);
        $mobile = $this->invoice($student, 20000);
        $recorder = app(PaymentRecorder::class);

        $cashPayment = $recorder->record($student, [$cash->id => 10000], 'especes', '2026-10-06')->first();
        $mobilePayment = $recorder->record($student, [$mobile->id => 20000], 'orange_money', '2026-10-06')->first();

        $caisse = Account::where('code', '571000')->first();
        $banque = Account::where('code', '521000')->first();
        $cashEntry = JournalEntry::where('entryable_type', Payment::class)->where('entryable_id', $cashPayment->id)->first();
        $mobileEntry = JournalEntry::where('entryable_type', Payment::class)->where('entryable_id', $mobilePayment->id)->first();

        $this->assertEquals(10000.0, $cashEntry->lines()->where('account_id', $caisse->id)->sum('debit'));
        $this->assertEquals(20000.0, $mobileEntry->lines()->where('account_id', $banque->id)->sum('debit'));
    }

    public function test_an_old_family_value_is_still_accepted_as_a_channel(): void
    {
        $student = $this->student();
        $invoice = $this->invoice($student);

        $payment = app(PaymentRecorder::class)->record($student, [$invoice->id => 5000], 'mobile_money', '2026-10-06')->first();

        $this->assertSame('mobile_money', $payment->method);
        $this->assertNull($payment->channel);
    }

    public function test_the_batch_token_never_reaches_the_activity_log(): void
    {
        $student = $this->student();
        $invoice = $this->invoice($student);

        $payment = app(PaymentRecorder::class)->record($student, [$invoice->id => 5000], 'wave', '2026-10-06', 'WV-9')->first();
        $token = $payment->batch_token;
        $payment->update(['notes' => 'Corrigé', 'batch_token' => str_repeat('x', 40)]);

        $entries = Activity::where('subject_type', Payment::class)->where('subject_id', $payment->id)->get();
        $logged = $entries->map(fn (Activity $entry) => $entry->attribute_changes->toJson(JSON_UNESCAPED_UNICODE))->implode(' ');

        $this->assertCount(2, $entries, 'création puis modification');
        $this->assertStringContainsString('WV-9', $logged, 'le journal garde les autres champs');
        $this->assertStringContainsString('Corrigé', $logged);
        $this->assertStringNotContainsString('batch_token', $logged);
        $this->assertStringNotContainsString($token, $logged);
        $this->assertStringNotContainsString(str_repeat('x', 40), $logged);
    }
}
