<?php

namespace App\Payments;

/** Ce que le fournisseur répond au démarrage d'un paiement : sa propre référence et l'adresse où envoyer le payeur. */
final class GatewayCheckout
{
    public function __construct(
        public readonly string $providerReference,
        public readonly string $redirectUrl,
    ) {}
}
