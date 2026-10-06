<?php

namespace Tests\Support;

use App\Models\PaymentAttempt;
use App\Payments\GatewayCheckout;
use App\Payments\GatewayEvent;
use App\Payments\SimulationGateway;
use RuntimeException;

/**
 * Faux fournisseur de paiement des tests : il signe et lit les notifications comme la simulation (même format), mais
 * son adresse de paiement est « externe » et l'on peut lui faire échouer le démarrage ou lui dicter l'état d'une
 * tentative pour tester la réconciliation.
 */
class FakeGateway extends SimulationGateway
{
    public static bool $failOnInitiate = false;

    public static int $initiated = 0;

    /** @var array<string, GatewayEvent> état « chez le fournisseur » par référence de tentative */
    public static array $statuses = [];

    public static function reset(): void
    {
        self::$failOnInitiate = false;
        self::$initiated = 0;
        self::$statuses = [];
    }

    public function name(): string
    {
        return 'fake';
    }

    public function initiate(PaymentAttempt $attempt): GatewayCheckout
    {
        if (self::$failOnInitiate) {
            throw new RuntimeException('Fournisseur injoignable');
        }

        self::$initiated++;

        return new GatewayCheckout('FK-'.$attempt->id, 'https://pay.example.test/checkout/'.$attempt->reference);
    }

    public function status(PaymentAttempt $attempt): ?GatewayEvent
    {
        return self::$statuses[$attempt->reference] ?? null;
    }
}
