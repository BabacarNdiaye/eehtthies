<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Payments\InvalidWebhook;
use App\Payments\PaymentGateways;
use App\Services\OnlinePayments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Point d'entrée des notifications du fournisseur de paiement : sans connexion ni jeton CSRF (ce n'est pas un navigateur),
 * la signature authentifie l'appelant. Seul le pilote actif répond ; la notification est idempotente, donc le
 * fournisseur peut la renvoyer autant de fois qu'il veut. Le contenu de la notification n'est jamais journalisé.
 */
class PaymentWebhookController extends Controller
{
    public function __invoke(Request $request, string $driver, PaymentGateways $gateways, OnlinePayments $online): JsonResponse
    {
        $gateway = $gateways->find($driver) ?? abort(404);

        try {
            $event = $gateway->parseWebhook($request);
        } catch (InvalidWebhook $e) {
            Log::warning('Notification de paiement refusée.', ['driver' => $driver, 'reason' => $e->getMessage(), 'ip' => $request->ip()]);

            abort($e->getCode() ?: 400);
        }

        return response()->json(['ok' => true, 'outcome' => $online->apply($event)]);
    }
}
