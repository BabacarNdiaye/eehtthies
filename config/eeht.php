<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Domaine des e-mails institutionnels
    |--------------------------------------------------------------------------
    |
    | Utilisé par App\Support\InstitutionalEmail pour générer automatiquement des adresses prenom.nom@... pour
    | les élèves, enseignants, tuteurs et membres du personnel qui n'en ont pas encore, afin que l'accès au
    | portail puisse toujours être créé.
    |
    */
    'institutional_email_domain' => 'eeht-thies.sn',

    /*
    |--------------------------------------------------------------------------
    | Mot de passe par défaut
    |--------------------------------------------------------------------------
    |
    | Attribué lors de la création de l'accès au portail d'un élève, d'un enseignant ou d'un parent. Les
    | acteurs sont censés le modifier depuis leur propre espace (voir le lien « Mot de passe » de chaque
    | portail), ce qui explique qu'il n'ait pas besoin d'être aléatoire.
    |
    */
    'default_password' => 'eeht2026',

    /*
    |--------------------------------------------------------------------------
    | Délai de grâce avant retard (minutes)
    |--------------------------------------------------------------------------
    |
    | Un élève scanné par QR dans ce nombre de minutes après l'heure de début (start_time) prévue de sa classe
    | compte encore comme « présent » ; au-delà, le scan est classé automatiquement « retard ». Voir
    | App\Services\AttendanceCheckInResolver.
    |
    */
    'late_grace_minutes' => 5,

    /*
    |--------------------------------------------------------------------------
    | Périodes académiques
    |--------------------------------------------------------------------------
    |
    | La liste des périodes utilisées pour les examens, les notes et les bulletins. Centralisée ici pour
    | pouvoir être ajustée sans toucher au code.
    |
    */
    'terms' => [
        'Semestre 1',
        'Semestre 2',
    ],

    /*
    |--------------------------------------------------------------------------
    | Modules et actions de permissions
    |--------------------------------------------------------------------------
    |
    | Chaque permission du système est nommée « {action}_{module} » (p. ex. « voir_eleves »). Ce catalogue est
    | la source de vérité unique utilisée à la fois par le seeder des rôles et permissions et par l'interface
    | de gestion des rôles.
    |
    */
    'permission_modules' => [
        'formations' => 'Formations',
        'candidatures' => 'Candidatures',
        'eleves' => 'Élèves',
        'enseignants' => 'Enseignants',
        'classes' => 'Classes',
        'matieres' => 'Matières',
        'emploi_du_temps' => 'Emploi du temps',
        'presences' => 'Présences',
        'examens' => 'Examens & devoirs',
        'notes' => 'Notes',
        'bulletins' => 'Bulletins',
        'salles' => 'Salles',
        'comptabilite' => 'Comptabilité',
        'stocks' => 'Stocks',
        'communication' => 'Communication',
        'actualites' => 'Actualités',
        'evenements' => 'Événements',
        'galerie' => 'Galerie',
        'partenaires' => 'Partenaires',
        'temoignages' => 'Témoignages',
        'faq' => 'FAQ',
        'statistiques' => 'Statistiques',
        'utilisateurs' => 'Utilisateurs',
        'parametres' => 'Paramètres',
        'insertion' => 'Insertion professionnelle',
        'organigramme' => 'Organigramme',
        'roles' => 'Rôles & permissions',
        'salaires' => 'Salaires',
        'sauvegardes' => 'Sauvegardes',
        'activite' => "Journal d'activité",
    ],

    'permission_actions' => [
        'voir' => 'Voir',
        'ajouter' => 'Ajouter',
        'modifier' => 'Modifier',
        'supprimer' => 'Supprimer',
        'valider' => 'Valider',
        'exporter' => 'Exporter',
    ],

    /*
    |--------------------------------------------------------------------------
    | Rôles protégés
    |--------------------------------------------------------------------------
    |
    | Ces rôles ne peuvent être ni renommés ni supprimés via l'interface de gestion des rôles, pour éviter
    | qu'un administrateur ne se verrouille accidentellement (ou ne verrouille tout le monde) hors du
    | back-office.
    |
    */
    'protected_roles' => ['super-admin'],

    /*
    |--------------------------------------------------------------------------
    | Bulletin — conventions de notation sénégalaises
    |--------------------------------------------------------------------------
    |
    | Les bulletins classiques du secondaire sénégalais divisent la note de chaque matière en une note de
    | contrôle continu (« Devoir ») et une note d'examen de fin de période (« Composition »), puis font la
    | moyenne des deux pour la MOY/20. Les types d'examen sont rattachés à ces deux catégories ci-dessous.
    |
    */
    'exam_category_devoir' => ['devoir', 'interrogation', 'controle'],
    'exam_category_composition' => ['examen', 'examen_theorique', 'examen_pratique'],

    // Appréciation par matière, indexée sur le seuil minimal de MOY/20 (décroissant).
    'appreciation_scale' => [
        18 => 'Excellent',
        16 => 'Très Bien',
        14 => 'Bien',
        12 => 'Assez Bien',
        8 => 'Passable',
        5 => 'Faible',
        0 => 'Très Faible',
    ],

    // Seuils de moyenne générale suggérant automatiquement une mention du conseil de classe. Le « blâme »
    // n'est jamais suggéré automatiquement — il reflète une décision de conduite, pas une note.
    'mention_scale' => [
        16 => 'felicitations',
        14 => 'encouragement',
        12 => 'tableau_honneur',
    ],
    'mention_labels' => [
        'felicitations' => 'Félicitations',
        'encouragement' => 'Encouragement',
        'tableau_honneur' => "Tableau d'honneur",
        'avertissement' => 'Avertissement',
        'blame' => 'Blâme',
    ],

    'decision_labels' => [
        'admis' => 'Admis(e) en classe supérieure',
        'redouble' => 'Autorisé(e) à redoubler',
        'exclu' => 'Exclusion',
        'rattrapage' => 'Rattrapage',
        'non_defini' => 'Non défini',
    ],
];
