<?php

namespace App\Support;

use App\Models\Attachment;
use App\Models\Candidature;
use App\Models\Expense;
use App\Models\Internship;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\Payment;
use App\Models\Teacher;
use Database\Seeders\AccountingSeeder;
use Database\Seeders\CouncilDefaultsSeeder;
use Database\Seeders\FaqCatalogSeeder;
use Database\Seeders\FormationsCatalogSeeder;
use InvalidArgumentException;

/**
 * Catalogue des données que le super-administrateur peut remettre à zéro (Paramètres › Réinitialiser des
 * données). Chaque catégorie décrit ce qu'elle supprime :
 *
 *  - tables      : tables vidées, enfants avant parents (les contraintes RESTRICT l'exigent) ;
 *  - requires    : catégories qui doivent partir avec elle parce que la base les supprime en cascade — c'est
 *                  ce qui permet d'afficher « inclus automatiquement » et de nettoyer leurs fichiers ;
 *  - files       : [table, colonne, disques] des fichiers à effacer (un chemin est tenté sur chaque disque) ;
 *  - morphs      : modèles dont les dépendants polymorphes (sans clé étrangère) partent aussi : écritures
 *                  comptables automatiques, pièces jointes, médias ;
 *  - settings    : clés de la table settings (liste blanche : cette table contient aussi les verrous des
 *                  commandes ponctuelles, qu'il ne faut jamais effacer) ; setting_files = celles qui sont des fichiers ;
 *  - restore     : seeder qui recharge le contenu d'origine (restore_forced = obligatoire) ;
 *  - scope       : suppression partielle de lignes (comptes du portail) plutôt que de tables entières.
 *
 * DataResetCatalogTest confronte ce catalogue au schéma réel : toute migration qui ajoute une clé
 * étrangère en cascade vers une table du catalogue fait échouer le test tant que le catalogue n'est pas à jour.
 */
class DataResetCatalog
{
    public const CONFIRMATION_WORD = 'REINITIALISER';

    /** Seuls les comptes dont TOUS les rôles figurent ici peuvent être supprimés (jamais le personnel). */
    public const PORTAL_ROLES = ['eleve', 'parent', 'enseignant'];

    private static ?array $categories = null;

    /** @return array<string, array<string, mixed>> catégories par clé, dans l'ordre d'affichage */
    public static function all(): array
    {
        return self::$categories ??= self::build();
    }

    /** @return list<string> */
    public static function keys(): array
    {
        return array_keys(self::all());
    }

    public static function has(string $key): bool
    {
        return isset(self::all()[$key]);
    }

    /** @return array<string, mixed> */
    public static function find(string $key): array
    {
        return self::all()[$key] ?? throw new InvalidArgumentException("Catégorie de réinitialisation inconnue : {$key}");
    }

    /**
     * Catégories à exécuter pour réaliser la sélection : chaque dépendance avant la catégorie qui l'exige
     * (parcours en profondeur), donc les enfants avant les parents.
     *
     * @param  list<string>  $keys
     * @return list<string>
     */
    public static function closure(array $keys): array
    {
        $visited = [];
        $order = [];

        $visit = function (string $key) use (&$visit, &$visited, &$order): void {
            if (isset($visited[$key])) {
                return;
            }

            $visited[$key] = true;

            foreach (self::find($key)['requires'] as $required) {
                $visit($required);
            }

            $order[] = $key;
        };

        foreach ($keys as $key) {
            $visit($key);
        }

        return $order;
    }

    /**
     * Dépendances (transitives) qu'entraîne une catégorie, sans elle-même.
     *
     * @return list<string>
     */
    public static function includes(string $key): array
    {
        return array_values(array_diff(self::closure([$key]), [$key]));
    }

    /**
     * Tables vidées par une liste de catégories, dans l'ordre d'exécution et sans doublon.
     *
     * @param  list<string>  $keys
     * @return list<string>
     */
    public static function tables(array $keys): array
    {
        $tables = [];

        foreach ($keys as $key) {
            foreach (self::find($key)['tables'] as $table) {
                $tables[$table] = true;
            }
        }

        return array_keys($tables);
    }

    /** @return list<string> catégories qui peuvent recharger leur contenu d'origine */
    public static function restorableKeys(): array
    {
        return array_keys(array_filter(self::all(), fn (array $category) => $category['restore'] !== null));
    }

    private static function build(): array
    {
        $public = fn (string $table, string $column): array => [$table, $column, ['public']];

        $categories = [
            // ───────────── Site public ─────────────
            'actualites' => [
                'group' => 'Site public',
                'label' => 'Actualités',
                'description' => 'Articles et leurs photos.',
                'tables' => ['news_article_photos', 'news_articles'],
                'files' => [$public('news_articles', 'image'), $public('news_article_photos', 'path')],
            ],
            'evenements' => [
                'group' => 'Site public',
                'label' => 'Événements',
                'description' => 'Événements publiés sur le site et leurs images.',
                'tables' => ['event_items'],
                'files' => [$public('event_items', 'image')],
            ],
            'galerie' => [
                'group' => 'Site public',
                'label' => 'Galerie',
                'description' => 'Albums, photos et vidéos.',
                'tables' => ['gallery_media', 'galleries'],
                'files' => [$public('galleries', 'cover_image'), $public('gallery_media', 'path')],
            ],
            'diaporama' => [
                'group' => 'Site public',
                'label' => "Diaporama d'accueil",
                'description' => "Images du diaporama de la page d'accueil.",
                'tables' => ['sliders'],
                'files' => [$public('sliders', 'image')],
            ],
            'partenaires' => [
                'group' => 'Site public',
                'label' => 'Partenaires',
                'description' => 'Entreprises partenaires et leurs logos.',
                'note' => "Supprime aussi leurs offres d'emploi, leurs offres de stage et les stages d'élèves qui y sont rattachés.",
                'tables' => ['partners'],
                'requires' => ['offres_emploi', 'offres_stage', 'stages'],
                'files' => [$public('partners', 'logo')],
            ],
            'temoignages' => [
                'group' => 'Site public',
                'label' => 'Témoignages',
                'description' => 'Témoignages et photos des témoins.',
                'tables' => ['testimonials'],
                'files' => [$public('testimonials', 'photo')],
            ],
            'faq' => [
                'group' => 'Site public',
                'label' => 'FAQ',
                'description' => 'Questions fréquentes.',
                'tables' => ['faqs'],
                'restore' => FaqCatalogSeeder::class,
            ],

            // ───────────── Réglages du site (liste blanche de clés) ─────────────
            'reglages_identite' => [
                'group' => 'Réglages du site',
                'label' => 'Identité, coordonnées et réseaux sociaux',
                'description' => "Nom de l'école, slogan, e-mail, téléphone, adresse, horaires, NINEA, RCCM et liens des réseaux sociaux.",
                'note' => 'Le site retrouve ses valeurs par défaut (nom « EEHT de Thiès »).',
                'settings' => [
                    'site_name', 'site_short_name', 'site_tagline', 'site_email', 'site_phone', 'site_address',
                    'opening_hours', 'site_ninea', 'site_rccm', 'facebook_url', 'instagram_url', 'whatsapp_url',
                    'linkedin_url', 'youtube_url', 'google_analytics_id',
                ],
            ],
            'reglages_chiffres' => [
                'group' => 'Réglages du site',
                'label' => 'Chiffres clés',
                'description' => "Années d'expérience, élèves formés et taux de réussite affichés sur le site.",
                'settings' => ['years_experience', 'students_trained', 'success_rate'],
            ],
            'reglages_theme' => [
                'group' => 'Réglages du site',
                'label' => 'Couleurs du thème',
                'description' => "Couleurs neutre, principale, secondaire et d'accent : le site reprend sa palette d'origine.",
                'settings' => ['theme_neutral_color', 'theme_primary_color', 'theme_secondary_color', 'theme_accent_color'],
            ],
            'reglages_directeur' => [
                'group' => 'Réglages du site',
                'label' => 'Mot du directeur',
                'description' => 'Nom, fonction, message et photo du directeur.',
                'settings' => ['director_name', 'director_role', 'director_message', 'director_photo'],
                'setting_files' => ['director_photo'],
            ],
            'reglages_images' => [
                'group' => 'Réglages du site',
                'label' => 'Logo et photo de présentation',
                'description' => "Logo de l'école et photo de la page « À propos ».",
                'note' => "Les documents officiels (cartes, diplômes) reprennent le sigle par défaut tant qu'aucun logo n'est téléversé.",
                'settings' => ['site_logo', 'about_photo'],
                'setting_files' => ['site_logo', 'about_photo'],
            ],

            // ───────────── Admissions ─────────────
            'candidatures' => [
                'group' => 'Admissions',
                'label' => 'Candidatures',
                'description' => 'Dossiers de candidature et documents joints.',
                'note' => 'Les élèves déjà inscrits sont conservés, sans lien vers leur candidature.',
                'tables' => ['candidatures'],
                'morphs' => [Candidature::class],
            ],

            // ───────────── Scolarité ─────────────
            'eleves' => [
                'group' => 'Scolarité',
                'label' => 'Élèves',
                'description' => 'Dossiers des élèves et photos, avec tout ce qui leur est rattaché.',
                'note' => 'Les comptes de connexion restent : cochez aussi « Comptes de connexion » pour les supprimer.',
                'tables' => ['students'],
                'requires' => [
                    'documents_eleves', 'notes', 'bulletins', 'presences', 'discipline_registre', 'conseils', 'progressions', 'competences_eleves',
                    'stages', 'factures', 'echeanciers',
                ],
                'files' => [$public('students', 'photo')],
            ],
            'documents_eleves' => [
                'group' => 'Scolarité',
                'label' => 'Documents des élèves',
                'description' => 'Pièces versées aux dossiers des élèves.',
                'tables' => ['student_documents'],
                'files' => [$public('student_documents', 'file_path')],
            ],
            'notes' => [
                'group' => 'Scolarité',
                'label' => 'Notes',
                'description' => 'Notes saisies (les examens sont conservés).',
                'tables' => ['grades'],
            ],
            'bulletins' => [
                'group' => 'Scolarité',
                'label' => 'Bulletins',
                'description' => 'Bulletins de notes générés.',
                'tables' => ['report_cards'],
            ],
            'presences' => [
                'group' => 'Scolarité',
                'label' => 'Présences et absences',
                'description' => "Registre d'appel et pointages.",
                'tables' => ['attendances'],
            ],
            'conseils' => [
                'group' => 'Scolarité',
                'label' => 'Conseils de classe',
                'description' => 'Conseils, membres, photos des données, décisions et procès-verbaux (fichiers compris).',
                'tables' => ['council_meeting_signals', 'council_meeting_participants', 'council_meetings', 'council_family_notices', 'council_vote_ballots', 'council_votes', 'council_appeals', 'council_follow_ups', 'council_internship_evaluations', 'council_observations', 'council_validations', 'council_minutes', 'council_decisions', 'council_students', 'council_members', 'councils', 'council_sittings'],
                'files' => [['council_minutes', 'file_path', ['local']], ['council_minutes', 'signed_scan_path', ['local']]],
            ],
            'discipline_registre' => [
                'group' => 'Scolarité',
                'label' => 'Sanctions',
                'description' => 'Registre des sanctions de la vie scolaire.',
                'tables' => ['discipline_records'],
            ],
            'progressions' => [
                'group' => 'Scolarité',
                'label' => 'Passations de classe',
                'description' => 'Historique des décisions de passage.',
                'tables' => ['student_progressions'],
            ],
            'competences_eleves' => [
                'group' => 'Scolarité',
                'label' => 'Évaluations de compétences',
                'description' => 'Évaluations des compétences des élèves.',
                'tables' => ['skill_assessments'],
            ],

            // ───────────── Pédagogie ─────────────
            'formations' => [
                'group' => 'Pédagogie',
                'label' => 'Formations',
                'description' => 'Catalogue des formations et leurs images.',
                'note' => "Les élèves, matières, témoignages et offres de stage conservés n'auront plus de formation associée.",
                'tables' => ['formations'],
                'requires' => ['candidatures', 'niveaux', 'classes', 'competences', 'conseils_reglages'],
                'files' => [$public('formations', 'image')],
                'restore' => FormationsCatalogSeeder::class,
            ],
            'conseils_reglages' => [
                'group' => 'Pédagogie',
                'label' => 'Réglages des conseils de classe',
                'description' => "Types de décision, incompatibilités, seuils d'alerte, groupes de matières, banque d'appréciations et grille de stage.",
                'note' => 'Les réglages de départ sont réinstallés aussitôt.',
                'tables' => ['decision_type_incompatibilities', 'decision_types', 'alert_thresholds', 'subject_groups', 'appreciation_templates', 'internship_criteria'],
                'requires' => ['conseils'],
                'restore' => CouncilDefaultsSeeder::class,
                'restore_forced' => true,
            ],
            'niveaux' => [
                'group' => 'Pédagogie',
                'label' => 'Niveaux et règles de passage',
                'description' => 'Niveaux de formation et exigences de passage.',
                'note' => 'Les classes et passations conservées perdent leur niveau.',
                'tables' => ['formation_level_required_skill', 'formation_level_required_subject', 'formation_levels'],
            ],
            'competences' => [
                'group' => 'Pédagogie',
                'label' => 'Référentiel de compétences',
                'description' => 'Compétences par formation.',
                'tables' => ['formation_level_required_skill', 'skills'],
                'requires' => ['competences_eleves'],
            ],
            'matieres' => [
                'group' => 'Pédagogie',
                'label' => 'Matières',
                'description' => 'Matières enseignées.',
                'note' => "Les présences et ateliers conservés n'auront plus de matière.",
                'tables' => ['subject_teacher', 'formation_level_required_subject', 'subjects'],
                'requires' => ['examens', 'cahier_texte', 'emplois_du_temps', 'conseils'],
            ],
            'salles' => [
                'group' => 'Pédagogie',
                'label' => 'Salles',
                'description' => 'Salles de cours.',
                'note' => "Les examens et emplois du temps conservés n'auront plus de salle.",
                'tables' => ['rooms'],
            ],
            'annees' => [
                'group' => 'Pédagogie',
                'label' => 'Années académiques',
                'description' => 'Années académiques.',
                'note' => "Les élèves, candidatures, factures et échéanciers conservés n'auront plus d'année académique.",
                'tables' => ['academic_years'],
                'requires' => ['bulletins', 'classes', 'progressions'],
            ],
            'classes' => [
                'group' => 'Pédagogie',
                'label' => 'Classes',
                'description' => 'Classes et affectations des enseignants.',
                'note' => "Les élèves conservés n'auront plus de classe. Les groupes de classe d'EEHT Connect sont recréés à la prochaine ouverture.",
                'tables' => ['school_class_teacher', 'school_classes'],
                'requires' => ['presences', 'connect', 'examens', 'cahier_texte', 'ateliers', 'bulletins', 'emplois_du_temps', 'conseils'],
            ],
            'examens' => [
                'group' => 'Pédagogie',
                'label' => 'Examens et devoirs',
                'description' => 'Examens, devoirs et leurs notes.',
                'tables' => ['exam_teacher', 'grades', 'exams'],
            ],
            'cahier_texte' => [
                'group' => 'Pédagogie',
                'label' => 'Cahier de texte',
                'description' => 'Contenus de séances saisis par les enseignants.',
                'tables' => ['lesson_logs'],
            ],
            'emplois_du_temps' => [
                'group' => 'Pédagogie',
                'label' => 'Emplois du temps',
                'description' => 'Créneaux des emplois du temps.',
                'note' => 'Les présences et le cahier de texte conservés ne sont plus rattachés à un créneau.',
                'tables' => ['timetable_entries'],
            ],
            'ateliers' => [
                'group' => 'Pédagogie',
                'label' => 'Ateliers pratiques',
                'description' => 'Séances pratiques et produits utilisés.',
                'tables' => ['practical_session_items', 'practical_sessions'],
            ],
            'bibliotheque' => [
                'group' => 'Pédagogie',
                'label' => 'Bibliothèque',
                'description' => 'Ressources et vignettes.',
                'tables' => ['library_resources'],
                'files' => [$public('library_resources', 'file_path'), $public('library_resources', 'thumbnail_path')],
            ],

            // ───────────── Enseignants et RH ─────────────
            'enseignants' => [
                'group' => 'Enseignants et RH',
                'label' => 'Enseignants',
                'description' => 'Fiches enseignants, photos et pièces jointes.',
                'note' => "Les comptes de connexion restent (cochez « Comptes de connexion » pour les supprimer). Emplois du temps, ateliers et évaluations conservés n'auront plus d'enseignant.",
                'tables' => ['exam_teacher', 'school_class_teacher', 'subject_teacher', 'teachers'],
                'requires' => ['cahier_texte', 'salaires'],
                'files' => [$public('teachers', 'photo')],
                'morphs' => [Teacher::class],
            ],
            'conges' => [
                'group' => 'Enseignants et RH',
                'label' => 'Congés',
                'description' => 'Demandes de congé et pièces jointes.',
                'tables' => ['leave_requests'],
                'morphs' => [LeaveRequest::class],
            ],

            // ───────────── Finance et comptabilité ─────────────
            'factures' => [
                'group' => 'Finance et comptabilité',
                'label' => 'Factures et paiements',
                'description' => 'Factures, paiements, relances, tentatives de paiement en ligne et pièces jointes.',
                'note' => 'Supprime aussi les écritures comptables générées automatiquement pour ces factures et paiements.',
                'tables' => ['payment_attempts', 'payment_reminders', 'payments', 'invoices'],
                'morphs' => [Invoice::class, Payment::class],
            ],
            'echeanciers' => [
                'group' => 'Finance et comptabilité',
                'label' => 'Échéanciers',
                'description' => 'Plans de paiement échelonné.',
                'note' => 'Les factures conservées ne sont plus rattachées à un échéancier.',
                'tables' => ['payment_plans'],
            ],
            'depenses' => [
                'group' => 'Finance et comptabilité',
                'label' => 'Dépenses',
                'description' => 'Dépenses et pièces jointes.',
                'note' => 'Supprime aussi les écritures comptables générées automatiquement. Les salaires versés conservés perdent leur dépense liée.',
                'tables' => ['expenses'],
                'morphs' => [Expense::class],
            ],
            'salaires' => [
                'group' => 'Finance et comptabilité',
                'label' => 'Salaires versés',
                'description' => 'Cycles de paie, bulletins et salaires du personnel et des enseignants.',
                'tables' => ['payroll_lines', 'payroll_runs', 'teacher_salary_payments', 'salary_payments'],
            ],
            'fournisseurs' => [
                'group' => 'Finance et comptabilité',
                'label' => 'Fournisseurs',
                'description' => 'Fournisseurs.',
                'note' => "Les produits conservés n'auront plus de fournisseur.",
                'tables' => ['suppliers'],
            ],
            'produits' => [
                'group' => 'Finance et comptabilité',
                'label' => 'Produits et stocks',
                'description' => 'Produits et mouvements de stock.',
                'tables' => ['stock_movements', 'practical_session_items', 'products'],
            ],
            'ecritures' => [
                'group' => 'Finance et comptabilité',
                'label' => 'Écritures comptables',
                'description' => 'Toutes les écritures, automatiques et manuelles (le plan comptable est conservé).',
                'tables' => ['journal_entry_lines', 'journal_entries'],
            ],
            'plan_comptable' => [
                'group' => 'Finance et comptabilité',
                'label' => 'Plan comptable',
                'description' => 'Comptes et journaux.',
                'note' => "Supprime d'abord toutes les écritures, puis recharge les journaux et comptes par défaut (la comptabilité automatique en a besoin).",
                'tables' => ['journal_entry_lines', 'journal_entries', 'accounts', 'journals'],
                'requires' => ['ecritures'],
                'restore' => AccountingSeeder::class,
                'restore_forced' => true,
            ],

            // ───────────── Insertion professionnelle ─────────────
            'offres_emploi' => [
                'group' => 'Insertion professionnelle',
                'label' => "Offres d'emploi",
                'description' => "Offres d'emploi des partenaires.",
                'tables' => ['job_offers'],
            ],
            'offres_stage' => [
                'group' => 'Insertion professionnelle',
                'label' => 'Offres de stage',
                'description' => 'Offres de stage des partenaires.',
                'note' => "Les stages d'élèves sont conservés, sans lien vers l'offre.",
                'tables' => ['internship_offers'],
            ],
            'stages' => [
                'group' => 'Insertion professionnelle',
                'label' => 'Stages des élèves',
                'description' => 'Stages, évaluations et pièces jointes.',
                'tables' => ['internships'],
                'morphs' => [Internship::class],
            ],

            // ───────────── Communication ─────────────
            'annonces' => [
                'group' => 'Communication',
                'label' => 'Annonces officielles',
                'description' => 'Annonces et leurs destinataires.',
                'tables' => ['announcement_user', 'announcements'],
            ],
            'connect' => [
                'group' => 'Communication',
                'label' => 'EEHT Connect',
                'description' => 'Conversations, messages, réactions, appels, rappels et pièces jointes.',
                'note' => "Les groupes de classe sont recréés automatiquement à la prochaine ouverture d'EEHT Connect.",
                'tables' => [
                    'message_mentions', 'message_reactions', 'conversation_messages', 'conversation_participants',
                    'call_signals', 'calls', 'conversations', 'class_messages', 'connect_pending_events',
                    'connect_reminders',
                ],
                'files' => [
                    ['conversation_messages', 'attachment_path', ['local', 'public']],
                    $public('conversations', 'avatar_path'),
                ],
            ],
            'messagerie' => [
                'group' => 'Communication',
                'label' => 'Messagerie',
                'description' => 'E-mails envoyés depuis la plateforme et messages internes.',
                'tables' => ['sent_emails', 'internal_messages'],
                'files' => [['internal_messages', 'attachment_path', ['local', 'public']]],
            ],
            'messages_site' => [
                'group' => 'Communication',
                'label' => 'Messages du site',
                'description' => 'Messages reçus par le formulaire de contact.',
                'tables' => ['contact_messages'],
            ],

            // ───────────── Traces et fichiers ─────────────
            'journal_activite' => [
                'group' => 'Traces et fichiers',
                'label' => "Journal d'activité",
                'description' => 'Historique des actions du personnel.',
                'note' => 'La réinitialisation en cours y sera inscrite juste après la suppression.',
                'tables' => ['activity_log'],
            ],
            'connexions' => [
                'group' => 'Traces et fichiers',
                'label' => 'Historique des connexions',
                'description' => 'Connexions des utilisateurs et visites du site public (statistiques de trafic).',
                'tables' => ['login_logs', 'site_visits'],
            ],
            'pieces_jointes' => [
                'group' => 'Traces et fichiers',
                'label' => 'Toutes les pièces jointes',
                'description' => 'Documents joints aux dépenses, factures, congés, enseignants et stages.',
                'tables' => ['attachments'],
                'files' => [['attachments', 'file_path', [Attachment::DISK]]],
            ],

            // ───────────── Comptes ─────────────
            'comptes_portail' => [
                'group' => 'Comptes',
                'label' => 'Comptes de connexion des élèves, parents et enseignants',
                'description' => "Identifiants d'accès aux espaces élève, parent et enseignant. Jamais le personnel, jamais votre compte.",
                'note' => 'Les fiches élèves et enseignants sont conservées, sans compte. Les messages Connect écrits par ces comptes restent, sans auteur.',
                'scope' => 'portal_users',
            ],
        ];

        foreach ($categories as $key => $category) {
            $categories[$key] = $category + [
                'note' => null,
                'tables' => [],
                'requires' => [],
                'files' => [],
                'morphs' => [],
                'settings' => [],
                'setting_files' => [],
                'restore' => null,
                'restore_forced' => false,
                'scope' => null,
            ];
        }

        return $categories;
    }
}
