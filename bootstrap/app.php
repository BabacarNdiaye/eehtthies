<?php

use App\Http\Middleware\EnsureUserIsStaff;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\TrackLastSeen;
use App\Http\Middleware\TrackSiteVisit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR |
                Request::HEADER_X_FORWARDED_HOST |
                Request::HEADER_X_FORWARDED_PORT |
                Request::HEADER_X_FORWARDED_PROTO,
        );

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SecurityHeaders::class,
            TrackLastSeen::class,
            TrackSiteVisit::class,
        ]);

        // Refus d'appel depuis une notification et notifications du fournisseur de paiement : ni l'un ni l'autre ne vient
        // d'un navigateur connecté, chacun est protégé par une signature.
        $middleware->validateCsrfTokens(except: ['connect/calls/*/push-decline', 'paiements/webhook/*']);

        $middleware->alias([
            'staff' => EnsureUserIsStaff::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Messages d'erreur renvoyés à l'interface toujours en français
        // (« This action is unauthorized. », « Server Error », message vide…).
        $exceptions->respond(function (Response $response) {
            if (! $response instanceof JsonResponse) {
                return $response;
            }
            $data = $response->getData(true);
            if (! is_array($data) || ! array_key_exists('message', $data) || ! is_string($data['message'])) {
                return $response;
            }

            if (str_starts_with($data['message'], 'No query results for model')) {
                $data['message'] = ''; // « No query results for model [App\Models\…] »
            }

            $message = $data['message'] !== '' ? __($data['message']) : match ($response->getStatusCode()) {
                401 => 'Vous devez être connecté(e).',
                403 => "Vous n'êtes pas autorisé(e) à effectuer cette action.",
                404 => 'Élément introuvable.',
                409 => 'Cette action est impossible pour le moment.',
                419 => 'Votre session a expiré. Actualisez la page et réessayez.',
                422 => 'Les données saisies sont invalides.',
                429 => 'Trop de requêtes. Réessayez dans un instant.',
                default => $response->getStatusCode() >= 500 ? 'Une erreur est survenue sur le serveur.' : '',
            };

            if ($message !== $data['message']) {
                $response->setData(['message' => $message] + $data);
            }

            return $response;
        });
    })->create();
