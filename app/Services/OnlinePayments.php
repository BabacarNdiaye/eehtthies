<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\PaymentAttempt;
use App\Models\Student;
use App\Models\User;
use App\Payments\GatewayEvent;
use App\Payments\PaymentGateways;
use App\Support\PaymentChannels;
use App\Support\PaymentException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Paiement en ligne, indépendant du fournisseur. Démarrer : on vérifie ce que le payeur veut régler (ses propres factures,
 * jamais plus que leur solde) et on lui donne l'adresse du fournisseur. Confirmer : la notification authentifiée du
 * fournisseur est appliquée UNE fois (la tentative est verrouillée, la rejouer ne change rien) par le même
 * PaymentRecorder que le guichet, puis la famille reçoit son reçu. Tout ce qui est douteux — somme différente, facture
 * déjà réglée entre-temps — n'est jamais encaissé : la tentative passe « à vérifier » et le personnel en est averti.
 */
class OnlinePayments
{
    public function __construct(
        private readonly PaymentGateways $gateways,
        private readonly PaymentRecorder $recorder,
        private readonly PaymentNotifier $notifier,
        private readonly FamilyChannels $family,
    ) {}

    public function enabled(): bool
    {
        return $this->gateways->active() !== null;
    }

    /**
     * Ce que les espaces élève et parent reçoivent pour afficher « Payer en ligne » : null tant qu'aucun pilote n'est actif.
     *
     * @return array{start_url: string, channels: array<string, string>}|null
     */
    public function forPortal(string $startUrl): ?array
    {
        $gateway = $this->gateways->active();

        return $gateway ? ['start_url' => $startUrl, 'channels' => $gateway->channels()] : null;
    }

    /**
     * Démarre un paiement : `$amount` est réparti sur les factures choisies, les plus anciennes échéances d'abord.
     *
     * @param  list<int|string>  $invoiceIds
     *
     * @throws PaymentException
     */
    public function start(Student $student, array $invoiceIds, float $amount, string $channel, ?User $by = null): PaymentAttempt
    {
        $gateway = $this->gateways->active() ?? throw new PaymentException("Le paiement en ligne n'est pas disponible pour le moment.");

        if (! array_key_exists($channel, $gateway->channels())) {
            throw new PaymentException("Ce mode de paiement n'est pas proposé.");
        }

        $ids = collect($invoiceIds)->map(fn ($id) => (int) $id)->unique()->values();
        $open = Invoice::openForStudent($student)->whereIn('id', $ids)->values();

        if ($ids->isEmpty() || $open->count() !== $ids->count()) {
            throw new PaymentException("Une des factures choisies n'est pas à payer (déjà réglée, ou celle d'un autre élève).");
        }

        if (PaymentAllocator::cents($amount) <= 0) {
            throw new PaymentException('Le montant doit être supérieur à zéro.');
        }

        $split = PaymentAllocator::allocate($open->mapWithKeys(fn (Invoice $invoice) => [$invoice->id => $invoice->computed_balance])->all(), $amount);

        if ($split['leftover'] > 0) {
            throw new PaymentException(sprintf(
                'Le montant (%s FCFA) dépasse ce qu\'il reste à payer sur les factures choisies (%s FCFA).',
                self::fcfa($amount),
                self::fcfa($open->sum('computed_balance')),
            ));
        }

        // Un double clic ou un retour en arrière reprend la tentative ouverte au lieu d'en créer une seconde.
        $resumable = PaymentAttempt::where('student_id', $student->id)
            ->where('driver', $gateway->name())
            ->where('channel', $channel)
            ->whereIn('status', [PaymentAttempt::INITIATED, PaymentAttempt::PENDING])
            ->where('expires_at', '>', now())
            ->get()
            ->first(fn (PaymentAttempt $attempt) => $attempt->checkout_url && $this->sameAllocations($attempt->allocations, $split['allocations']));

        if ($resumable) {
            return $resumable;
        }

        $attempt = PaymentAttempt::create([
            'student_id' => $student->id,
            'initiated_by' => $by?->id,
            'driver' => $gateway->name(),
            'channel' => $channel,
            'amount' => PaymentAllocator::cents($amount) / 100,
            'allocations' => $split['allocations'],
            'status' => PaymentAttempt::INITIATED,
            'expires_at' => now()->addMinutes((int) config('payments.attempt_ttl', 60)),
        ]);

        try {
            $checkout = $gateway->initiate($attempt);
        } catch (Throwable $e) {
            report($e);
            $attempt->update(['status' => PaymentAttempt::FAILED, 'note' => 'Le fournisseur de paiement n\'a pas répondu : '.Str::limit($e->getMessage(), 200)]);

            throw new PaymentException('Le paiement en ligne est momentanément indisponible. Réessayez dans quelques minutes.');
        }

        $attempt->update([
            'status' => PaymentAttempt::PENDING,
            'provider_reference' => $checkout->providerReference,
            'checkout_url' => $checkout->redirectUrl,
        ]);

        return $attempt;
    }

    /**
     * Applique une notification authentifiée du fournisseur.
     *
     * @return string 'settled' (encaissé), 'duplicate' (déjà traité), 'failed', 'ignored' (en attente), 'anomaly' (à vérifier) ou 'unknown'
     */
    public function apply(GatewayEvent $event): string
    {
        [$outcome, $payments, $attempt] = DB::transaction(function () use ($event) {
            $attempt = PaymentAttempt::where('reference', $event->reference)->lockForUpdate()->first();

            if (! $attempt) {
                return ['unknown', null, null];
            }

            // Déjà encaissée, ou déjà signalée au personnel : une notification rejouée ne change plus rien.
            if (in_array($attempt->status, [PaymentAttempt::SUCCEEDED, PaymentAttempt::ANOMALY], true)) {
                return ['duplicate', null, $attempt];
            }

            if ($event->status === GatewayEvent::PENDING) {
                return ['ignored', null, $attempt];
            }

            if ($event->status === GatewayEvent::FAILED) {
                if ($attempt->isOpen()) {
                    $attempt->update(['status' => PaymentAttempt::FAILED, 'provider_reference' => $event->providerReference ?? $attempt->provider_reference]);
                }

                return ['failed', null, $attempt];
            }

            // Confirmation de paiement. Elle fait foi même si la tentative a expiré ou été donnée pour échouée : l'argent est là.
            if (PaymentAllocator::cents($event->amount) !== PaymentAllocator::cents($attempt->amount)) {
                $attempt->update([
                    'status' => PaymentAttempt::ANOMALY,
                    'provider_reference' => $event->providerReference ?? $attempt->provider_reference,
                    'note' => sprintf(
                        'Le fournisseur confirme %s FCFA, mais %s FCFA étaient attendus. Rien n\'a été encaissé : vérifiez chez le fournisseur.',
                        self::fcfa($event->amount),
                        self::fcfa((float) $attempt->amount),
                    ),
                ]);

                return ['anomaly', null, $attempt];
            }

            $providerReference = $event->providerReference ?? $attempt->provider_reference ?? $attempt->reference;
            $channel = PaymentChannels::isAccepted($event->channel) ? $event->channel : $attempt->channel;

            try {
                $payments = $this->recorder->record(
                    $attempt->student,
                    collect($attempt->allocations)->mapWithKeys(fn ($amount, $invoiceId) => [(int) $invoiceId => $amount])->all(),
                    $channel,
                    now(),
                    $providerReference,
                    null,
                    "Paiement en ligne ({$attempt->driver}) — tentative {$attempt->reference}",
                );
            } catch (PaymentException $e) {
                $attempt->update([
                    'status' => PaymentAttempt::ANOMALY,
                    'provider_reference' => $providerReference,
                    'note' => "Le paiement a été confirmé mais n'a pas pu être enregistré : {$e->getMessage()}",
                ]);

                return ['anomaly', null, $attempt];
            }

            $attempt->update([
                'status' => PaymentAttempt::SUCCEEDED,
                'provider_reference' => $providerReference,
                'batch_token' => $payments->first()->batch_token,
                'settled_at' => now(),
                'note' => null,
            ]);

            return ['settled', $payments, $attempt];
        });

        if ($outcome === 'settled') {
            // La famille reçoit son reçu après la réponse : un canal en panne ne fait jamais échouer la confirmation.
            defer(fn () => rescue(fn () => $this->notifier->receipt($payments)));
        } elseif ($outcome === 'anomaly' && $attempt?->wasChanged('status')) {
            $this->alertStaff($attempt);
        }

        return $outcome;
    }

    /**
     * Interroge le fournisseur sur chaque tentative ouverte (il a pu confirmer sans que sa notification nous parvienne),
     * puis expire celles qui ont dépassé leur délai.
     *
     * @return array{settled: int, expired: int}
     */
    public function reconcile(): array
    {
        $settled = 0;
        $gateway = $this->gateways->active();

        if ($gateway) {
            $this->openAttempts()->where('driver', $gateway->name())->orderBy('id')->get()->each(function (PaymentAttempt $attempt) use ($gateway, &$settled) {
                try {
                    $event = $gateway->status($attempt);
                } catch (Throwable $e) {
                    report($e);

                    return;
                }

                if ($event && $this->apply($event) === 'settled') {
                    $settled++;
                }
            });
        }

        $expired = $this->openAttempts()->where('expires_at', '<', now())->update([
            'status' => PaymentAttempt::EXPIRED,
            'note' => 'Aucune confirmation du fournisseur dans le délai.',
        ]);

        return ['settled' => $settled, 'expired' => $expired];
    }

    private function openAttempts()
    {
        return PaymentAttempt::whereIn('status', [PaymentAttempt::INITIATED, PaymentAttempt::PENDING]);
    }

    /** Le personnel de la comptabilité apprend qu'un paiement en ligne est à vérifier : notification et message EEHT Connect. */
    private function alertStaff(PaymentAttempt $attempt): void
    {
        $body = "Le paiement en ligne {$attempt->reference} est à vérifier : ouvrez « Paiements en ligne ».";

        StaffRecipients::withPermission('voir_comptabilite')->each(function (User $user) use ($attempt, $body) {
            SafePush::send($user, 'Paiement en ligne à vérifier', $body, route('admin.online-payments.index', [], false));
            $this->family->postToConnect($user, "⚠️ {$body}", ['type' => 'payment_anomaly', 'reference' => $attempt->reference]);
        });
    }

    /** @param  array<int|string, float|int|string>  $a  @param  array<int|string, float|int|string>  $b */
    private function sameAllocations(array $a, array $b): bool
    {
        $normalise = fn (array $allocations): Collection => collect($allocations)
            ->mapWithKeys(fn ($amount, $invoiceId) => [(int) $invoiceId => PaymentAllocator::cents($amount)])
            ->sortKeys();

        return $normalise($a)->all() === $normalise($b)->all();
    }

    private static function fcfa(float|int|string $amount): string
    {
        return number_format((float) $amount, 0, ',', ' ');
    }
}
