<?php

namespace Tests\Unit;

use App\Support\PaymentChannels;
use PHPUnit\Framework\TestCase;

/**
 * Le « canal » (Wave, Orange Money, chèque…) est ce que choisit le guichet ; la « famille » (espèces, virement,
 * mobile money, autre) est la valeur de l'enum de la base, qui ne change pas. Cette correspondance décide aussi du
 * compte comptable (caisse ou banque) : elle ne doit jamais dériver.
 */
class PaymentChannelsTest extends TestCase
{
    public function test_every_channel_has_a_label_and_maps_to_a_known_family(): void
    {
        $this->assertNotEmpty(PaymentChannels::options());

        foreach (PaymentChannels::options() as $channel => $label) {
            $this->assertNotSame('', $label, "Le canal {$channel} n'a pas de libellé.");
            $this->assertContains(PaymentChannels::methodFor($channel), ['especes', 'virement', 'mobile_money', 'autre']);
        }
    }

    public function test_the_families_match_the_accounting_rules(): void
    {
        $this->assertSame('especes', PaymentChannels::methodFor('especes'));
        $this->assertSame('virement', PaymentChannels::methodFor('virement'));
        $this->assertSame('mobile_money', PaymentChannels::methodFor('wave'));
        $this->assertSame('mobile_money', PaymentChannels::methodFor('orange_money'));
        $this->assertSame('mobile_money', PaymentChannels::methodFor('free_money'));
        $this->assertSame('autre', PaymentChannels::methodFor('cheque'));
        $this->assertSame('autre', PaymentChannels::methodFor('carte'));
        $this->assertSame('autre', PaymentChannels::methodFor('autre'));
    }

    public function test_the_old_family_values_are_still_accepted_and_readable(): void
    {
        $this->assertTrue(PaymentChannels::isAccepted('mobile_money'));
        $this->assertSame('mobile_money', PaymentChannels::methodFor('mobile_money'));
        $this->assertSame('Mobile Money', PaymentChannels::label('mobile_money'));
    }

    public function test_labels_never_hide_a_stored_value(): void
    {
        $this->assertSame('Wave', PaymentChannels::label('wave'));
        $this->assertSame('Espèces', PaymentChannels::label('especes'));
        $this->assertSame('—', PaymentChannels::label(null));
        $this->assertSame('—', PaymentChannels::label(''));
        $this->assertSame('bitcoin', PaymentChannels::label('bitcoin'));
    }

    public function test_an_unknown_channel_is_not_accepted(): void
    {
        $this->assertFalse(PaymentChannels::isAccepted('bitcoin'));
        $this->assertFalse(PaymentChannels::isAccepted(''));
        $this->assertFalse(PaymentChannels::isAccepted(null));
    }

    public function test_only_real_channels_are_offered_to_the_cashier(): void
    {
        // « mobile_money » est une famille héritée : acceptée en lecture, plus proposée au guichet.
        $this->assertArrayNotHasKey('mobile_money', PaymentChannels::options());
        $this->assertArrayHasKey('wave', PaymentChannels::options());
        $this->assertArrayHasKey('especes', PaymentChannels::options());
    }
}
