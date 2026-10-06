<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Disque de fichiers par défaut
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici préciser le disque de fichiers par défaut que le framework doit utiliser. Le disque «
    | local », ainsi que divers disques basés sur le cloud, sont disponibles pour le stockage de fichiers de
    | votre application.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Disques de fichiers
    |--------------------------------------------------------------------------
    |
    | Vous pouvez configurer ci-dessous autant de disques de fichiers que nécessaire, et même plusieurs
    | disques pour un même pilote. Des exemples pour la plupart des pilotes de stockage pris en charge sont
    | configurés ici à titre de référence.
    |
    | Pilotes pris en charge : « local », « ftp », « sftp », « s3 »
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Liens symboliques
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici configurer les liens symboliques créés lors de l'exécution de la commande Artisan
    | `storage:link`. Les clés du tableau doivent être les emplacements des liens et les valeurs leurs cibles.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
