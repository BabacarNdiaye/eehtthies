<?php

namespace Tests\Feature;

use App\Payments\GatewayEvent;
use App\Payments\InvalidWebhook;
use App\Payments\PaymentGateways;
use App\Payments\SimulationGateway;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Le choix du fournisseur de paiement : rien n'est actif par défaut, la simulation n'est jamais active en production
 * sans l'accord explicite de l'établissement, et chaque notification est authentifiée par une signature.
 */
class PaymentGatewaysTest extends TestCase
{
    private function gateways(): PaymentGateways
    {
        $this->app->forgetInstance(PaymentGateways::class);

        return $this->app->make(PaymentGateways::class);
    }

    public function test_nothing_is_active_by_default(): void
    {
        config(['payments.driver' => 'none']);

        $gateways = $this->gateways();

        $this->assertNull($gateways->active());
        $this->assertNull($gateways->refusal());
        $this->assertNull($gateways->find('simulation'));
    }

    public function test_the_default_configuration_activates_no_payment_driver(): void
    {
        $this->assertSame('none', config('payments.driver'), 'sans réglage explicite, aucun paiement en ligne');
        $this->assertFalse((bool) config('payments.allow_simulation'));
    }

    public function test_the_simulation_runs_outside_production_without_any_flag(): void
    {
        config(['payments.driver' => 'simulation', 'payments.allow_simulation' => false]);
        $this->app['env'] = 'local';

        $this->assertInstanceOf(SimulationGateway::class, $this->gateways()->active());
        $this->assertInstanceOf(SimulationGateway::class, $this->gateways()->find('simulation'));
    }

    public function test_the_simulation_is_refused_in_production_unless_explicitly_allowed(): void
    {
        config(['payments.driver' => 'simulation', 'payments.allow_simulation' => false]);
        $this->app['env'] = 'production';

        $refused = $this->gateways();
        $this->assertNull($refused->active());
        $this->assertNull($refused->find('simulation'));
        $this->assertStringContainsString('production', (string) $refused->refusal());

        config(['payments.allow_simulation' => true]);
        $allowed = $this->gateways();
        $this->assertInstanceOf(SimulationGateway::class, $allowed->active());
        $this->assertNull($allowed->refusal());
    }

    public function test_an_unknown_driver_is_reported_and_inactive(): void
    {
        config(['payments.driver' => 'wave']);

        $gateways = $this->gateways();

        $this->assertNull($gateways->active());
        $this->assertStringContainsString('wave', (string) $gateways->refusal());
    }

    public function test_the_simulation_only_reads_notifications_it_signed(): void
    {
        $gateway = new SimulationGateway(['secret' => 'cle-de-test']);
        $body = json_encode(['reference' => 'PAY-1', 'status' => 'succeeded', 'amount' => 25000, 'provider_reference' => 'SIM-1', 'channel' => 'wave']);
        $request = fn (string $signature) => Request::create('/paiements/webhook/simulation', 'POST', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIGNATURE' => $signature], $body);

        $event = $gateway->parseWebhook($request($gateway->sign($body)));

        $this->assertSame('PAY-1', $event->reference);
        $this->assertSame(GatewayEvent::SUCCEEDED, $event->status);
        $this->assertSame(25000.0, $event->amount);
        $this->assertSame('SIM-1', $event->providerReference);
        $this->assertSame('wave', $event->channel);

        $this->expectException(InvalidWebhook::class);
        $gateway->parseWebhook($request((new SimulationGateway(['secret' => 'autre']))->sign($body)));
    }

    public function test_without_a_configured_secret_the_signature_depends_on_the_application_key(): void
    {
        $first = (new SimulationGateway([]))->sign('corps');

        config(['app.key' => 'base64:'.base64_encode(str_repeat('b', 32))]);
        $second = (new SimulationGateway([]))->sign('corps');

        $this->assertNotSame($first, $second);
        $this->assertNotSame('', $first);
    }
}
