<?php

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Magasin de cache par défaut
    |--------------------------------------------------------------------------
    |
    | Cette option contrôle le magasin de cache par défaut utilisé par le framework. Cette connexion est
    | utilisée si aucune autre n'est explicitement indiquée lors d'une opération de cache dans l'application.
    |
    */

    'default' => env('CACHE_STORE', 'database'),

    /*
    |--------------------------------------------------------------------------
    | Magasins de cache
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici définir tous les « magasins » de cache de votre application ainsi que leurs pilotes.
    | Vous pouvez même définir plusieurs magasins pour un même pilote afin de regrouper des types d'éléments
    | stockés dans vos caches.
    |
    | Pilotes pris en charge : « array », « database », « file », « memcached », « redis », « dynamodb », «
    | storage », « octane », « session », « failover », « null »
    |
    */

    'stores' => [

        'array' => [
            'driver' => 'array',
            'serialize' => false,
        ],

        'database' => [
            'driver' => 'database',
            'connection' => env('DB_CACHE_CONNECTION'),
            'table' => env('DB_CACHE_TABLE', 'cache'),
            'lock_connection' => env('DB_CACHE_LOCK_CONNECTION'),
            'lock_table' => env('DB_CACHE_LOCK_TABLE'),
        ],

        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
            'lock_path' => storage_path('framework/cache/data'),
        ],

        'storage' => [
            'driver' => 'storage',
            'disk' => env('CACHE_STORAGE_DISK'),
            'path' => env('CACHE_STORAGE_PATH', 'framework/cache/data'),
        ],

        'memcached' => [
            'driver' => 'memcached',
            'persistent_id' => env('MEMCACHED_PERSISTENT_ID'),
            'sasl' => [
                env('MEMCACHED_USERNAME'),
                env('MEMCACHED_PASSWORD'),
            ],
            'options' => [
                // Memcached::OPT_CONNECT_TIMEOUT => 2000,
            ],
            'servers' => [
                [
                    'host' => env('MEMCACHED_HOST', '127.0.0.1'),
                    'port' => env('MEMCACHED_PORT', 11211),
                    'weight' => 100,
                ],
            ],
        ],

        'redis' => [
            'driver' => 'redis',
            'connection' => env('REDIS_CACHE_CONNECTION', 'cache'),
            'lock_connection' => env('REDIS_CACHE_LOCK_CONNECTION', 'default'),
        ],

        'dynamodb' => [
            'driver' => 'dynamodb',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'table' => env('DYNAMODB_CACHE_TABLE', 'cache'),
            'endpoint' => env('DYNAMODB_ENDPOINT'),
        ],

        'octane' => [
            'driver' => 'octane',
        ],

        'failover' => [
            'driver' => 'failover',
            'stores' => [
                'database',
                'array',
            ],
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Préfixe des clés de cache
    |--------------------------------------------------------------------------
    |
    | Avec les magasins de cache APC, base de données, memcached, Redis et DynamoDB, d'autres applications
    | peuvent utiliser le même cache. Pour cette raison, vous pouvez préfixer chaque clé de cache afin
    | d'éviter les collisions.
    |
    */

    'prefix' => env('CACHE_PREFIX', Str::slug((string) env('APP_NAME', 'laravel')).'-cache-'),

    /*
    |--------------------------------------------------------------------------
    | Classes sérialisables
    |--------------------------------------------------------------------------
    |
    | Cette valeur détermine les classes pouvant être désérialisées depuis le stockage du cache. Par défaut,
    | aucune classe PHP n'est désérialisée depuis votre cache, afin d'empêcher les attaques par chaîne de
    | gadgets si votre APP_KEY fuit.
    |
    */

    'serializable_classes' => false,

];
