<?php

namespace App\Http\Middleware;

use App\Models\SiteVisit;
use App\Services\VisitorLocator;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Alimente la section « Visiteurs du site » de l'onglet Trafic : une ligne par page publique consultée par un
 * visiteur non connecté. L'enregistrement (et la géolocalisation) se fait dans terminate(), une fois la réponse
 * envoyée, et ne doit jamais faire échouer une requête.
 */
class TrackSiteVisit
{
    /** Noms de routes (préfixes) constituant le site public. */
    private const PUBLIC_ROUTES = [
        'home', 'pages.', 'formations.', 'news.', 'events.', 'gallery.', 'candidature.', 'careers.', 'community.',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        try {
            if (! $this->shouldTrack($request, $response)) {
                return;
            }

            SiteVisit::create([
                'ip_address' => $request->ip(),
                'path' => '/'.ltrim(substr($request->path(), 0, 250), '/'),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ] + app(VisitorLocator::class)->locate($request));
        } catch (Throwable $e) {
            report($e);
        }
    }

    private function shouldTrack(Request $request, Response $response): bool
    {
        if (! $request->isMethod('GET') || $response->getStatusCode() !== 200 || $request->user()) {
            return false;
        }

        if ($request->headers->has('X-Inertia-Partial-Component') || $request->prefetch()) {
            return false;
        }

        $agent = (string) $request->userAgent();
        if ($agent === '' || preg_match('/bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python|headless/i', $agent)) {
            return false;
        }

        $name = (string) $request->route()?->getName();
        foreach (self::PUBLIC_ROUTES as $prefix) {
            if ($name === $prefix || (str_ends_with($prefix, '.') && str_starts_with($name, $prefix))) {
                return true;
            }
        }

        return false;
    }
}
