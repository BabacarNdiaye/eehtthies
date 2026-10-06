{{--
    Gabarit des pages d'erreur (401, 402, 403, 404, 419, 429, 500, 503) : il remplace celui du framework, en anglais, sans
    aucun lien de sortie. Une personne dont le rôle n'ouvre pas une rubrique, ou qui suit un lien périmé, retrouve
    ainsi son espace d'un geste. Aucune ressource externe : cette page doit s'afficher même quand tout le reste est
    en panne (les liens ont target="_top" parce qu'Inertia affiche une réponse non Inertia dans une iframe).
--}}
@php
    $status = trim($__env->yieldContent('code'));
    $title = trim($__env->yieldContent('title'));
    $message = trim($__env->yieldContent('message'));

    $hints = [
        '401' => 'Connectez-vous pour continuer.',
        '403' => "Si vous pensez que c'est une erreur, demandez à l'administrateur d'ajuster votre rôle.",
        '404' => "L'adresse est peut-être erronée, ou la page a été déplacée.",
        '419' => "Rechargez la page, puis recommencez : rien n'a été enregistré.",
        '429' => 'Patientez quelques secondes avant de réessayer.',
        '500' => "Ce n'est pas de votre fait. Réessayez dans un instant ; si le problème persiste, prévenez l'administrateur.",
        '503' => 'Le site est en maintenance. Revenez dans quelques minutes.',
    ];
    $hint = $hints[$status] ?? null;

    // En mode maintenance la session n'est pas encore démarrée : on ne présume pas qu'elle existe.
    try {
        $signedIn = auth()->check();
    } catch (Throwable) {
        $signedIn = false;
    }
@endphp
<!DOCTYPE html>
<html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="robots" content="noindex">

        <title>{{ $title }} - {{ config('app.name') }}</title>

        <style>
            *, *::before, *::after { box-sizing: border-box; }
            html { -webkit-text-size-adjust: 100%; }
            body {
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
                background: #f4f5f5;
                color: #0b1728;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.5;
            }
            main {
                width: 100%;
                max-width: 28rem;
                padding: 2rem 1.5rem;
                border-radius: 1.5rem;
                background: #fff;
                box-shadow: 0 10px 40px -12px rgba(11, 23, 40, 0.25);
                text-align: center;
            }
            .brand {
                display: inline-flex;
                align-items: center;
                gap: 0.625rem;
                color: inherit;
                font-size: 0.9375rem;
                font-weight: 600;
                text-decoration: none;
            }
            .mark {
                display: inline-flex;
                width: 2.5rem;
                height: 2.5rem;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: #c8942a;
                color: #0b1728;
                font-family: "Playfair Display", Georgia, "Times New Roman", serif;
                font-size: 1.25rem;
                font-weight: 700;
            }
            .code {
                margin: 1.75rem 0 0.25rem;
                color: #4d5662;
                font-size: 0.8125rem;
                font-weight: 600;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }
            h1 {
                margin: 0;
                font-family: "Playfair Display", Georgia, "Times New Roman", serif;
                font-size: 1.75rem;
                line-height: 1.2;
            }
            p { margin: 0.75rem 0 0; }
            .hint { color: #4d5662; font-size: 0.9375rem; }
            .actions { display: flex; flex-direction: column; gap: 0.625rem; margin-top: 1.75rem; }
            .button {
                display: inline-flex;
                min-height: 2.75rem;
                align-items: center;
                justify-content: center;
                padding: 0 1.25rem;
                border-radius: 0.75rem;
                background: #0b1728;
                color: #fff;
                font-size: 0.9375rem;
                font-weight: 600;
                text-decoration: none;
            }
            .button.quiet { border: 1px solid #d3d6da; background: #fff; color: #0b1728; }
            .button:focus-visible, .brand:focus-visible { outline: 2px solid #c8942a; outline-offset: 2px; }
        </style>
    </head>
    <body>
        <main>
            <a class="brand" href="{{ url('/') }}" target="_top">
                <span class="mark" aria-hidden="true">E</span>
                {{ config('app.name') }}
            </a>

            <p class="code">Erreur {{ $status }}</p>
            <h1>{{ $title }}</h1>

            @if ($message !== '' && $message !== $title)
                <p>{{ $message }}</p>
            @endif

            @if ($hint)
                <p class="hint">{{ $hint }}</p>
            @endif

            <div class="actions">
                @if ($signedIn)
                    <a class="button" href="{{ route('dashboard') }}" target="_top">Retour à mon espace</a>
                    <a class="button quiet" href="{{ route('home') }}" target="_top">Site public</a>
                @else
                    <a class="button" href="{{ route('home') }}" target="_top">Retour à l'accueil</a>
                    <a class="button quiet" href="{{ route('login') }}" target="_top">Se connecter</a>
                @endif
            </div>
        </main>
    </body>
</html>
