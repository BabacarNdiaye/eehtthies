<?php

namespace App\Support;

use App\Models\Payment;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Database\Eloquent\Collection;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Reçu d'un encaissement : tous les paiements enregistrés ensemble (même jeton) tiennent sur un seul document ; un
 * ancien paiement, sans jeton, garde son reçu individuel (sans QR code ni reste à payer).
 */
final class Receipt
{
    /** @return Collection<int, Payment> les paiements du même encaissement, ou le paiement seul pour un ancien reçu */
    public static function batchFor(Payment $payment): Collection
    {
        if ($payment->batch_token) {
            $batch = Payment::where('batch_token', $payment->batch_token)->orderBy('id')->get();

            if ($batch->isNotEmpty()) {
                return $batch;
            }
        }

        return $payment->newCollection([$payment]);
    }

    /** @return array<string, mixed> les données du gabarit `pdf.receipt` et de l'e-mail de reçu */
    public static function viewData(Payment $payment): array
    {
        $payments = self::batchFor($payment)->load('invoice.student', 'receivedBy:id,name');
        $primary = $payments->first();
        $verificationUrl = $primary->batch_token ? route('receipts.verify', $primary->batch_token) : null;

        return [
            'student' => $primary->invoice->student,
            'payments' => $payments,
            'primary' => $primary,
            'total' => round((float) $payments->sum('amount'), 2),
            'channelLabel' => PaymentChannels::labelFor($primary->channel, $primary->method),
            'reference' => $payments->pluck('reference')->filter()->first(),
            'paidAt' => $primary->paid_at,
            'receivedBy' => $primary->receivedBy?->name,
            'showBalance' => $payments->every(fn (Payment $item) => $item->balance_after !== null),
            'verificationUrl' => $verificationUrl,
            'qrCode' => $verificationUrl ? base64_encode(QrCode::format('svg')->size(150)->generate($verificationUrl)) : null,
        ];
    }

    public static function pdf(Payment $payment): DomPdf
    {
        return Pdf::loadView('pdf.receipt', self::viewData($payment));
    }

    public static function filename(Payment $payment): string
    {
        return 'recu-'.self::batchFor($payment)->first()->receipt_number.'.pdf';
    }
}
