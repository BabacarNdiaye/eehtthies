<?php

namespace Tests\Unit;

use App\Support\UploadLimit;
use PHPUnit\Framework\TestCase;

class UploadLimitTest extends TestCase
{
    public function test_php_ini_sizes_are_read_in_kilobytes(): void
    {
        $this->assertSame(10240, UploadLimit::iniToKb('10M'));
        $this->assertSame(2048, UploadLimit::iniToKb('2M'));
        $this->assertSame(512, UploadLimit::iniToKb('512K'));
        $this->assertSame(2097152, UploadLimit::iniToKb('2G'));
        $this->assertSame(8192, UploadLimit::iniToKb('8388608'));
        $this->assertSame(0, UploadLimit::iniToKb('0'));
        $this->assertSame(0, UploadLimit::iniToKb('-1'));
        $this->assertSame(0, UploadLimit::iniToKb(false));
    }

    public function test_the_limit_never_exceeds_the_application_maximum_nor_is_zero(): void
    {
        $this->assertLessThanOrEqual(UploadLimit::APP_MAX_KB, UploadLimit::kilobytes());
        $this->assertGreaterThanOrEqual(256, UploadLimit::kilobytes());
        $this->assertLessThanOrEqual(1024, UploadLimit::kilobytes(1024));
    }

    public function test_the_megabyte_figure_is_rounded_down_to_half_a_megabyte(): void
    {
        $this->assertSame(1.5, floor(1700 / 512) / 2);
        $this->assertEqualsWithDelta(UploadLimit::kilobytes() / 1024, UploadLimit::megabytes(), 0.5);
    }
}
