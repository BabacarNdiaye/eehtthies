<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le jeton de la borne se lit dans la configuration (config('eeht.kiosk_token')), jamais avec env() : la configuration
 * en cache de la production ferait sinon refuser tout le monde. Sans jeton configuré, la borne reste fermée.
 */
class KioskTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_kiosk_opens_with_the_configured_token_only(): void
    {
        config(['eeht.kiosk_token' => 'jeton-de-test-tres-long-1234567890']);

        $this->get(route('borne.pointage.open', ['token' => 'jeton-de-test-tres-long-1234567890']))->assertOk();
        $this->get(route('borne.pointage.open', ['token' => 'mauvais']))->assertForbidden();
        $this->get(route('borne.pointage.open'))->assertForbidden();
    }

    public function test_without_a_configured_token_the_kiosk_stays_closed(): void
    {
        config(['eeht.kiosk_token' => null]);

        $this->get(route('borne.pointage.open', ['token' => '']))->assertForbidden();
        $this->postJson(route('borne.pointage.scan.open'), ['kiosk_token' => '', 'date' => '2026-10-06', 'student_id' => 1])->assertForbidden();
    }

    public function test_a_scan_with_a_wrong_token_is_refused(): void
    {
        config(['eeht.kiosk_token' => 'jeton-de-test-tres-long-1234567890']);

        $this->postJson(route('borne.pointage.scan.open'), ['kiosk_token' => 'faux', 'date' => '2026-10-06', 'student_id' => 1])->assertForbidden();
    }
}
