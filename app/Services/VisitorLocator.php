<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Déduit le pays, la région et la ville d'un visiteur à partir de son adresse IP.
 *
 * Le pays est lu en priorité dans l'en-tête CF-IPCountry quand le site est derrière Cloudflare ; sinon (et pour la
 * région et la ville) l'IP est résolue via un service de géolocalisation (ipwho.is par défaut, URL configurable
 * dans config/services.php). Chaque IP n'est résolue qu'une fois par semaine (cache) et tout échec est silencieux :
 * la géolocalisation ne doit jamais gêner la navigation.
 *
 * @phpstan-type Location array{country_code: ?string, country: ?string, region: ?string, city: ?string}
 */
class VisitorLocator
{
    /** @return array{country_code: ?string, country: ?string, region: ?string, city: ?string} */
    public function locate(Request $request): array
    {
        $empty = ['country_code' => null, 'country' => null, 'region' => null, 'city' => null];
        $ip = $request->ip();

        if (! $ip || ! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return $empty;
        }

        $url = config('services.geoip.url');
        $location = $url ? Cache::remember("geoip:$ip", now()->addDays(7), fn () => $this->lookup($url, $ip) ?? $empty) : $empty;

        $header = strtoupper((string) $request->header('CF-IPCountry'));
        if ($location['country_code'] === null && preg_match('/^[A-Z]{2}$/', $header) && ! in_array($header, ['XX', 'T1'], true)) {
            $location['country_code'] = $header;
            $location['country'] = $this->countryName($header);
        }

        return $location;
    }

    private function lookup(string $baseUrl, string $ip): ?array
    {
        try {
            $response = Http::timeout(3)->acceptJson()->get(rtrim($baseUrl, '/').'/'.$ip, ['lang' => 'fr']);
            $data = $response->json();

            if (! $response->ok() || ! is_array($data) || ($data['success'] ?? true) === false) {
                return null;
            }

            $code = strtoupper((string) ($data['country_code'] ?? ''));

            return [
                'country_code' => $code !== '' ? substr($code, 0, 2) : null,
                'country' => $data['country'] ?? null,
                'region' => $data['region'] ?? null,
                'city' => $data['city'] ?? null,
            ];
        } catch (Throwable) {
            return null;
        }
    }

    private function countryName(string $code): string
    {
        if (class_exists(\Locale::class)) {
            $name = \Locale::getDisplayRegion('-'.$code, 'fr');
            if ($name && $name !== $code) {
                return $name;
            }
        }

        return $code;
    }
}
