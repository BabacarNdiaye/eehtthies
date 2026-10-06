<?php

namespace App\Payments;

use App\Models\PaymentAttempt;
use App\Support\PaymentChannels;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Faux fournisseur pour essayer tout le parcours (démarrer, payer, notification, reçu) sans argent réel. Il parle comme un
 * vrai : une adresse de paiement, des notifications JSON signées (HMAC-SHA256 du corps dans l'en-tête X-Signature) que
 * l'application authentifie exactement comme celles d'un fournisseur réel. Il sert aussi de modèle pour en écrire un.
 */
class SimulationGateway implements PaymentGateway
{
    private const CHANNELS = ['wave', 'orange_money', 'free_money', 'carte'];

    /** @param  array<string, mixed>  $config  réglages de config/payments.php (« secret » : clé de signature) */
    public function __construct(protected array $config = []) {}

    public function name(): string
    {
        return 'simulation';
    }

    public function channels(): array
    {
        $labels = PaymentChannels::labels();

        return collect(self::CHANNELS)->mapWithKeys(fn (string $key) => [$key => $labels[$key]])->all();
    }

    public function initiate(PaymentAttempt $attempt): GatewayCheckout
    {
        return new GatewayCheckout('SIM-'.strtoupper(Str::random(10)), route('payments.simulation.show', $attempt));
    }

    public function parseWebhook(Request $request): GatewayEvent
    {
        $body = $request->getContent();

        if (! hash_equals($this->sign($body), (string) $request->header('X-Signature'))) {
            throw InvalidWebhook::badSignature();
        }

        $data = json_decode($body, true);

        if (! is_array($data)
            || ! is_string($data['reference'] ?? null)
            || ! in_array($data['status'] ?? null, GatewayEvent::STATUSES, true)
            || ! is_numeric($data['amount'] ?? null)) {
            throw InvalidWebhook::malformed();
        }

        return new GatewayEvent(
            $data['reference'],
            $data['status'],
            (float) $data['amount'],
            is_string($data['provider_reference'] ?? null) ? $data['provider_reference'] : null,
            is_string($data['channel'] ?? null) ? $data['channel'] : null,
        );
    }

    /** La simulation n'a pas d'état « chez le fournisseur » à interroger : seule sa notification fait foi. */
    public function status(PaymentAttempt $attempt): ?GatewayEvent
    {
        return null;
    }

    public function sign(string $body): string
    {
        return hash_hmac('sha256', $body, $this->secret());
    }

    /**
     * Ce que la page de simulation « envoie » à l'application quand on y choisit un résultat : le corps JSON et sa signature.
     *
     * @param  string  $status  l'une des valeurs de GatewayEvent
     * @return array{body: string, signature: string}
     */
    public function notification(PaymentAttempt $attempt, string $status): array
    {
        $body = json_encode([
            'reference' => $attempt->reference,
            'status' => $status,
            'amount' => (float) $attempt->amount,
            'provider_reference' => $attempt->provider_reference,
            'channel' => $attempt->channel,
        ]);

        return ['body' => $body, 'signature' => $this->sign($body)];
    }

    private function secret(): string
    {
        $secret = $this->config['secret'] ?? null;

        return filled($secret) ? (string) $secret : hash_hmac('sha256', 'payments-simulation', (string) config('app.key'));
    }
}
