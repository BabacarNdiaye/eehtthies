<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Expéditeur par défaut
    |--------------------------------------------------------------------------
    |
    | Cette option contrôle l'expéditeur par défaut utilisé pour envoyer tous les e-mails, sauf si un autre
    | est explicitement indiqué lors de l'envoi. Tous les expéditeurs supplémentaires peuvent être configurés
    | dans le tableau « mailers ». Des exemples de chaque type d'expéditeur sont fournis.
    |
    */

    'default' => env('MAIL_MAILER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Configurations des expéditeurs
    |--------------------------------------------------------------------------
    |
    | Vous pouvez ici configurer tous les expéditeurs utilisés par votre application ainsi que leurs
    | paramètres respectifs. Plusieurs exemples ont été configurés pour vous et vous êtes libre d'ajouter les
    | vôtres selon les besoins de votre application.
    |
    | Laravel prend en charge une variété de pilotes de « transport » de courrier pour l'envoi des e-mails.
    | Vous pouvez indiquer ci-dessous celui que vous utilisez pour vos expéditeurs. Vous pouvez aussi ajouter
    | d'autres expéditeurs si nécessaire.
    |
    | Pris en charge : « smtp », « sendmail », « mailgun », « ses », « ses-v2 », « postmark », « resend », «
    | log », « array », « failover », « roundrobin »
    |
    */

    'mailers' => [

        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

        'ses' => [
            'transport' => 'ses',
        ],

        'postmark' => [
            'transport' => 'postmark',
            // 'message_stream_id' => env('POSTMARK_MESSAGE_STREAM_ID'),
            // 'client' => [
            //     'timeout' => 5,
            // ],
        ],

        'resend' => [
            'transport' => 'resend',
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => env('MAIL_SENDMAIL_PATH', '/usr/sbin/sendmail -bs -i'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
            'retry_after' => 60,
        ],

        'roundrobin' => [
            'transport' => 'roundrobin',
            'mailers' => [
                'ses',
                'postmark',
            ],
            'retry_after' => 60,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Adresse « From » globale
    |--------------------------------------------------------------------------
    |
    | Vous pouvez vouloir que tous les e-mails envoyés par votre application partent de la même adresse. Vous
    | pouvez ici préciser un nom et une adresse utilisés globalement pour tous les e-mails envoyés par votre
    | application.
    |
    */

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
        'name' => env('MAIL_FROM_NAME', env('APP_NAME', 'Laravel')),
    ],

];
