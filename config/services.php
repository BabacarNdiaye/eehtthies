<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Services tiers
    |--------------------------------------------------------------------------
    |
    | Ce fichier sert à stocker les identifiants des services tiers tels que Resend, Postmark, AWS, etc. Il
    | constitue l'emplacement de fait pour ce type d'information, et permet aux paquets de disposer d'un
    | fichier conventionnel pour retrouver les divers identifiants de service.
    |
    */

    // Assistant IA d'EEHT Connect (suggestions de réponses, résumés,
    // reformulation, traduction). Désactivé tant qu'aucune clé n'est définie.
    // Relais TURN facultatif pour les appels EEHT Connect : indispensable
    // quand les deux personnes sont derrière des réseaux restrictifs (certains
    // réseaux mobiles, pare-feux d'entreprise). Plusieurs URL séparées par des
    // virgules, ex. « turn:turn.exemple.sn:3478,turns:turn.exemple.sn:5349 ».
    'turn' => [
        'url' => env('TURN_URL'),
        'username' => env('TURN_USERNAME'),
        'credential' => env('TURN_CREDENTIAL'),
    ],

    // Géolocalisation des visiteurs du site public (onglet Trafic). Vide = désactivée (seul l'en-tête
    // CF-IPCountry de Cloudflare, s'il existe, renseigne alors le pays).
    'geoip' => [
        'url' => env('GEOIP_URL', 'https://ipwho.is'),
    ],

    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
        'model' => env('ANTHROPIC_MODEL', 'claude-opus-5-5'),
        'effort' => env('ANTHROPIC_EFFORT', 'low'),
    ],

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
