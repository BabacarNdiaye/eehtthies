<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Support\PaymentChannels;
use App\Support\PaymentException;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seul chemin d'écriture d'une somme encaissée : guichet, fiche facture et (plus tard) paiement en ligne. Tout se joue
 * dans une transaction, les factures verrouillées : deux encaissements simultanés ne peuvent pas dépasser le même
 * solde, et le refus d'une facture annule tout l'encaissement. Les paiements d'un même encaissement partagent un jeton
 * (un reçu, un QR code) et gardent ce qu'il reste à payer après eux.
 */
class PaymentRecorder
{
    /**
     * @param  array<int, int|float|string>  $allocations  identifiant de facture => montant encaissé
     * @return Collection<int, Payment> les paiements créés, dans l'ordre des factures
     *
     * @throws PaymentException
     */
    public function record(
        Student $student,
        array $allocations,
        string $channel,
        CarbonInterface|string $paidAt,
        ?string $reference = null,
        ?User $receivedBy = null,
        ?string $notes = null,
    ): Collection {
        if (! PaymentChannels::isAccepted($channel)) {
            throw new PaymentException('Mode de paiement inconnu.');
        }

        $amounts = collect($allocations)
            ->map(fn ($amount) => PaymentAllocator::cents($amount))
            ->filter(fn (int $cents) => $cents > 0);

        if ($amounts->isEmpty()) {
            throw new PaymentException('Aucun montant à encaisser.');
        }

        return DB::transaction(function () use ($student, $amounts, $channel, $paidAt, $reference, $receivedBy, $notes) {
            $invoices = Invoice::whereIn('id', $amounts->keys())
                ->where('student_id', $student->id)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($invoices->count() !== $amounts->count()) {
                throw new PaymentException("Une des factures n'appartient pas à cet élève.");
            }

            $token = Str::random(40);
            $payments = collect();

            foreach ($amounts as $invoiceId => $cents) {
                $invoice = $invoices[$invoiceId];
                $balanceCents = PaymentAllocator::cents($invoice->balance);

                if ($cents > $balanceCents) {
                    throw new PaymentException(sprintf(
                        'Le montant encaissé pour « %s » (%s FCFA) dépasse son solde (%s FCFA).',
                        $invoice->label,
                        self::fcfa($cents),
                        self::fcfa(max($balanceCents, 0)),
                    ));
                }

                $payments->push($invoice->payments()->create([
                    'amount' => $cents / 100,
                    'balance_after' => ($balanceCents - $cents) / 100,
                    'method' => PaymentChannels::methodFor($channel),
                    'channel' => PaymentChannels::channelFor($channel),
                    'reference' => $reference,
                    'batch_token' => $token,
                    'paid_at' => $paidAt,
                    'notes' => $notes,
                    'received_by' => $receivedBy?->id,
                ]));
            }

            return $payments;
        });
    }

    private static function fcfa(int $cents): string
    {
        return number_format($cents / 100, 0, ',', ' ');
    }
}
