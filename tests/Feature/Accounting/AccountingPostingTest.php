<?php

namespace Tests\Feature\Accounting;

use App\Models\Account;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\Student;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tout l'intérêt du module comptable SYSCOHADA est que chaque transaction opérationnelle (facture de
 * scolarité, paiement, dépense) soit reflétée automatiquement par une écriture de journal équilibrée en
 * partie double. Si cela casse silencieusement, le bilan et le compte de résultat deviennent discrètement
 * faux sans que personne ne s'en aperçoive avant qu'un comptable ne rapproche les chiffres à la main — ces
 * tests méritent donc d'être verrouillés.
 */
class AccountingPostingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    private function makeStudent(): Student
    {
        return Student::create([
            'matricule' => 'TEST-'.uniqid(),
            'first_name' => 'Awa',
            'last_name' => 'Test',
        ]);
    }

    public function test_creating_an_invoice_posts_a_balanced_journal_entry(): void
    {
        $student = $this->makeStudent();

        $invoice = Invoice::create([
            'student_id' => $student->id,
            'type' => 'mensualite',
            'label' => 'Mensualité — Janvier',
            'amount' => 50000,
            'discount' => 0,
        ]);

        $entry = JournalEntry::where('entryable_type', Invoice::class)
            ->where('entryable_id', $invoice->id)
            ->first();

        $this->assertNotNull($entry, 'Invoice creation should auto-post a journal entry.');
        $this->assertTrue($entry->isBalanced(), 'Auto-posted entries must always balance (debit = credit).');
        $this->assertEquals(50000.0, $entry->total_debit);

        $clients = Account::where('code', '411000')->first();
        $revenue = Account::where('code', '706200')->first();

        $this->assertEquals(50000.0, $entry->lines()->where('account_id', $clients->id)->sum('debit'));
        $this->assertEquals(50000.0, $entry->lines()->where('account_id', $revenue->id)->sum('credit'));
    }

    public function test_invoice_discount_reduces_the_posted_amount(): void
    {
        $student = $this->makeStudent();

        $invoice = Invoice::create([
            'student_id' => $student->id,
            'type' => 'inscription',
            'label' => "Frais d'inscription",
            'amount' => 100000,
            'discount' => 20000,
        ]);

        $entry = JournalEntry::where('entryable_type', Invoice::class)->where('entryable_id', $invoice->id)->first();

        $this->assertEquals(80000.0, $entry->total_debit);
        $this->assertEquals(80000.0, $entry->total_credit);
    }

    public function test_creating_a_cash_payment_posts_to_caisse_and_clears_the_receivable(): void
    {
        $student = $this->makeStudent();
        $invoice = Invoice::create([
            'student_id' => $student->id,
            'type' => 'mensualite',
            'label' => 'Mensualité',
            'amount' => 30000,
            'discount' => 0,
        ]);

        $payment = Payment::create([
            'invoice_id' => $invoice->id,
            'amount' => 30000,
            'method' => 'especes',
            'paid_at' => now(),
        ]);

        $entry = JournalEntry::where('entryable_type', Payment::class)->where('entryable_id', $payment->id)->first();
        $caisse = Account::where('code', '571000')->first();
        $clients = Account::where('code', '411000')->first();

        $this->assertNotNull($entry);
        $this->assertTrue($entry->isBalanced());
        $this->assertEquals(30000.0, $entry->lines()->where('account_id', $caisse->id)->sum('debit'));
        $this->assertEquals(30000.0, $entry->lines()->where('account_id', $clients->id)->sum('credit'));
    }

    public function test_bank_payment_posts_to_banque_instead_of_caisse(): void
    {
        $student = $this->makeStudent();
        $invoice = Invoice::create([
            'student_id' => $student->id,
            'type' => 'mensualite',
            'label' => 'Mensualité',
            'amount' => 30000,
            'discount' => 0,
        ]);

        $payment = Payment::create([
            'invoice_id' => $invoice->id,
            'amount' => 30000,
            'method' => 'virement',
            'paid_at' => now(),
        ]);

        $entry = JournalEntry::where('entryable_type', Payment::class)->where('entryable_id', $payment->id)->first();
        $banque = Account::where('code', '521000')->first();

        $this->assertEquals(30000.0, $entry->lines()->where('account_id', $banque->id)->sum('debit'));
    }

    public function test_expense_posts_charge_debit_and_treasury_credit(): void
    {
        $expense = Expense::create([
            'category' => 'fournisseurs',
            'label' => 'Achat denrées cuisine',
            'amount' => 15000,
            'expense_date' => now(),
            'payment_method' => 'especes',
        ]);

        $entry = JournalEntry::where('entryable_type', Expense::class)->where('entryable_id', $expense->id)->first();
        $charge = Account::where('code', '601000')->first();
        $caisse = Account::where('code', '571000')->first();

        $this->assertNotNull($entry);
        $this->assertTrue($entry->isBalanced());
        $this->assertEquals(15000.0, $entry->lines()->where('account_id', $charge->id)->sum('debit'));
        $this->assertEquals(15000.0, $entry->lines()->where('account_id', $caisse->id)->sum('credit'));
    }

    public function test_deleting_the_source_record_voids_its_journal_entry(): void
    {
        $expense = Expense::create([
            'category' => 'charges',
            'label' => 'Facture électricité',
            'amount' => 25000,
            'expense_date' => now(),
            'payment_method' => 'virement',
        ]);

        $this->assertDatabaseHas('journal_entries', ['entryable_type' => Expense::class, 'entryable_id' => $expense->id]);

        $expense->delete();

        $this->assertDatabaseMissing('journal_entries', ['entryable_type' => Expense::class, 'entryable_id' => $expense->id]);
    }

    public function test_updating_invoice_amount_updates_the_existing_entry_instead_of_duplicating(): void
    {
        $student = $this->makeStudent();
        $invoice = Invoice::create([
            'student_id' => $student->id,
            'type' => 'mensualite',
            'label' => 'Mensualité',
            'amount' => 30000,
            'discount' => 0,
        ]);

        $invoice->update(['amount' => 45000]);

        $entries = JournalEntry::where('entryable_type', Invoice::class)->where('entryable_id', $invoice->id)->get();

        $this->assertCount(1, $entries, 'An amount correction should update the existing entry, not create a second one.');
        $this->assertEquals(45000.0, $entries->first()->total_debit);
    }
}
