<?php

namespace App\Http\Middleware;

use App\Support\GoogleAnalytics;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        Vite::useCspNonce();

        $response = $next($request);

        $nonce = Vite::cspNonce();

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // script-src est verrouillé par nonce (pas de 'unsafe-inline') ; style-src reste permissif, car les
        // variables CSS du thème sont injectées dans un bloc <style> en ligne et Tailwind/React s'appuient
        // sur des attributs style en ligne — le risque de XSS par les styles est bien plus faible que par les
        // scripts.
        // Google Analytics n'est autorisé que lorsqu'un identifiant de mesure est configuré.
        $ga = GoogleAnalytics::id() !== null;
        $gaHosts = 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com';

        $response->headers->set('Content-Security-Policy', implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'nonce-{$nonce}'".($ga ? ' https://www.googletagmanager.com' : ''),
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data:".($ga ? " $gaHosts" : ''),
            "connect-src 'self'".($ga ? " $gaHosts" : ''),
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'self'",
            "form-action 'self'",
        ]));

        return $response;
    }
}
