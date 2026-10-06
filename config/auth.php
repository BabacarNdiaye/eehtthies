<?php

use App\Models\User;

return [

    /*
    |--------------------------------------------------------------------------
    | Valeurs par défaut de l'authentification
    |--------------------------------------------------------------------------
    |
    | Cette option définit le « garde » d'authentification et le « broker » de réinitialisation de mot de
    | passe par défaut de votre application. Vous pouvez modifier ces valeurs au besoin, mais elles
    | constituent un excellent point de départ pour la plupart des applications.
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Gardes d'authentification
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ensuite définir chaque garde d'authentification de votre application. Bien sûr, une
    | excellente configuration par défaut a été définie pour vous, utilisant le stockage en session et le
    | fournisseur d'utilisateurs Eloquent.
    |
    | Tous les gardes d'authentification ont un fournisseur d'utilisateurs, qui définit comment les
    | utilisateurs sont réellement récupérés dans votre base de données ou tout autre système de stockage
    | utilisé par l'application. En général, Eloquent est utilisé.
    |
    | Pris en charge : « session »
    |
    */

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Fournisseurs d'utilisateurs
    |--------------------------------------------------------------------------
    |
    | Tous les gardes d'authentification ont un fournisseur d'utilisateurs, qui définit comment les
    | utilisateurs sont réellement récupérés dans votre base de données ou tout autre système de stockage
    | utilisé par l'application. En général, Eloquent est utilisé.
    |
    | Si vous avez plusieurs tables ou modèles d'utilisateurs, vous pouvez configurer plusieurs fournisseurs
    | pour représenter le modèle ou la table. Ces fournisseurs peuvent ensuite être affectés à tous les gardes
    | d'authentification supplémentaires que vous avez définis.
    |
    | Pris en charge : « database », « eloquent »
    |
    */

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => env('AUTH_MODEL', User::class),
        ],

        // 'users' => [
        //     'driver' => 'database',
        //     'table' => 'users',
        // ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Réinitialisation des mots de passe
    |--------------------------------------------------------------------------
    |
    | Ces options de configuration précisent le comportement de la réinitialisation des mots de passe de
    | Laravel, y compris la table utilisée pour stocker les jetons et le fournisseur d'utilisateurs invoqué
    | pour récupérer réellement les utilisateurs.
    |
    | Le délai d'expiration est le nombre de minutes pendant lesquelles chaque jeton de réinitialisation est
    | considéré comme valide. Cette mesure de sécurité garde des jetons de courte durée, pour qu'ils aient
    | moins de temps pour être devinés. Vous pouvez le modifier au besoin.
    |
    | Le paramètre de limitation est le nombre de secondes qu'un utilisateur doit attendre avant de générer
    | d'autres jetons de réinitialisation. Cela l'empêche de générer rapidement un très grand nombre de jetons
    | de réinitialisation.
    |
    */

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Délai de confirmation du mot de passe
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici définir le nombre de secondes avant l'expiration d'une fenêtre de confirmation de mot de
    | passe, après quoi les utilisateurs doivent ressaisir leur mot de passe via l'écran de confirmation. Par
    | défaut, le délai est de trois heures.
    |
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
