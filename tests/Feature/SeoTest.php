<?php

namespace Tests\Feature;

use App\Models\Formation;
use App\Models\NewsArticle;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Aperçus de partage (WhatsApp, Facebook, X), référencement et plan du site. Ces balises sont écrites par
 * Blade dans le HTML initial : les robots de partage n'exécutent pas le JavaScript de l'application.
 */
class SeoTest extends TestCase
{
    use RefreshDatabase;

    private function formation(array $attributes = []): Formation
    {
        return Formation::create([
            'name' => 'BTS Cuisine',
            'code' => 'BTS-CUI',
            'is_active' => true,
            'description' => "<p>Une formation <strong>exigeante</strong> en cuisine professionnelle.</p>\n".str_repeat('Mot ', 100),
            'diploma' => 'BTS',
            'image' => 'formations/cuisine.jpg',
            ...$attributes,
        ]);
    }

    private function article(array $attributes = []): NewsArticle
    {
        return NewsArticle::create([
            'title' => 'Rentrée 2026',
            'excerpt' => 'Les inscriptions sont ouvertes.',
            'content' => 'Contenu complet',
            'is_published' => true,
            'published_at' => now()->subDay(),
            ...$attributes,
        ]);
    }

    public function test_the_home_page_carries_share_tags_and_organization_data(): void
    {
        Setting::set('site_name', 'EEHT de Thiès');
        Setting::set('site_phone', '+221 33 951 00 00');
        Setting::set('site_address', 'Route de Dakar, Thiès');
        Setting::set('facebook_url', 'https://facebook.com/eeht-demo');

        $html = $this->get(route('home'))->assertOk()->getContent();

        $this->assertStringContainsString('<meta property="og:title" content="EEHT de Thiès', $html);
        $this->assertStringContainsString('<meta property="og:type" content="website">', $html);
        $this->assertStringContainsString('<meta property="og:url" content="'.route('home').'">', $html);
        $this->assertStringContainsString('<meta property="og:locale" content="fr_FR">', $html);
        // Logo carré par défaut : petit aperçu ; une image propre à la page (formation, actualité) donne un grand aperçu.
        $this->assertStringContainsString('<meta name="twitter:card" content="summary">', $html);
        $this->assertStringContainsString('<link rel="canonical" href="'.route('home').'">', $html);
        $this->assertStringContainsString('<meta name="robots" content="index, follow">', $html);
        $this->assertMatchesRegularExpression('#<meta property="og:image" content="https?://[^"]+/icons/icon-512\.png">#', $html);

        $data = $this->jsonLd($html);

        $this->assertSame('EducationalOrganization', $data['@type']);
        $this->assertSame('EEHT de Thiès', $data['name']);
        $this->assertSame('+221 33 951 00 00', $data['telephone']);
        $this->assertSame('Route de Dakar, Thiès', $data['address']['streetAddress']);
        $this->assertContains('https://facebook.com/eeht-demo', $data['sameAs']);
    }

    public function test_a_formation_page_describes_the_formation(): void
    {
        $formation = $this->formation();

        $html = $this->get(route('formations.show', $formation->slug))->assertOk()->getContent();

        $this->assertStringContainsString('<meta property="og:title" content="BTS Cuisine - EEHT de Thiès">', $html);
        $this->assertStringContainsString('<link rel="canonical" href="'.route('formations.show', $formation->slug).'">', $html);
        $this->assertStringContainsString('<meta property="og:image" content="'.url('/storage/formations/cuisine.jpg').'">', $html);
        $this->assertStringContainsString('<title inertia>BTS Cuisine - EEHT de Thiès</title>', $html);
        $this->assertStringContainsString('<meta name="twitter:card" content="summary_large_image">', $html);

        $description = $this->metaContent($html, 'description');

        $this->assertStringStartsWith('Une formation exigeante en cuisine professionnelle.', $description);
        $this->assertStringNotContainsString('<', $description);
        $this->assertLessThanOrEqual(160, mb_strlen($description));

        $data = $this->jsonLd($html);

        $this->assertSame('Course', $data['@type']);
        $this->assertSame('BTS Cuisine', $data['name']);
        $this->assertSame('EducationalOrganization', $data['provider']['@type']);
    }

    public function test_a_news_article_is_an_article(): void
    {
        $article = $this->article();

        $html = $this->get(route('news.show', $article->slug))->assertOk()->getContent();

        $this->assertStringContainsString('<meta property="og:type" content="article">', $html);
        $this->assertStringContainsString('<meta property="og:title" content="Rentrée 2026 - EEHT de Thiès">', $html);
        $this->assertSame('Les inscriptions sont ouvertes.', $this->metaContent($html, 'description'));
        $this->assertStringContainsString('<meta property="article:published_time" content="'.$article->published_at->toIso8601String().'">', $html);

        $data = $this->jsonLd($html);

        $this->assertSame('NewsArticle', $data['@type']);
        $this->assertSame('Rentrée 2026', $data['headline']);
        $this->assertSame($article->published_at->toIso8601String(), $data['datePublished']);
    }

    public function test_static_pages_have_their_own_title_and_description(): void
    {
        $html = $this->get(route('pages.contact'))->assertOk()->getContent();

        $this->assertStringContainsString('<title inertia>Contact - EEHT de Thiès</title>', $html);
        $this->assertNotSame('', $this->metaContent($html, 'description'));
        $this->assertStringContainsString('<link rel="canonical" href="'.route('pages.contact').'">', $html);
    }

    public function test_private_and_one_off_pages_are_not_indexed(): void
    {
        foreach ([route('login'), route('candidature.track.form')] as $url) {
            $html = $this->get($url)->assertOk()->getContent();

            $this->assertStringContainsString('<meta name="robots" content="noindex, nofollow">', $html, $url);
            $this->assertStringNotContainsString('rel="canonical"', $html, $url);
        }

        $this->get(route('dashboard'))->assertRedirect();
    }

    public function test_titles_cannot_break_out_of_the_structured_data(): void
    {
        $formation = $this->formation(['name' => 'Cuisine </script><script>alert(1)</script> & "pâtisserie"']);

        $html = $this->get(route('formations.show', $formation->slug))->assertOk()->getContent();

        $this->assertStringNotContainsString('</script><script>alert(1)', $html);
        $this->assertSame('Cuisine </script><script>alert(1)</script> & "pâtisserie"', $this->jsonLd($html)['name']);
        $this->assertStringContainsString('&lt;/script&gt;', $html);
    }

    public function test_the_sitemap_lists_public_pages_formations_and_articles_only(): void
    {
        $formation = $this->formation();
        $inactive = $this->formation(['name' => 'Ancienne formation', 'code' => 'OLD', 'is_active' => false]);
        $article = $this->article();
        $draft = $this->article(['title' => 'Brouillon secret', 'is_published' => false]);
        $future = $this->article(['title' => 'Annonce future', 'published_at' => now()->addWeek()]);

        // Adresse absolue : le plan du site écrit des adresses complètes, construites sur l'hôte de la requête.
        $response = $this->get(route('sitemap'))->assertOk();

        $this->assertSame('/sitemap.xml', parse_url(route('sitemap'), PHP_URL_PATH));

        $this->assertStringStartsWith('application/xml', $response->headers->get('Content-Type'));

        $namespace = ' xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

        $this->assertStringContainsString('<urlset'.$namespace.'>', $response->getContent());

        // SimpleXML ne lit pas les enfants d'un espace de noms par défaut sans artifice : on l'ôte pour l'analyse.
        $xml = simplexml_load_string(str_replace($namespace, '', $response->getContent()));
        $urls = [];

        // Pas de collect() : les enfants d'un SimpleXMLElement portent tous la même clé, un tableau n'en garderait qu'un.
        foreach ($xml->url as $entry) {
            $urls[] = (string) $entry->loc;
        }

        $this->assertContains(route('home'), $urls);
        $this->assertContains(route('formations.index'), $urls);
        $this->assertContains(route('pages.contact'), $urls);
        $this->assertContains(route('candidature.create'), $urls);
        $this->assertContains(route('formations.show', $formation->slug), $urls);
        $this->assertContains(route('news.show', $article->slug), $urls);
        $this->assertNotContains(route('formations.show', $inactive->slug), $urls);
        $this->assertNotContains(route('news.show', $draft->slug), $urls);
        $this->assertNotContains(route('news.show', $future->slug), $urls);
        $this->assertNotContains(route('login'), $urls);
        $this->assertNotContains(route('candidature.track.form'), $urls);
        $this->assertSame(count($urls), count(array_unique($urls)));
    }

    public function test_the_static_robots_file_declares_the_sitemap_and_hides_private_areas(): void
    {
        $robots = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('Sitemap: https://eeht.onits.sn/sitemap.xml', $robots);

        foreach (['/admin', '/espace-eleve', '/espace-parent', '/espace-enseignant', '/connect', '/login'] as $path) {
            $this->assertStringContainsString('Disallow: '.$path, $robots);
        }
    }

    /** @return array<string, mixed> */
    private function jsonLd(string $html): array
    {
        $this->assertSame(1, preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $html, $match), 'JSON-LD manquant');

        $data = json_decode($match[1], true);

        $this->assertIsArray($data, 'JSON-LD invalide : '.json_last_error_msg());
        $this->assertSame('https://schema.org', $data['@context']);

        return $data;
    }

    private function metaContent(string $html, string $name): string
    {
        $this->assertSame(1, preg_match('#<meta name="'.preg_quote($name, '#').'" content="([^"]*)">#', $html, $match), "meta {$name} manquante");

        return html_entity_decode($match[1], ENT_QUOTES);
    }
}
