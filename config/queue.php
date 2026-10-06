<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Nom de la connexion de file d'attente par défaut
    |--------------------------------------------------------------------------
    |
    | La file d'attente de Laravel prend en charge divers backends via une API unique et unifiée, ce qui vous
    | donne un accès pratique à chacun avec une syntaxe identique. La connexion de file d'attente par défaut
    | est définie ci-dessous.
    |
    */

    'default' => env('QUEUE_CONNECTION', 'database'),

    /*
    |--------------------------------------------------------------------------
    | Connexions de file d'attente
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici configurer les options de connexion de chaque backend de file d'attente utilisé par
    | votre application. Un exemple de configuration est fourni pour chaque backend pris en charge par
    | Laravel. Vous êtes aussi libre d'en ajouter d'autres.
    |
    | Pilotes : « sync », « database », « beanstalkd », « sqs », « redis », « deferred », « background », «
    | failover », « null »
    |
    */

    'connections' => [

        'sync' => [
            'driver' => 'sync',
        ],

        'database' => [
            'driver' => 'database',
            'connection' => env('DB_QUEUE_CONNECTION'),
            'table' => env('DB_QUEUE_TABLE', 'jobs'),
            'queue' => env('DB_QUEUE', 'default'),
            'retry_after' => (int) env('DB_QUEUE_RETRY_AFTER', 90),
            'after_commit' => false,
        ],

        'beanstalkd' => [
            'driver' => 'beanstalkd',
            'host' => env('BEANSTALKD_QUEUE_HOST', 'localhost'),
            'queue' => env('BEANSTALKD_QUEUE', 'default'),
            'retry_after' => (int) env('BEANSTALKD_QUEUE_RETRY_AFTER', 90),
            'block_for' => 0,
            'after_commit' => false,
        ],

        'sqs' => [
            'driver' => 'sqs',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'prefix' => env('SQS_PREFIX', 'https://sqs.us-east-1.amazonaws.com/your-account-id'),
            'queue' => env('SQS_QUEUE', 'default'),
            'suffix' => env('SQS_SUFFIX'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'after_commit' => false,
        ],

        'redis' => [
            'driver' => 'redis',
            'connection' => env('REDIS_QUEUE_CONNECTION', 'default'),
            'queue' => env('REDIS_QUEUE', 'default'),
            'retry_after' => (int) env('REDIS_QUEUE_RETRY_AFTER', 90),
            'block_for' => null,
            'after_commit' => false,
        ],

        'deferred' => [
            'driver' => 'deferred',
        ],

        'background' => [
            'driver' => 'background',
        ],

        'failover' => [
            'driver' => 'failover',
            'connections' => [
                'database',
                'deferred',
            ],
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Traitement par lots des jobs
    |--------------------------------------------------------------------------
    |
    | Les options suivantes configurent la base de données et la table qui stockent les informations de
    | traitement par lots des jobs. Elles peuvent être modifiées pour n'importe quelle connexion de base de
    | données et table définie par votre application.
    |
    */

    'batching' => [
        'database' => env('DB_CONNECTION', 'sqlite'),
        'table' => 'job_batches',
    ],

    /*
    |--------------------------------------------------------------------------
    | Jobs de file d'attente échoués
    |--------------------------------------------------------------------------
    |
    | Ces options configurent le comportement de la journalisation des jobs de file d'attente échoués, pour
    | que vous puissiez contrôler comment et où ils sont stockés. Laravel prend en charge le stockage des jobs
    | échoués dans un simple fichier ou dans une base de données.
    |
    | Pilotes pris en charge : « database-uuids », « dynamodb », « file », « null »
    |
    */

    'failed' => [
        'driver' => env('QUEUE_FAILED_DRIVER', 'database-uuids'),
        'database' => env('DB_CONNECTION', 'sqlite'),
        'table' => 'failed_jobs',
    ],

];
