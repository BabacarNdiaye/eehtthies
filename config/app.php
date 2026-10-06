<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Nom de l'application
    |--------------------------------------------------------------------------
    |
    | Cette valeur est le nom de votre application, utilisé lorsque le framework doit afficher ce nom dans une
    | notification ou un autre élément d'interface.
    |
    */

    'name' => env('APP_NAME', 'Laravel'),

    /*
    |--------------------------------------------------------------------------
    | Environnement de l'application
    |--------------------------------------------------------------------------
    |
    | Cette valeur détermine l'« environnement » dans lequel l'application s'exécute actuellement. Elle peut
    | influencer la configuration préférée de divers services utilisés par l'application. Définissez-la dans
    | votre fichier « .env ».
    |
    */

    'env' => env('APP_ENV', 'production'),

    /*
    |--------------------------------------------------------------------------
    | Mode débogage de l'application
    |--------------------------------------------------------------------------
    |
    | Lorsque l'application est en mode débogage, des messages d'erreur détaillés avec traces d'appels
    | s'affichent pour chaque erreur survenant dans l'application. S'il est désactivé, une page d'erreur
    | générique simple est affichée.
    |
    */

    'debug' => (bool) env('APP_DEBUG', false),

    /*
    |--------------------------------------------------------------------------
    | URL de l'application
    |--------------------------------------------------------------------------
    |
    | Cette URL est utilisée par la console pour générer correctement les URL avec l'outil en ligne de
    | commande Artisan. Définissez-la à la racine de l'application afin qu'elle soit disponible dans les
    | commandes Artisan.
    |
    */

    'url' => env('APP_URL', 'http://localhost'),

    /*
    |--------------------------------------------------------------------------
    | Fuseau horaire de l'application
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici préciser le fuseau horaire par défaut de l'application, utilisé par les fonctions de
    | date et d'heure de PHP. Il est réglé sur « UTC » par défaut car cela convient à la plupart des cas
    | d'usage.
    |
    */

    'timezone' => 'UTC',

    /*
    |--------------------------------------------------------------------------
    | Configuration de la langue de l'application
    |--------------------------------------------------------------------------
    |
    | La langue de l'application détermine la langue par défaut utilisée par les méthodes de traduction et de
    | localisation de Laravel. Cette option peut prendre n'importe quelle langue pour laquelle vous prévoyez
    | des chaînes de traduction.
    |
    */

    // Site entièrement en français : volontairement indépendant du .env, pour
    // qu'un ancien fichier .env (APP_LOCALE=en) ne repasse pas le site en anglais.
    'locale' => 'fr',

    'fallback_locale' => 'fr',

    'faker_locale' => 'fr_FR',

    /*
    |--------------------------------------------------------------------------
    | Clé de chiffrement
    |--------------------------------------------------------------------------
    |
    | Cette clé est utilisée par les services de chiffrement de Laravel et doit être une chaîne aléatoire de
    | 32 caractères afin de garantir la sécurité de toutes les valeurs chiffrées. Faites-le avant de déployer
    | l'application.
    |
    */

    'cipher' => 'AES-256-CBC',

    'key' => env('APP_KEY'),

    'previous_keys' => [
        ...array_filter(
            explode(',', (string) env('APP_PREVIOUS_KEYS', ''))
        ),
    ],

    /*
    |--------------------------------------------------------------------------
    | Pilote du mode maintenance
    |--------------------------------------------------------------------------
    |
    | Ces options de configuration déterminent le pilote utilisé pour déterminer et gérer l'état de « mode
    | maintenance » de Laravel. Le pilote « cache » permet de contrôler le mode maintenance sur plusieurs
    | machines.
    |
    | Pilotes pris en charge : « file », « cache », « array »
    |
    */

    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
        'store' => env('APP_MAINTENANCE_STORE', 'database'),
    ],

];
