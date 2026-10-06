<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

        {{-- Titre, description, aperçu de partage (WhatsApp, Facebook, X), adresse canonique et données structurées :
             écrits ici, côté serveur, car les robots de partage n'exécutent pas le JavaScript. Voir App\Support\Seo. --}}
        @php($seo = \App\Support\Seo::forRequest(request()))
        <title inertia>{{ $seo['title'] }}</title>
        <meta name="description" content="{{ $seo['description'] }}">
        <meta name="robots" content="{{ $seo['robots'] }}">
        @if ($seo['canonical'])
        <link rel="canonical" href="{{ $seo['canonical'] }}">
        @endif
        <meta property="og:site_name" content="{{ $seo['site_name'] }}">
        <meta property="og:locale" content="{{ $seo['locale'] }}">
        <meta property="og:type" content="{{ $seo['type'] }}">
        <meta property="og:title" content="{{ $seo['title'] }}">
        <meta property="og:description" content="{{ $seo['description'] }}">
        @if ($seo['url'])
        <meta property="og:url" content="{{ $seo['url'] }}">
        @endif
        @if ($seo['image'])
        <meta property="og:image" content="{{ $seo['image'] }}">
        @endif
        @if ($seo['published_time'])
        <meta property="article:published_time" content="{{ $seo['published_time'] }}">
        @endif
        <meta name="twitter:card" content="{{ $seo['card'] }}">
        <meta name="twitter:title" content="{{ $seo['title'] }}">
        <meta name="twitter:description" content="{{ $seo['description'] }}">
        @if ($seo['image'])
        <meta name="twitter:image" content="{{ $seo['image'] }}">
        @endif
        @if ($seo['json_ld'])
        <script type="application/ld+json">{!! $seo['json_ld'] !!}</script>
        @endif

        {{-- PWA : installable sur Android (manifest) et iOS (balises meta apple-*) --}}
        <link rel="manifest" href="{{ route('pwa.manifest') }}">
        <meta name="theme-color" content="{{ \App\Models\Setting::get('theme_neutral_color') ?: '#50022b' }}">
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png">
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="{{ \App\Models\Setting::get('site_short_name') ?: 'EEHT' }}">
        <meta name="mobile-web-app-capable" content="yes">

        <!-- Polices -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,500&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

        {{-- Couleurs du thème du site, configurables depuis Admin > Paramètres --}}
        <style>{!! \App\Support\ThemePalette::cssVariables() !!}</style>

        <!-- Scripts -->
        @routes(nonce: \Illuminate\Support\Facades\Vite::cspNonce())
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
