<?php

use Spatie\Backup\Notifications\Notifiable;
use Spatie\Backup\Notifications\Notifications\BackupHasFailedNotification;
use Spatie\Backup\Notifications\Notifications\BackupWasSuccessfulNotification;
use Spatie\Backup\Notifications\Notifications\CleanupHasFailedNotification;
use Spatie\Backup\Notifications\Notifications\CleanupWasSuccessfulNotification;
use Spatie\Backup\Notifications\Notifications\HealthyBackupWasFoundNotification;
use Spatie\Backup\Notifications\Notifications\UnhealthyBackupWasFoundNotification;
use Spatie\Backup\Tasks\Cleanup\Strategies\DefaultStrategy;
use Spatie\Backup\Tasks\Monitor\HealthChecks\MaximumAgeInDays;
use Spatie\Backup\Tasks\Monitor\HealthChecks\MaximumStorageInMegabytes;

return [

    'backup' => [
        /*
         * Le nom de cette application. Vous pouvez l'utiliser pour surveiller les sauvegardes.
         */
        'name' => env('APP_NAME', 'laravel-backup'),

        'source' => [
            'files' => [
                /*
                 * La liste des répertoires et fichiers inclus dans la sauvegarde.
                 */
                'include' => [
                    // Uniquement les médias téléversés (logos, photos, documents, galeries) — le code de
                    // l'application se récupère depuis le contrôle de version ou un redéploiement, et la base
                    // de données est exportée séparément plus bas.
                    storage_path('app/public'),
                ],

                /*
                 * Ces répertoires et fichiers seront exclus de la sauvegarde.
                 *
                 * Les répertoires utilisés par le processus de sauvegarde sont automatiquement exclus.
                 */
                'exclude' => [
                    base_path('vendor'),
                    base_path('node_modules'),
                    storage_path('framework'),
                ],

                /*
                 * Détermine si les liens symboliques doivent être suivis.
                 */
                'follow_links' => false,

                /*
                 * Détermine s'il faut éviter les dossiers illisibles.
                 */
                'ignore_unreadable_directories' => false,

                /*
                 * Ce chemin sert à rendre relatifs les répertoires du fichier zip obtenu
                 * Mettre `null` pour inclure le chemin absolu complet
                 * Exemple : base_path()
                 */
                'relative_path' => storage_path('app/public'),
            ],

            /*
             * Les noms des connexions aux bases de données à sauvegarder
             * Les bases MySQL, PostgreSQL, SQLite et Mongo sont prises en charge.
             *
             * Le contenu de l'export de la base peut être personnalisé pour chaque connexion
             * en ajoutant une clé 'dump' aux paramètres de la connexion dans config/database.php.
             * Ex.
             * 'mysql' => [
             *       ...
             *      'dump' => [
             *           'exclude_tables' => [
             *                'table_to_exclude_from_backup',
             *                'another_table_to_exclude'
             *            ]
             *       ],
             * ],
             *
             * Si vous n'utilisez que des tables InnoDB sur un serveur MySQL, vous pouvez
             * aussi fournir l'option useSingleTransaction pour éviter le verrouillage des tables.
             *
             * Ex.
             * 'mysql' => [
             *       ...
             *      'dump' => [
             *           'useSingleTransaction' => true,
             *       ],
             * ],
             *
             * Pour la liste complète des options de personnalisation disponibles, voir
             * https://github.com/spatie/db-dumper
             */
            'databases' => [
                env('DB_CONNECTION', 'mysql'),
            ],
        ],

        /*
         * La sauvegarde de la base peut être compressée pour réduire l'espace disque utilisé.
         *
         * Laravel-backup fournit d'office Spatie\DbDumper\Compressors\GzipCompressor::class.
         *
         * Vous pouvez aussi créer un compresseur personnalisé. Plus d'informations ici :
         * https://github.com/spatie/db-dumper#using-compression
         *
         * Si vous ne voulez aucun compresseur, mettez null.
         */
        'database_dump_compressor' => null,

        /*
         * Si précisé, le nom du fichier d'export de la base contiendra un horodatage (p. ex. :
         * 'Y-m-d-H-i-s').
         */
        'database_dump_file_timestamp_format' => null,

        /*
         * La base du nom de fichier d'export : « database » ou « connection »
         *
         * Si « database » (par défaut), le nom du fichier contiendra le nom de la base. Si « connection », il
         * contiendra le nom de la connexion.
         */
        'database_dump_filename_base' => 'database',

        /*
         * L'extension de fichier utilisée pour les fichiers d'export de la base.
         *
         * Si elle n'est pas précisée, l'extension sera .archive pour MongoDB et .sql pour toutes les autres
         * bases
         * L'extension doit être indiquée sans point initial.
         */
        'database_dump_file_extension' => '',

        'destination' => [
            /*
             * L'algorithme de compression à utiliser pour créer l'archive zip.
             *
             * Si vous ne sauvegardez que la base, vous pouvez choisir la compression gzip pour l'export et
             * aucune compression pour le zip.
             *
             * Quelques algorithmes courants sont listés ci-dessous :
             * ZipArchive::CM_STORE (aucune compression ; mettre 0 comme niveau de compression)
             * ZipArchive::CM_DEFAULT
             * ZipArchive::CM_DEFLATE
             * ZipArchive::CM_BZIP2
             * ZipArchive::CM_XZ
             *
             * Pour en savoir plus, voir https://www.php.net/manual/zip.constants.php et vérifier qu'il est
             * pris en charge par votre système.
             */
            'compression_method' => ZipArchive::CM_DEFAULT,

            /*
             * Le niveau de compression correspondant à l'algorithme utilisé ; un entier entre 0 et 9.
             *
             * Vérifiez les niveaux pris en charge par l'algorithme choisi ; en général 1 est la compression
             * la plus rapide et la plus faible, et 9 la plus lente et la plus forte.
             *
             * Avec 0, certains algorithmes peuvent passer à la compression la plus forte.
             */
            'compression_level' => 9,

            /*
             * Le préfixe de nom de fichier utilisé pour le zip de sauvegarde.
             */
            'filename_prefix' => '',

            /*
             * Les noms des disques sur lesquels les sauvegardes seront stockées.
             */
            'disks' => [
                'local',
            ],

            /*
             * Détermine s'il faut permettre aux sauvegardes de continuer lorsque certaines cibles échouent,
             * au lieu d'échouer complètement.
             */
            'continue_on_failure' => false,
        ],

        /*
         * Le répertoire où seront stockés les fichiers temporaires.
         */
        'temporary_directory' => storage_path('app/backup-temp'),

        /*
         * Le mot de passe utilisé pour chiffrer l'archive. Mettre `null` pour désactiver le chiffrement.
         */
        'password' => env('BACKUP_ARCHIVE_PASSWORD'),

        /*
         * L'algorithme de chiffrement utilisé pour l'archive. Mettre 'none' pour désactiver le chiffrement.
         *
         * Pris en charge : 'none', 'default', 'aes128', 'aes192', 'aes256'
         *
         * Avec 'default', AES-256 est utilisé s'il est disponible sur votre système.
         */
        'encryption' => 'default',

        /*
         * Après la création du zip, vérifie qu'il peut être ouvert et qu'il contient des fichiers. Recommandé
         * pour les sauvegardes critiques, mais ajoute un léger surcoût.
         */
        'verify_backup' => false,

        /*
         * Le nombre de tentatives, au cas où la commande de sauvegarde rencontre une exception
         */
        'tries' => 1,

        /*
         * Le nombre de secondes d'attente avant de retenter une sauvegarde si la tentative précédente a
         * échoué
         * Mettre `0` pour aucune attente
         */
        'retry_delay' => 0,
    ],

    /*
     * Vous pouvez être averti lorsque certains événements se produisent. D'office, vous pouvez utiliser
     * 'mail' et 'slack'. Pour Slack, il faut installer laravel/slack-notification-channel.
     *
     * Vous pouvez aussi utiliser vos propres classes de notification, à condition que la classe porte le nom
     * de l'une des classes `Spatie\Backup\Notifications\Notifications`.
     */
    'notifications' => [
        'notifications' => [
            BackupHasFailedNotification::class => ['mail'],
            UnhealthyBackupWasFoundNotification::class => ['mail'],
            CleanupHasFailedNotification::class => ['mail'],
            BackupWasSuccessfulNotification::class => ['mail'],
            HealthyBackupWasFoundNotification::class => ['mail'],
            CleanupWasSuccessfulNotification::class => ['mail'],
        ],

        /*
         * Vous pouvez ici préciser l'entité notifiable à laquelle envoyer les notifications. L'entité
         * notifiable par défaut utilisera les variables définies dans ce fichier de configuration.
         */
        'notifiable' => Notifiable::class,

        'mail' => [
            'to' => env('BACKUP_NOTIFY_EMAIL', 'admin@eeht-thies.sn'),

            'from' => [
                'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
                'name' => env('MAIL_FROM_NAME', 'Example'),
            ],
        ],

        'slack' => [
            'webhook_url' => '',

            /*
             * Si cette valeur est null, le canal par défaut du webhook sera utilisé.
             */
            'channel' => null,

            'username' => null,

            'icon' => null,
        ],

        'discord' => [
            'webhook_url' => '',

            /*
             * Si c'est une chaîne vide, le champ de nom du webhook sera utilisé.
             */
            'username' => '',

            /*
             * Si c'est une chaîne vide, l'avatar du webhook sera utilisé.
             */
            'avatar_url' => '',
        ],

        /*
         * Un canal webhook générique qui envoie du JSON en POST vers une URL. Utile pour Mattermost,
         * Microsoft Teams ou des intégrations personnalisées.
         */
        'webhook' => [
            'url' => '',
        ],
    ],

    /*
     * Le canal de journal utilisé pour les messages d'activité des sauvegardes.
     *
     * Mettre le nom d'un canal défini dans config/logging.php pour utiliser ce canal. Mettre false pour
     * désactiver entièrement la journalisation des sauvegardes. Mettre null pour utiliser le canal de journal
     * par défaut.
     */
    'log_channel' => null,

    /*
     * Vous pouvez ici préciser quelles sauvegardes surveiller. Si une sauvegarde ne respecte pas les
     * exigences indiquées, l'événement UnHealthyBackupWasFound est déclenché.
     */
    'monitor_backups' => [
        [
            'name' => env('APP_NAME', 'laravel-backup'),
            'disks' => ['local'],
            'health_checks' => [
                MaximumAgeInDays::class => 1,
                MaximumStorageInMegabytes::class => 5000,
            ],
        ],

        /*
        [
            'name' => 'name of the second app',
            'disks' => ['local', 's3'],
            'health_checks' => [
                \Spatie\Backup\Tasks\Monitor\HealthChecks\MaximumAgeInDays::class => 1,
                \Spatie\Backup\Tasks\Monitor\HealthChecks\MaximumStorageInMegabytes::class => 5000,
            ],
        ],
        */
    ],

    'cleanup' => [
        /*
         * La stratégie utilisée pour nettoyer les anciennes sauvegardes. La stratégie par défaut conserve
         * toutes les sauvegardes pendant un certain nombre de jours. Passé ce délai, seule une sauvegarde par
         * jour est conservée. Passé ce nouveau délai, seules des sauvegardes hebdomadaires sont conservées,
         * et ainsi de suite.
         *
         * Quelle que soit la configuration, la stratégie par défaut ne supprime jamais la sauvegarde la plus
         * récente.
         */
        'strategy' => DefaultStrategy::class,

        'default_strategy' => [
            /*
             * Le nombre de jours pendant lesquels les sauvegardes doivent être conservées.
             */
            'keep_all_backups_for_days' => 7,

            /*
             * Une fois la période « keep_all_backups_for_days » écoulée, la sauvegarde la plus récente de la
             * journée est conservée. Les sauvegardes plus anciennes du même jour sont supprimées. Si vous ne
             * créez qu'une sauvegarde par jour, aucune sauvegarde n'est encore supprimée.
             */
            'keep_daily_backups_for_days' => 16,

            /*
             * Une fois la période « keep_daily_backups_for_days » écoulée, la sauvegarde la plus récente de
             * la semaine est conservée. Les sauvegardes plus anciennes de la même semaine sont supprimées. Si
             * vous ne créez qu'une sauvegarde par semaine, aucune sauvegarde n'est encore supprimée.
             */
            'keep_weekly_backups_for_weeks' => 8,

            /*
             * Une fois la période « keep_weekly_backups_for_weeks » écoulée, la sauvegarde la plus récente du
             * mois est conservée. Les sauvegardes plus anciennes du même mois sont supprimées.
             */
            'keep_monthly_backups_for_months' => 4,

            /*
             * Une fois la période « keep_monthly_backups_for_months » écoulée, la sauvegarde la plus récente
             * de l'année est conservée. Les sauvegardes plus anciennes de la même année sont supprimées.
             */
            'keep_yearly_backups_for_years' => 2,

            /*
             * Après le nettoyage des sauvegardes, supprime la plus ancienne jusqu'à atteindre ce nombre de
             * mégaoctets. Mettre null pour une taille illimitée.
             */
            'delete_oldest_backups_when_using_more_megabytes_than' => 5000,
        ],

        /*
         * Le nombre de tentatives, au cas où la commande de nettoyage rencontre une exception
         */
        'tries' => 1,

        /*
         * Le nombre de secondes d'attente avant de retenter un nettoyage si la tentative précédente a échoué
         * Mettre `0` pour aucune attente
         */
        'retry_delay' => 0,
    ],

];
