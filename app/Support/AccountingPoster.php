<?php

namespace App\Support;

use App\Models\Account;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

/**
 * Reporte automatiquement les transactions opérationnelles (factures de scolarité, paiements, dépenses) dans
 * le grand livre comptable en partie double, afin que le plan comptable, le grand livre, le bilan et le
 * compte de résultat reflètent toujours l'activité réelle de l'école sans que le comptable ait à ressaisir
 * chaque transaction.
 *
 * Les écritures créées ici sont marquées is_auto=true et rattachées à leur enregistrement source par la
 * relation morph entryable. Pour en corriger une, modifiez ou supprimez la Invoice, le Payment ou la Expense
 * source — l'écriture liée suit.
 */
class AccountingPoster
{
    private const REVENUE_ACCOUNTS = [
        'inscription' => '706100',
        'scolarite' => '706200',
        'mensualite' => '706200',
        'autre' => '707000',
    ];

    private const EXPENSE_ACCOUNTS = [
        'salaires' => '661000',
        'fournisseurs' => '601000',
        'achats' => '601000',
        'charges' => '628000',
        'maintenance' => '615000',
        'transport' => '624000',
        'evenements' => '623000',
        'autres' => '628000',
    ];

    public static function postInvoice(Invoice $invoice): void
    {
        $net = round((float) $invoice->amount - (float) $invoice->discount, 2);

        if ($net <= 0) {
            return;
        }

        $revenueCode = self::REVENUE_ACCOUNTS[$invoice->type] ?? '707000';

        self::upsertEntry($invoice, Journal::where('code', 'VTE')->first(), $invoice->created_at?->toDateString() ?? now()->toDateString(), "Facture {$invoice->reference} — {$invoice->label}", [
            ['account' => '411000', 'debit' => $net, 'credit' => 0],
            ['account' => $revenueCode, 'debit' => 0, 'credit' => $net],
        ]);
    }

    public static function postPayment(Payment $payment): void
    {
        $amount = (float) $payment->amount;

        if ($amount <= 0) {
            return;
        }

        $treasuryCode = $payment->method === 'especes' ? '571000' : '521000';
        $journalCode = $payment->method === 'especes' ? 'CAI' : 'BQ';

        self::upsertEntry($payment, Journal::where('code', $journalCode)->first(), $payment->paid_at?->toDateString() ?? now()->toDateString(), "Encaissement {$payment->receipt_number}", [
            ['account' => $treasuryCode, 'debit' => $amount, 'credit' => 0],
            ['account' => '411000', 'debit' => 0, 'credit' => $amount],
        ]);
    }

    public static function postExpense(Expense $expense): void
    {
        $amount = (float) $expense->amount;

        if ($amount <= 0) {
            return;
        }

        $chargeCode = self::EXPENSE_ACCOUNTS[$expense->category] ?? '628000';
        $treasuryCode = $expense->payment_method === 'especes' ? '571000' : '521000';
        $journalCode = $expense->payment_method === 'especes' ? 'CAI' : 'BQ';

        self::upsertEntry($expense, Journal::where('code', $journalCode)->first(), $expense->expense_date?->toDateString() ?? now()->toDateString(), "Dépense — {$expense->label}", [
            ['account' => $chargeCode, 'debit' => $amount, 'credit' => 0],
            ['account' => $treasuryCode, 'debit' => 0, 'credit' => $amount],
        ]);
    }

    public static function void($entryable): void
    {
        JournalEntry::where('entryable_type', $entryable::class)
            ->where('entryable_id', $entryable->id)
            ->where('is_auto', true)
            ->get()
            ->each(fn (JournalEntry $entry) => $entry->delete());
    }

    /** Crée l'écriture générée automatiquement pour un enregistrement source, ou met à jour ses lignes si elle existe déjà (idempotent). */
    private static function upsertEntry($entryable, ?Journal $journal, string $date, string $description, array $lines): void
    {
        if (! $journal) {
            return;
        }

        DB::transaction(function () use ($entryable, $journal, $date, $description, $lines) {
            $entry = JournalEntry::where('entryable_type', $entryable::class)
                ->where('entryable_id', $entryable->id)
                ->where('is_auto', true)
                ->first();

            if (! $entry) {
                $entry = JournalEntry::create([
                    'journal_id' => $journal->id,
                    'entry_date' => $date,
                    'description' => $description,
                    'entryable_type' => $entryable::class,
                    'entryable_id' => $entryable->id,
                    'is_auto' => true,
                ]);
            } else {
                $entry->update(['journal_id' => $journal->id, 'entry_date' => $date, 'description' => $description]);
                $entry->lines()->delete();
            }

            foreach ($lines as $line) {
                $account = Account::where('code', $line['account'])->first();

                if (! $account) {
                    continue;
                }

                $entry->lines()->create([
                    'account_id' => $account->id,
                    'label' => $description,
                    'debit' => $line['debit'],
                    'credit' => $line['credit'],
                ]);
            }
        });
    }
}
