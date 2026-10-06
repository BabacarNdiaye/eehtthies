<?php

namespace Tests\Unit;

use App\Notifications\PushAlert;
use Tests\TestCase;

class PushAlertTest extends TestCase
{
    public function test_the_notification_is_branded_short_and_has_an_open_action(): void
    {
        $message = (new PushAlert('Nouvelle facture', str_repeat('Mensualité Octobre ', 20), '/espace-eleve/factures'))->toWebPush(null, null);
        $payload = $message->toArray();

        $this->assertSame('/icons/badge-96.png', $payload['badge']);
        $this->assertSame('/icons/icon-192.png', $payload['icon']);
        $this->assertSame('fr', $payload['lang']);
        $this->assertLessThanOrEqual(141, mb_strlen($payload['body']));
        $this->assertSame('/espace-eleve/factures', $payload['data']['url']);
        $this->assertSame('open', $payload['actions'][0]['action']);
    }

    public function test_the_category_is_deduced_from_the_url(): void
    {
        $invoice = (new PushAlert('Nouvelle facture', 'Mensualité', '/espace-eleve/factures'))->toWebPush(null, null)->toArray();
        $this->assertSame('/images/push/finance.jpg', $invoice['image']);
        $this->assertSame('Voir la facture', $invoice['actions'][0]['title']);

        $chat = (new PushAlert('Awa', 'Bonjour', '/connect?section=messages'))->toWebPush(null, null)->toArray();
        $this->assertArrayNotHasKey('image', $chat);
        $this->assertSame('Répondre', $chat['actions'][0]['title']);
    }
}
