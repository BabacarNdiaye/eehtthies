<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Support\SiteBrand;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteBrandTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_logo_file_ships_with_the_app(): void
    {
        $this->assertFileExists(public_path(SiteBrand::DEFAULT_PATH));
    }

    public function test_falls_back_to_default_logo_when_uploaded_file_is_missing(): void
    {
        $this->assertSame(public_path(SiteBrand::DEFAULT_PATH), SiteBrand::file());

        Setting::set('site_logo', 'settings/inexistant.png');

        $this->assertSame(public_path(SiteBrand::DEFAULT_PATH), SiteBrand::file());
        $this->assertStringEndsWith('/images/logo-eeht.png', SiteBrand::url());
    }
}
