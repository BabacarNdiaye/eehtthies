<?php

use NotificationChannels\WebPush\PushSubscription;

return [

    /**
     * Ce sont les clés d'authentification (VAPID). Ces clés doivent être stockées en sécurité et ne doivent
     * pas changer.
     */
    'vapid' => [
        'subject' => env('VAPID_SUBJECT'),
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        'pem_file' => env('VAPID_PEM_FILE'),
    ],

    /**
     * C'est le modèle utilisé pour les abonnements push.
     */
    'model' => PushSubscription::class,

    /**
     * C'est le nom de la table créée par la migration et utilisée par le modèle PushSubscription fourni avec
     * ce paquet.
     */
    'table_name' => env('WEBPUSH_DB_TABLE', 'push_subscriptions'),

    /**
     * C'est la connexion à la base de données utilisée par la migration et par le modèle PushSubscription
     * fourni avec ce paquet.
     */
    'database_connection' => env('WEBPUSH_DB_CONNECTION', env('DB_CONNECTION', 'mysql')),

    /**
     * Les options du client HTTP utilisées pour délivrer les notifications push.
     */
    'client_options' => [],

    /**
     * Le remplissage automatique en octets utilisé par Minishlink\WebPush. Mettre false pour prendre en
     * charge Firefox Android avec l'endpoint v1.
     */
    'automatic_padding' => env('WEBPUSH_AUTOMATIC_PADDING', true),

];
