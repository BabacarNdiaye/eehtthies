<?php

namespace App\Services;

use App\Mail\PaymentReceived;
use App\Models\Payment;
use App\Models\Student;
use App\Support\Receipt;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Avertit la famille d'un encaissement : e-mail (reçu en PDF joint), notification de l'application et message dans
 * EEHT Connect. Chaque canal est indépendant : un échec est journalisé et n'empêche ni les autres canaux ni
 * l'encaissement lui-même.
 */
class PaymentNotifier
{
    public function __construct(private readonly FamilyChannels $family) {}

    /**
     * Ce dont la famille dispose pour être avertie (annoncé à l'opérateur avant tout envoi).
     *
     * @return array{mail: bool, push: bool, connect: bool}
     */
    public function contactsFor(Student $student): array
    {
        return $this->family->available($student);
    }

    /**
     * @param  Collection<int, Payment>  $payments  les paiements d'un même encaissement
     * @return list<string> canaux utilisés parmi « mail », « push » et « connect »
     */
    public function receipt(Collection $payments): array
    {
        $first = $payments->first();

        if (! $first) {
            return [];
        }

        $receipt = Receipt::viewData($first);
        $student = $receipt['student'];
        $used = [];

        if ($address = $this->family->mailAddress($student)) {
            try {
                // Un reçu qu'on n'arrive pas à fabriquer ne doit pas empêcher le message de partir.
                $pdf = rescue(fn () => Receipt::pdf($first)->output());
                Mail::to($address)->send(new PaymentReceived($student, $receipt, $pdf, $this->family->recipientName($student)));
                $used[] = 'mail';
            } catch (Throwable $e) {
                report($e);
            }
        }

        $accounts = $this->family->accounts($student);

        if ($accounts->isEmpty()) {
            return $used;
        }

        $number = $receipt['primary']->receipt_number;
        $summary = number_format($receipt['total'], 0, ',', ' ')." FCFA reçus pour {$student->first_name} — reçu n° {$number}.";

        foreach ($accounts as $user) {
            SafePush::send($user, 'Paiement reçu', $summary, $this->family->invoicesUrl($user, $student));
        }
        $used[] = 'push';

        $posted = false;
        foreach ($accounts as $user) {
            $posted = $this->family->postToConnect($user, "💳 Paiement reçu : {$summary}", ['type' => 'payment_receipt', 'receipt_number' => $number]) || $posted;
        }

        if ($posted) {
            $used[] = 'connect';
        }

        return $used;
    }
}
