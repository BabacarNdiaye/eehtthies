<?php

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Pilote de session par défaut
    |--------------------------------------------------------------------------
    |
    | Cette option détermine le pilote de session par défaut utilisé pour les requêtes entrantes. Laravel
    | prend en charge divers modes de stockage pour conserver les données de session. Le stockage en base de
    | données est un excellent choix par défaut.
    |
    | Pris en charge : « file », « cookie », « database », « memcached », « redis », « dynamodb », « array »
    |
    */

    'driver' => env('SESSION_DRIVER', 'database'),

    /*
    |--------------------------------------------------------------------------
    | Durée de vie de la session
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici préciser le nombre de minutes pendant lesquelles la session peut rester inactive avant
    | d'expirer. Si vous voulez qu'elle expire dès la fermeture du navigateur, vous pouvez l'indiquer via
    | l'option de configuration expire_on_close.
    |
    */

    'lifetime' => (int) env('SESSION_LIFETIME', 120),

    'expire_on_close' => env('SESSION_EXPIRE_ON_CLOSE', false),

    /*
    |--------------------------------------------------------------------------
    | Chiffrement de la session
    |--------------------------------------------------------------------------
    |
    | Cette option permet d'indiquer facilement que toutes les données de session doivent être chiffrées avant
    | d'être stockées. Tout le chiffrement est effectué automatiquement par Laravel et vous pouvez utiliser la
    | session normalement.
    |
    */

    'encrypt' => env('SESSION_ENCRYPT', false),

    /*
    |--------------------------------------------------------------------------
    | Emplacement des fichiers de session
    |--------------------------------------------------------------------------
    |
    | Avec le pilote de session « file », les fichiers de session sont placés sur disque. L'emplacement de
    | stockage par défaut est défini ici ; vous êtes toutefois libre d'indiquer un autre emplacement.
    |
    */

    'files' => storage_path('framework/sessions'),

    /*
    |--------------------------------------------------------------------------
    | Connexion à la base de données des sessions
    |--------------------------------------------------------------------------
    |
    | Avec les pilotes de session « database » ou « redis », vous pouvez indiquer la connexion à utiliser pour
    | gérer ces sessions. Elle doit correspondre à une connexion de vos options de configuration de base de
    | données.
    |
    */

    'connection' => env('SESSION_CONNECTION'),

    /*
    |--------------------------------------------------------------------------
    | Table de la base de données des sessions
    |--------------------------------------------------------------------------
    |
    | Avec le pilote de session « database », vous pouvez indiquer la table utilisée pour stocker les
    | sessions. Bien sûr, une valeur par défaut raisonnable est définie pour vous ; vous pouvez toutefois la
    | remplacer par une autre table.
    |
    */

    'table' => env('SESSION_TABLE', 'sessions'),

    /*
    |--------------------------------------------------------------------------
    | Magasin de cache des sessions
    |--------------------------------------------------------------------------
    |
    | Avec l'un des backends de session pilotés par le cache du framework, vous pouvez définir le magasin de
    | cache utilisé pour stocker les données de session entre les requêtes. Il doit correspondre à l'un de vos
    | magasins de cache définis.
    |
    | Concerne : « dynamodb », « memcached », « redis »
    |
    */

    'store' => env('SESSION_STORE'),

    /*
    |--------------------------------------------------------------------------
    | Loterie de nettoyage des sessions
    |--------------------------------------------------------------------------
    |
    | Certains pilotes de session doivent nettoyer manuellement leur emplacement de stockage pour se
    | débarrasser des anciennes sessions. Voici les chances que cela se produise lors d'une requête donnée.
    | Par défaut, les chances sont de 2 sur 100.
    |
    */

    'lottery' => [2, 100],

    /*
    |--------------------------------------------------------------------------
    | Nom du cookie de session
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici modifier le nom du cookie de session créé par le framework. En général, vous n'avez pas
    | besoin de changer cette valeur, car cela n'apporte pas d'amélioration de sécurité significative.
    |
    */

    'cookie' => env(
        'SESSION_COOKIE',
        Str::slug((string) env('APP_NAME', 'laravel')).'-session'
    ),

    /*
    |--------------------------------------------------------------------------
    | Chemin du cookie de session
    |--------------------------------------------------------------------------
    |
    | Le chemin du cookie de session détermine le chemin pour lequel le cookie sera considéré comme
    | disponible. En général, c'est la racine de votre application, mais vous êtes libre de le changer si
    | nécessaire.
    |
    */

    'path' => env('SESSION_PATH', '/'),

    /*
    |--------------------------------------------------------------------------
    | Domaine du cookie de session
    |--------------------------------------------------------------------------
    |
    | Cette valeur détermine le domaine et les sous-domaines auxquels le cookie de session est disponible. Par
    | défaut, le cookie est disponible pour le domaine racine, sans les sous-domaines. En général, cela ne
    | devrait pas être modifié.
    |
    */

    'domain' => env('SESSION_DOMAIN'),

    /*
    |--------------------------------------------------------------------------
    | Cookies HTTPS uniquement
    |--------------------------------------------------------------------------
    |
    | En mettant cette option à true, les cookies de session ne seront renvoyés au serveur que si le
    | navigateur utilise une connexion HTTPS. Cela évite que le cookie vous soit envoyé lorsqu'il ne peut pas
    | l'être de façon sécurisée.
    |
    */

    'secure' => env('SESSION_SECURE_COOKIE'),

    /*
    |--------------------------------------------------------------------------
    | Accès HTTP uniquement
    |--------------------------------------------------------------------------
    |
    | Mettre cette valeur à true empêche JavaScript d'accéder à la valeur du cookie, qui n'est alors
    | accessible que via le protocole HTTP. Il est peu probable que vous deviez désactiver cette option.
    |
    */

    'http_only' => env('SESSION_HTTP_ONLY', true),

    /*
    |--------------------------------------------------------------------------
    | Cookies Same-Site
    |--------------------------------------------------------------------------
    |
    | Cette option détermine le comportement de vos cookies lors de requêtes inter-sites, et peut servir à
    | atténuer les attaques CSRF. Par défaut, cette valeur est « lax » afin d'autoriser les requêtes
    | inter-sites sûres.
    |
    | Voir : https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value
    |
    | Pris en charge : « lax », « strict », « none », null
    |
    */

    'same_site' => env('SESSION_SAME_SITE', 'lax'),

    /*
    |--------------------------------------------------------------------------
    | Cookies partitionnés
    |--------------------------------------------------------------------------
    |
    | Mettre cette valeur à true lie le cookie au site de premier niveau dans un contexte inter-sites. Les
    | cookies partitionnés sont acceptés par le navigateur lorsqu'ils sont marqués « secure » et que
    | l'attribut Same-Site vaut « none ».
    |
    */

    'partitioned' => env('SESSION_PARTITIONED_COOKIE', false),

    /*
    |--------------------------------------------------------------------------
    | Sérialisation de la session
    |--------------------------------------------------------------------------
    |
    | Cette valeur contrôle la stratégie de sérialisation des données de session, JSON par défaut. La mettre
    | sur « php » permet de stocker des objets PHP dans la session, mais peut rendre une application
    | vulnérable aux attaques de sérialisation par « chaîne de gadgets » si l'APP_KEY fuit.
    |
    | Pris en charge : « json », « php »
    |
    */

    'serialization' => 'json',

];
