<?php

namespace App\Support;

use App\Models\Formation;
use App\Models\NewsArticle;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Balises de partage et de référencement du site public : titre, description, aperçu (Open Graph, X), adresse
 * canonique, données structurées (JSON-LD). Elles sont écrites par Blade (resources/views/app.blade.php) dans le HTML
 * initial, car les robots de partage — WhatsApp, Facebook, X — n'exécutent pas le JavaScript de l'application.
 *
 * Seules les pages publiques sont indexables ; tout le reste (administration, espaces, connexion, pages à jeton ou à
 * référence) porte « noindex ».
 */
class Seo
{
    /**
     * Pages publiques sans paramètre : nom de route => [titre, description]. Les titres reprennent ceux des pages React
     * (<Head title>) pour que l'onglet ne change pas de texte quand l'application se charge.
     *
     * @var array<string, array{0: string, 1: string}>
     */
    private const PAGES = [
        'home' => ['EEHT de Thiès - Elite École Hôtelière et Touristique', 'Formations professionnalisantes en hôtellerie, restauration et tourisme à Thiès (Sénégal) : cuisine, service, réception, tourisme.'],
        'pages.about' => ['À propos', "Découvrez l'histoire, la mission et l'équipe de l'Elite École Hôtelière et Touristique de Thiès."],
        'pages.teachers' => ['Notre équipe pédagogique', "Les enseignants et formateurs de l'EEHT de Thiès, issus des métiers de l'hôtellerie, de la restauration et du tourisme."],
        'pages.partners' => ['Nos partenaires', "Hôtels, restaurants et agences partenaires de l'EEHT de Thiès pour les stages et l'insertion professionnelle."],
        'pages.testimonials' => ['Témoignages', "Ce que disent les étudiants, les diplômés et les partenaires de l'EEHT de Thiès."],
        'pages.faq' => ['Foire aux questions', "Réponses aux questions fréquentes sur les admissions, les formations, les frais et la vie à l'EEHT de Thiès."],
        'pages.contact' => ['Contact', "Contactez l'EEHT de Thiès : adresse, téléphone, e-mail, horaires et formulaire de contact."],
        'pages.legal-notice' => ['Mentions légales', "Mentions légales du site de l'EEHT de Thiès."],
        'pages.privacy-policy' => ['Politique de confidentialité', "Comment l'EEHT de Thiès collecte, utilise et protège vos données personnelles."],
        'formations.index' => ['Nos formations', "Toutes les formations de l'EEHT de Thiès : CAP, BEP, BT, BTS, DTS et certificats en hôtellerie, restauration et tourisme."],
        'news.index' => ['Actualités', "Actualités et temps forts de la vie de l'EEHT de Thiès."],
        'events.index' => ['Événements', "Événements, portes ouvertes et rencontres organisés par l'EEHT de Thiès."],
        'gallery.index' => ['Galerie photos et vidéos', "Photos et vidéos des ateliers, des événements et de la vie étudiante à l'EEHT de Thiès."],
        'candidature.create' => ['Candidature en ligne', "Déposez votre candidature en ligne à l'EEHT de Thiès et recevez une référence pour suivre votre dossier."],
        'careers.internships.index' => ['Offres de stage', "Offres de stage proposées aux étudiants de l'EEHT de Thiès par ses entreprises partenaires."],
        'careers.jobs.index' => ["Offres d'emploi", "Offres d'emploi dans l'hôtellerie, la restauration et le tourisme, relayées par l'EEHT de Thiès."],
        'community.alumni.index' => ['Anciens élèves', "Parcours et réussites des anciens élèves de l'EEHT de Thiès."],
    ];

    /**
     * Noms de route des pages publiques sans paramètre (plan du site compris).
     *
     * @return list<string>
     */
    public static function staticRoutes(): array
    {
        return array_keys(self::PAGES);
    }

    /**
     * Balises de la requête courante, prêtes pour Blade.
     *
     * @return array{title: string, description: string, robots: string, canonical: ?string, url: ?string, image: ?string, type: string, locale: string, site_name: string, published_time: ?string, card: string, json_ld: ?string}
     */
    public static function forRequest(Request $request): array
    {
        $app = (string) config('app.name', 'EEHT de Thiès');
        $siteName = (string) (Setting::get('site_name') ?: $app);
        $route = $request->route();
        $name = $route?->getName();

        $seo = [
            'title' => $app,
            'description' => 'Elite École Hôtelière et Touristique de Thiès - Formations professionnalisantes en hôtellerie, restauration et tourisme.',
            'robots' => 'noindex, nofollow',
            'canonical' => null,
            'url' => null,
            'image' => self::defaultImage(),
            'type' => 'website',
            'locale' => 'fr_FR',
            'site_name' => $siteName,
            'published_time' => null,
            'card' => 'summary',
            'json_ld' => null,
        ];

        if ($name === null) {
            return $seo;
        }

        if (isset(self::PAGES[$name])) {
            [$page, $description] = self::PAGES[$name];

            $seo = [...$seo,
                'title' => $name === 'home' ? $page : "{$page} - {$app}",
                'description' => $description,
                'robots' => 'index, follow',
                'canonical' => route($name),
            ];

            if ($name === 'home') {
                $seo['json_ld'] = self::encode(self::organization($siteName));
            }
        } elseif ($name === 'formations.show' && ($formation = $route->parameter('formation')) instanceof Formation && $formation->is_active) {
            $seo = self::formation($seo, $formation, $app, $siteName);
        } elseif ($name === 'news.show' && ($article = $route->parameter('article')) instanceof NewsArticle && $article->is_published) {
            $seo = self::article($seo, $article, $app, $siteName);
        }

        if ($seo['canonical'] !== null) {
            $seo['url'] = $seo['canonical'];
        }

        // Une image propre à la page donne un grand aperçu ; le logo carré par défaut, un petit.
        $seo['card'] = $seo['image'] !== null && $seo['image'] !== self::defaultImage() ? 'summary_large_image' : 'summary';

        return $seo;
    }

    /**
     * @param  array<string, mixed>  $seo
     * @return array<string, mixed>
     */
    private static function formation(array $seo, Formation $formation, string $app, string $siteName): array
    {
        $url = route('formations.show', $formation->slug);
        $description = self::plain($formation->description) ?: "Formation {$formation->name} à l'EEHT de Thiès.";

        return [...$seo,
            'title' => "{$formation->name} - {$app}",
            'description' => Str::limit($description, 160, '…'),
            'robots' => 'index, follow',
            'canonical' => $url,
            'image' => self::storageUrl($formation->image) ?? $seo['image'],
            'json_ld' => self::encode(array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'Course',
                'name' => $formation->name,
                'description' => Str::limit($description, 300, '…'),
                'url' => $url,
                'image' => self::storageUrl($formation->image),
                'educationalCredentialAwarded' => $formation->diploma,
                'provider' => [
                    '@type' => 'EducationalOrganization',
                    'name' => $siteName,
                    'url' => route('home'),
                ],
            ])),
        ];
    }

    /**
     * @param  array<string, mixed>  $seo
     * @return array<string, mixed>
     */
    private static function article(array $seo, NewsArticle $article, string $app, string $siteName): array
    {
        $url = route('news.show', $article->slug);
        $description = self::plain($article->excerpt) ?: self::plain($article->content) ?: "Actualité de l'EEHT de Thiès.";
        $image = self::storageUrl($article->image);
        $published = $article->published_at?->toIso8601String();

        return [...$seo,
            'title' => "{$article->title} - {$app}",
            'description' => Str::limit($description, 160, '…'),
            'robots' => 'index, follow',
            'canonical' => $url,
            'type' => 'article',
            'image' => $image ?? $seo['image'],
            'published_time' => $published,
            'json_ld' => self::encode(array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'NewsArticle',
                'headline' => $article->title,
                'description' => Str::limit($description, 300, '…'),
                'datePublished' => $published,
                'dateModified' => $article->updated_at?->toIso8601String(),
                'image' => $image,
                'mainEntityOfPage' => $url,
                'publisher' => ['@type' => 'EducationalOrganization', 'name' => $siteName, 'url' => route('home')],
            ])),
        ];
    }

    /** @return array<string, mixed> */
    private static function organization(string $siteName): array
    {
        $social = array_values(array_filter([
            Setting::get('facebook_url'),
            Setting::get('instagram_url'),
            Setting::get('linkedin_url'),
            Setting::get('youtube_url'),
        ]));
        $address = Setting::get('site_address');

        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'EducationalOrganization',
            'name' => $siteName,
            'url' => route('home'),
            'logo' => self::defaultImage(),
            'telephone' => Setting::get('site_phone'),
            'email' => Setting::get('site_email'),
            'address' => $address ? ['@type' => 'PostalAddress', 'streetAddress' => $address, 'addressCountry' => 'SN'] : null,
            'sameAs' => $social ?: null,
        ]);
    }

    /** Logo de l'école (Paramètres) ou, à défaut, l'icône de l'application. */
    private static function defaultImage(): string
    {
        return self::storageUrl(Setting::get('site_logo')) ?? url('/icons/icon-512.png');
    }

    private static function storageUrl(?string $path): ?string
    {
        return $path ? url('/storage/'.ltrim($path, '/')) : null;
    }

    /** Texte brut sur une ligne : sans balises ni sauts de ligne, espaces réduits. */
    private static function plain(?string $html): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags((string) $html), ENT_QUOTES | ENT_HTML5)));
    }

    /**
     * JSON incorporable dans <script type="application/ld+json"> : « < », « > » et « & » sont échappés, pour qu'un
     * titre contenant « </script> » ne puisse pas refermer la balise.
     *
     * @param  array<string, mixed>  $data
     */
    private static function encode(array $data): string
    {
        return (string) json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
    }
}
