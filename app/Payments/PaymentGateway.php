<?php

namespace App\Payments;

use App\Models\PaymentAttempt;
use Illuminate\Http\Request;

/**
 * Ce que l'application attend d'un fournisseur de paiement en ligne (Wave, Orange Money, une passerelle bancaire…) :
 * démarrer un paiement, authentifier ses notifications et, à la demande, dire où en est une tentative. Tout le reste
 * (répartition sur les factures, encaissement, reçu, alerte du personnel) est commun et vit dans OnlinePayments : un
 * nouveau fournisseur n'a que ces quatre méthodes à écrire.
 *
 * Deux adresses à donner au fournisseur : où ramener le payeur après le paiement, `route('payments.show', $attempt)` (la
 * page de suivi, qui attend la confirmation), et où il notifie le résultat, `route('payments.webhook', $this->name())`.
 * Cette seconde adresse n'a ni connexion ni jeton CSRF : seule la signature vérifiée dans `parseWebhook` fait foi.
 */
interface PaymentGateway
{
    /** Nom court du pilote : sa clé dans config/payments.php et le dernier segment de l'adresse des notifications. */
    public function name(): string;

    /** @return array<string, string> les canaux que ce pilote sait encaisser (clé de PaymentChannels => libellé) */
    public function channels(): array;

    /** Démarre le paiement chez le fournisseur ; lève une exception s'il est injoignable. */
    public function initiate(PaymentAttempt $attempt): GatewayCheckout;

    /**
     * Authentifie et lit une notification du fournisseur.
     *
     * @throws InvalidWebhook quand la signature est fausse ou le contenu illisible
     */
    public function parseWebhook(Request $request): GatewayEvent;

    /** Demande au fournisseur où en est une tentative (réconciliation) ; null quand il ne sait pas ou n'a pas d'interface pour le dire. */
    public function status(PaymentAttempt $attempt): ?GatewayEvent;
}
