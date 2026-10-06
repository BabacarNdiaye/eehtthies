<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Student;
use App\Support\PaymentChannels;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Page publique ouverte par le QR code d'un reçu : elle confirme que le reçu existe, sans révéler plus que ce que le
 * porteur du reçu sait déjà (montant, date, mode, factures) ; l'élève n'y figure que par son prénom et l'initiale de
 * son nom, jamais par son matricule.
 */
class ReceiptVerificationController extends Controller
{
    public function __invoke(string $token): Response
    {
        $payments = strlen($token) === 40
            ? Payment::where('batch_token', $token)
                ->with('invoice:id,label,student_id', 'invoice.student:id,first_name,last_name')
                ->orderBy('id')
                ->get()
            : collect();

        $first = $payments->first();

        return Inertia::render('Public/ReceiptVerification', [
            'receipt' => $first ? [
                'numbers' => $payments->pluck('receipt_number')->values(),
                'total' => round((float) $payments->sum('amount'), 2),
                'channel' => PaymentChannels::labelFor($first->channel, $first->method),
                'paid_at' => $first->paid_at->toDateString(),
                'student' => $this->maskedName($first->invoice->student),
                'invoices' => $payments->map(fn (Payment $payment) => $payment->invoice->label)->values(),
            ] : null,
        ]);
    }

    private function maskedName(?Student $student): string
    {
        if (! $student) {
            return '—';
        }

        return trim($student->first_name.' '.mb_strtoupper(mb_substr((string) $student->last_name, 0, 1)).'.');
    }
}
