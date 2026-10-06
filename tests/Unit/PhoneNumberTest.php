<?php

namespace Tests\Unit;

use App\Support\PhoneNumber;
use PHPUnit\Framework\TestCase;

/**
 * Les fiches d'élèves proposent « Appeler » et « WhatsApp » : les numéros saisis à la main (avec espaces, points,
 * indicatif ou non) doivent donner un lien qui fonctionne, sans jamais en inventer un à partir d'un texte quelconque.
 */
class PhoneNumberTest extends TestCase
{
    public function test_a_local_number_gets_the_country_code_whatever_its_formatting(): void
    {
        foreach (['77 187 79 18', '771877918', '77.187.79.18', '77-187-79-18', ' 77 187 79 18 '] as $raw) {
            $this->assertSame('+221771877918', PhoneNumber::international($raw), "« {$raw} »");
        }

        $this->assertSame('+221339511234', PhoneNumber::international('33 951 12 34'), 'un fixe de Thiès');
    }

    public function test_a_number_that_already_carries_its_country_code_is_kept(): void
    {
        foreach (['+221 77 187 79 18', '00221 77 187 79 18', '221771877918', '+221771877918'] as $raw) {
            $this->assertSame('+221771877918', PhoneNumber::international($raw), "« {$raw} »");
        }

        $this->assertSame('+33612345678', PhoneNumber::international('+33 6 12 34 56 78'));
        $this->assertSame('+33612345678', PhoneNumber::international('0033 6 12 34 56 78'));
    }

    public function test_the_country_code_can_be_changed(): void
    {
        $this->assertSame('+22507123456', PhoneNumber::international('07 12 34 56', '225'), 'huit chiffres : numéro local ivoirien');
        $this->assertSame('+225012345678', PhoneNumber::international('012345678', '225'));
    }

    public function test_something_that_is_not_a_phone_number_gives_nothing(): void
    {
        foreach ([null, '', '   ', 'abc', '123', '12 34', '+', 'N/A', '77 187'] as $raw) {
            $this->assertNull(PhoneNumber::international($raw), var_export($raw, true));
        }

        $this->assertNull(PhoneNumber::international('+1234567890123456'), 'plus de 15 chiffres');
    }

    public function test_the_whatsapp_link_wants_digits_only(): void
    {
        $this->assertSame('221771877918', PhoneNumber::whatsapp('77 187 79 18'));
        $this->assertSame('33612345678', PhoneNumber::whatsapp('+33 6 12 34 56 78'));
        $this->assertNull(PhoneNumber::whatsapp('abc'));
        $this->assertNull(PhoneNumber::whatsapp(null));
    }

    public function test_the_display_form_groups_digits_for_reading(): void
    {
        $this->assertSame('+221 77 187 79 18', PhoneNumber::display('771877918'));
        $this->assertSame('+221 33 951 12 34', PhoneNumber::display('339511234'));
        $this->assertSame('abc', PhoneNumber::display('abc'), 'un texte qui n\'est pas un numéro est rendu tel quel');
        $this->assertNull(PhoneNumber::display(null));
        $this->assertNull(PhoneNumber::display('  '));
    }
}
