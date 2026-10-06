<?php

use Spatie\Permission\DefaultTeamResolver;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return [

    'models' => [

        /*
         * Avec le trait « HasPermissions » de ce paquet, nous devons savoir quel modèle Eloquent utiliser
         * pour récupérer vos permissions. Bien sûr, c'est souvent simplement le modèle « Permission », mais
         * vous pouvez utiliser ce que vous voulez.
         *
         * Le modèle que vous voulez utiliser comme modèle de permission doit implémenter le contrat
         * `Spatie\Permission\Contracts\Permission`.
         */

        'permission' => Permission::class,

        /*
         * Avec le trait « HasRoles » de ce paquet, nous devons savoir quel modèle Eloquent utiliser pour
         * récupérer vos rôles. Bien sûr, c'est souvent simplement le modèle « Role », mais vous pouvez
         * utiliser ce que vous voulez.
         *
         * Le modèle que vous voulez utiliser comme modèle de rôle doit implémenter le contrat
         * `Spatie\Permission\Contracts\Role`.
         */

        'role' => Role::class,

        /*
         * Avec la fonctionnalité « Teams » de ce paquet, nous devons savoir quel modèle Eloquent utiliser
         * pour récupérer vos équipes. Bien sûr, c'est souvent simplement le modèle « Team », mais vous pouvez
         * utiliser ce que vous voulez.
         */
        'team' => null,

        /*
         * Avec le trait « HasModels » et en passant des identifiants bruts à syncModels, attachModels ou
         * detachModels, cette classe de modèle sert à résoudre ces identifiants. Si elle vaut null, on
         * utilise par défaut le modèle du garde.
         */
        'default_model' => null,
    ],

    'table_names' => [

        /*
         * Avec le trait « HasRoles » de ce paquet, nous devons savoir quelle table utiliser pour récupérer
         * vos rôles. Nous avons choisi une valeur par défaut simple, mais vous pouvez facilement la remplacer
         * par la table de votre choix.
         */

        'roles' => 'roles',

        /*
         * Avec le trait « HasPermissions » de ce paquet, nous devons savoir quelle table utiliser pour
         * récupérer vos permissions. Nous avons choisi une valeur par défaut simple, mais vous pouvez
         * facilement la remplacer par la table de votre choix.
         */

        'permissions' => 'permissions',

        /*
         * Avec le trait « HasPermissions » de ce paquet, nous devons savoir quelle table utiliser pour
         * récupérer les permissions de vos modèles. Nous avons choisi une valeur par défaut simple, mais vous
         * pouvez facilement la remplacer par la table de votre choix.
         */

        'model_has_permissions' => 'model_has_permissions',

        /*
         * Avec le trait « HasRoles » de ce paquet, nous devons savoir quelle table utiliser pour récupérer
         * les rôles de vos modèles. Nous avons choisi une valeur par défaut simple, mais vous pouvez
         * facilement la remplacer par la table de votre choix.
         */

        'model_has_roles' => 'model_has_roles',

        /*
         * Avec le trait « HasRoles » de ce paquet, nous devons savoir quelle table utiliser pour récupérer
         * les permissions de vos rôles. Nous avons choisi une valeur par défaut simple, mais vous pouvez
         * facilement la remplacer par la table de votre choix.
         */

        'role_has_permissions' => 'role_has_permissions',
    ],

    'column_names' => [
        /*
         * Modifiez ceci si vous voulez nommer les tables pivot associées autrement que par défaut
         */
        'role_pivot_key' => null, // default 'role_id',
        'permission_pivot_key' => null, // default 'permission_id',

        /*
         * Modifiez ceci si vous voulez nommer la clé primaire du modèle associé autrement que `model_id`.
         *
         * Par exemple, c'est pratique si vos clés primaires sont toutes des UUID. Dans ce cas, nommez-la
         * `model_uuid`.
         */

        'model_morph_key' => 'model_id',

        /*
         * Modifiez ceci si vous voulez utiliser la fonctionnalité d'équipes et que la clé étrangère de votre
         * modèle associé n'est pas `team_id`.
         */

        'team_foreign_key' => 'team_id',
    ],

    /*
     * Lorsque la valeur est true, la méthode de vérification des permissions est enregistrée sur le gate.
     * Mettez false si vous voulez implémenter votre propre logique de vérification des permissions.
     */

    'register_permission_check_method' => true,

    /*
     * Lorsque la valeur est true, l'écouteur d'événement Laravel\Octane\Events\OperationTerminated est
     * enregistré ; cela rafraîchit les permissions à chaque TickTerminated, TaskTerminated et
     * RequestTerminated
     * REMARQUE : cela ne devrait pas être nécessaire dans la plupart des cas, mais une combinaison
     * Octane/Vapor en a bénéficié.
     */
    'register_octane_reset_listener' => false,

    /*
     * Des événements sont déclenchés lorsqu'un rôle ou une permission est attribué ou retiré :
     * \Spatie\Permission\Events\RoleAttachedEvent
     * \Spatie\Permission\Events\RoleDetachedEvent
     * \Spatie\Permission\Events\PermissionAttachedEvent
     * \Spatie\Permission\Events\PermissionDetachedEvent
     *
     * Pour l'activer, mettez true, puis créez des écouteurs pour surveiller ces événements.
     */
    'events_enabled' => false,

    /*
     * Fonctionnalité d'équipes.
     * Lorsque la valeur est true, le paquet implémente les équipes via 'team_foreign_key'.
     * Si vous voulez que les migrations enregistrent 'team_foreign_key', vous devez mettre true avant
     * d'exécuter la migration.
     * Si la migration a déjà été faite, créez une nouvelle migration pour ajouter aussi 'team_foreign_key' à
     * 'roles', 'model_has_roles' et 'model_has_permissions' (voir la dernière version du fichier de migration
     * de ce paquet)
     */

    'teams' => false,

    /*
     * La classe à utiliser pour résoudre l'id d'équipe des permissions
     */
    'team_resolver' => DefaultTeamResolver::class,

    /*
     * Passport Client Credentials Grant
     * Lorsque la valeur est true, le paquet utilise le client de Passport pour vérifier les permissions
     */

    'use_passport_client_credentials' => false,

    /*
     * Lorsque la valeur est true, les noms des permissions requises sont ajoutés aux messages d'exception.
     * Cela peut être considéré comme une fuite d'information dans certains contextes ; la valeur par défaut
     * est donc false ici, par sécurité optimale.
     */

    'display_permission_in_exception' => false,

    /*
     * Lorsque la valeur est true, les noms des rôles requis sont ajoutés aux messages d'exception. Cela peut
     * être considéré comme une fuite d'information dans certains contextes ; la valeur par défaut est donc
     * false ici, par sécurité optimale.
     */

    'display_role_in_exception' => false,

    /*
     * Par défaut, la recherche de permissions avec jokers est désactivée. Voir la documentation pour
     * comprendre la syntaxe prise en charge.
     */

    'enable_wildcard_permission' => false,

    /*
     * La classe à utiliser pour interpréter les permissions avec jokers. Si vous devez modifier les
     * délimiteurs, surchargez la classe et indiquez ici son nom.
     */
    // 'wildcard_permission' => Spatie\Permission\WildcardPermission::class,

    /* Paramètres propres au cache */

    'cache' => [

        /*
         * Par défaut, toutes les permissions sont mises en cache pendant 24 heures pour accélérer les
         * performances. Lorsque des permissions ou des rôles sont modifiés, le cache est vidé
         * automatiquement.
         */

        'expiration_time' => DateInterval::createFromDateString('24 hours'),

        /*
         * La clé de cache utilisée pour stocker toutes les permissions.
         */

        'key' => 'spatie.permission.cache',

        /*
         * Vous pouvez éventuellement indiquer un pilote de cache précis pour la mise en cache des permissions
         * et des rôles, parmi les pilotes `store` listés dans le fichier de configuration cache.php. Avec «
         * default », on utilise le `default` défini dans cache.php.
         */

        'store' => 'default',
    ],
];
