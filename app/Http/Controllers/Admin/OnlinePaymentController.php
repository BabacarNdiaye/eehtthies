<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Payments\PaymentGateways;
use App\Services\OnlinePayments;
use App\Support\PaymentChannels;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Suivi des paiements en ligne pour la comptabilité : le pilote actif, chaque tentative avec son état, et surtout les
 * anomalies (somme différente, facture déjà réglée) qui n'ont rien encaissé et demandent une vérification chez le
 * fournisseur. « Réconcilier » interroge le fournisseur et expire les tentatives oubliées sans attendre la tâche planifiée.
 */
class OnlinePaymentController extends Controller
{
    public function index(PaymentGateways $gateways): Response
    {
        $counts = PaymentAttempt::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $page = PaymentAttempt::with('student:id,first_name,last_name,matricule')->orderByDesc('id')->paginate(25);

        // Le reçu de chaque paiement de la page : le premier paiement de son lot (un lot = un reçu), sans lire les autres pages.
        $firstPayments = Payment::whereIn('batch_token', $page->getCollection()->pluck('batch_token')->filter()->values())
            ->orderBy('id')->get()->unique('batch_token')->keyBy('batch_token');

        $attempts = $page
            ->through(function (PaymentAttempt $attempt) use ($firstPayments) {
                $payment = $attempt->batch_token ? $firstPayments->get($attempt->batch_token) : null;

                return [
                    'id' => $attempt->id,
                    'reference' => $attempt->reference,
                    'student_id' => $attempt->student_id,
                    'student_name' => $attempt->student->full_name,
                    'matricule' => $attempt->student->matricule,
                    'amount' => (float) $attempt->amount,
                    'channel_label' => PaymentChannels::label($attempt->channel),
                    'status' => $attempt->status,
                    'status_label' => $attempt->status_label,
                    'note' => $attempt->note,
                    'created_at' => $attempt->created_at->toIso8601String(),
                    'settled_at' => $attempt->settled_at?->toIso8601String(),
                    'receipt_url' => $payment ? route('admin.invoices.payments.receipt', [$payment->invoice_id, $payment->id], false) : null,
                    'status_url' => route('payments.show', $attempt, false),
                ];
            });

        $active = $gateways->active();

        return Inertia::render('Admin/OnlinePayments/Index', [
            'driver' => [
                'name' => $gateways->name(),
                'active' => $active !== null,
                'simulation' => $active?->name() === 'simulation',
                'refusal' => $gateways->refusal(),
            ],
            'attempts' => $attempts,
            'counts' => [
                'succeeded' => (int) ($counts[PaymentAttempt::SUCCEEDED] ?? 0),
                'pending' => (int) (($counts[PaymentAttempt::PENDING] ?? 0) + ($counts[PaymentAttempt::INITIATED] ?? 0)),
                'anomaly' => (int) ($counts[PaymentAttempt::ANOMALY] ?? 0),
                'failed' => (int) (($counts[PaymentAttempt::FAILED] ?? 0) + ($counts[PaymentAttempt::EXPIRED] ?? 0)),
            ],
        ]);
    }

    public function reconcile(OnlinePayments $online): RedirectResponse
    {
        $result = $online->reconcile();

        return back()->with('success', sprintf(
            'Réconciliation terminée : %d paiement(s) confirmé(s), %d tentative(s) expirée(s).',
            $result['settled'],
            $result['expired'],
        ));
    }
}
