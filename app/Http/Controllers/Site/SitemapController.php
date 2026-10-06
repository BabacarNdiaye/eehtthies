<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\NewsArticle;
use App\Support\Seo;
use Illuminate\Http\Response;
use XMLWriter;

/**
 * Plan du site pour les moteurs de recherche (/sitemap.xml) : pages publiques, formations actives et actualités
 * publiées. Rien de ce qui est privé, brouillon ou à jeton n'y figure.
 */
class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $xml = new XMLWriter;
        $xml->openMemory();
        $xml->setIndent(true);
        $xml->startDocument('1.0', 'UTF-8');
        $xml->startElement('urlset');
        $xml->writeAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

        foreach (Seo::staticRoutes() as $name) {
            $this->entry($xml, route($name), null, $name === 'home' ? '1.0' : '0.6');
        }

        foreach (Formation::where('is_active', true)->orderBy('order')->get(['slug', 'updated_at']) as $formation) {
            $this->entry($xml, route('formations.show', $formation->slug), $formation->updated_at?->toAtomString(), '0.8');
        }

        foreach (NewsArticle::published()->orderByDesc('published_at')->get(['slug', 'updated_at']) as $article) {
            $this->entry($xml, route('news.show', $article->slug), $article->updated_at?->toAtomString(), '0.5');
        }

        $xml->endElement();
        $xml->endDocument();

        return response($xml->outputMemory(), 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    private function entry(XMLWriter $xml, string $url, ?string $lastModified, string $priority): void
    {
        $xml->startElement('url');
        $xml->writeElement('loc', $url);

        if ($lastModified !== null) {
            $xml->writeElement('lastmod', $lastModified);
        }

        $xml->writeElement('priority', $priority);
        $xml->endElement();
    }
}
