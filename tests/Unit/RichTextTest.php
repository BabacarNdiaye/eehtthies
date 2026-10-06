<?php

namespace Tests\Unit;

use App\Support\RichText;
use PHPUnit\Framework\TestCase;

class RichTextTest extends TestCase
{
    public function test_formatting_tags_are_kept_and_attributes_removed(): void
    {
        $this->assertSame('<p>Bonjour <strong>classe</strong></p>', RichText::clean('<p onclick="x()" style="color:red">Bonjour <strong class="a">classe</strong></p>'));
        $this->assertSame('<ul><li>un</li><li>deux</li></ul>', RichText::clean('<ul><li>un</li><li>deux</li></ul>'));
    }

    public function test_scripts_frames_images_and_handlers_are_dropped(): void
    {
        $this->assertSame('<p>vu</p>', RichText::clean('<script>alert(1)</script><iframe src="//evil"></iframe><p>vu</p>'));
        $this->assertSame('texte', strip_tags(RichText::clean('<img src=x onerror=alert(1)>texte')));
        $this->assertStringNotContainsString('alert', RichText::clean('<svg><script>alert(1)</script></svg>après'));
        $this->assertStringNotContainsString('onerror', RichText::clean('<img src=x onerror=alert(1)>texte'));
    }

    public function test_dangerous_links_lose_their_address_but_keep_their_text(): void
    {
        $this->assertSame('<p>clic</p>', RichText::clean('<p><a href="javascript:alert(1)">clic</a></p>'));
        $this->assertSame('<p>x</p>', RichText::clean("<p><a href=\"java&#10;script:alert(1)\">x</a></p>"));
        $this->assertSame('<p>d</p>', RichText::clean('<p><a href="data:text/html;base64,AAA">d</a></p>'));
    }

    public function test_safe_links_are_opened_in_a_new_tab_without_referrer(): void
    {
        $html = RichText::clean('<p><a href="https://eeht.sn/page" onclick="y">bon</a></p>');

        $this->assertStringContainsString('href="https://eeht.sn/page"', $html);
        $this->assertStringContainsString('rel="noopener noreferrer nofollow"', $html);
        $this->assertStringNotContainsString('onclick', $html);
    }

    public function test_plain_text_becomes_paragraphs_and_is_escaped(): void
    {
        $this->assertSame('<p>Ligne 1<br>Ligne 2</p><p>Autre</p>', RichText::clean("Ligne 1\nLigne 2\n\nAutre"));
        $this->assertSame('<p>1 &lt; 2 et 3 &gt; 2</p>', RichText::clean('1 < 2 et 3 > 2'));
    }

    public function test_an_empty_editor_gives_nothing(): void
    {
        $this->assertSame('', RichText::clean('<p></p><p>&nbsp;</p>'));
        $this->assertNull(RichText::forStorage('<p></p>'));
        $this->assertNull(RichText::forStorage('   '));
        $this->assertSame('Texte simple', RichText::forStorage('Texte simple'));
    }

    public function test_plain_text_extraction_for_announcements_and_exports(): void
    {
        $this->assertSame("A\n\n- b\n- c\nD & E", RichText::plain('<p>A</p><ul><li>b</li><li>c</li></ul><p>D &amp; E</p>'));
        $this->assertSame('Déjà du texte', RichText::plain('Déjà du texte'));
    }
}
