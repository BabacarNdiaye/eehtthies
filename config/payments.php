<?php

use App\Payments\SimulationGateway;

return [

    /*
    |--------------------------------------------------------------------------
    | Pilote de paiement en ligne
    |--------------------------------------------------------------------------
    |
    | « none » (par défaut) : aucun paiement en ligne, aucun bouton « Payer en ligne », aucune notification acceptée.
    | « simulation » : un faux fournisseur pour essayer le parcours sans argent réel ; refusé en production sauf si
    | PAYMENTS_ALLOW_SIMULATION=true. Pour brancher un vrai fournisseur (Wave, Orange Money, une passerelle bancaire…),
    | on écrit une classe qui implémente App\Payments\PaymentGateway, on la déclare dans « drivers » ci-dessous et on
    | met son nom dans PAYMENTS_DRIVER : voir DEPLOIEMENT.md.
    |
    */

    'driver' => env('PAYMENTS_DRIVER', 'none'),

    'allow_simulation' => (bool) env('PAYMENTS_ALLOW_SIMULATION', false),

    /*
    |--------------------------------------------------------------------------
    | Validité d'une tentative de paiement (minutes)
    |--------------------------------------------------------------------------
    |
    | Passé ce délai sans confirmation du fournisseur, la tentative est marquée « expirée » par la réconciliation
    | automatique. Une confirmation tardive est tout de même enregistrée : si l'argent est arrivé, il est dû.
    |
    */

    'attempt_ttl' => (int) env('PAYMENTS_ATTEMPT_TTL', 60),

    /*
    |--------------------------------------------------------------------------
    | Pilotes disponibles
    |--------------------------------------------------------------------------
    |
    | Chaque entrée : « class » (le pilote) et ses réglages propres, passés à son constructeur. Le « secret » signe les
    | notifications : celui de la simulation se déduit de APP_KEY quand il n'est pas fourni.
    |
    */

    'drivers' => [
        'simulation' => [
            'class' => SimulationGateway::class,
            'secret' => env('PAYMENTS_SIMULATION_SECRET'),
        ],
    ],

];
