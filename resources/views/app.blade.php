<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

        <title inertia>{{ config('app.name', 'EEHT de Thiès') }}</title>
        <meta name="description" content="Elite École Hôtelière et Touristique de Thiès - Formations professionnalisantes en hôtellerie, restauration et tourisme.">

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
