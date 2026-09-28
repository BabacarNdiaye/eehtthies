<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Institutional e-mail domain
    |--------------------------------------------------------------------------
    |
    | Used by App\Support\InstitutionalEmail to auto-generate prenom.nom@...
    | addresses for students, teachers, guardians and staff who don't already
    | have one, so portal access can always be created.
    |
    */
    'institutional_email_domain' => 'eeht-thies.sn',

    /*
    |--------------------------------------------------------------------------
    | Default password
    |--------------------------------------------------------------------------
    |
    | Assigned when creating portal access for a student, teacher or parent.
    | Actors are expected to change it from their own space (see the "Mot de
    | passe" link in each portal), which is why it doesn't need to be random.
    |
    */
    'default_password' => 'eeht2026',

    /*
    |--------------------------------------------------------------------------
    | Late grace period (minutes)
    |--------------------------------------------------------------------------
    |
    | A student QR-scanned within this many minutes after their class's
    | scheduled start_time still counts as "present"; beyond it, the scan is
    | auto-classified "retard". See App\Services\AttendanceCheckInResolver.
    |
    */
    'late_grace_minutes' => 5,

    /*
    |--------------------------------------------------------------------------
    | Academic terms
    |--------------------------------------------------------------------------
    |
    | The list of terms/periods used across exams, grades and report cards.
    | Kept centralised here so it can be adjusted without touching code.
    |
    */
    'terms' => [
        'Semestre 1',
        'Semestre 2',
    ],

    /*
    |--------------------------------------------------------------------------
    | Permission modules & actions
    |--------------------------------------------------------------------------
    |
    | Every permission in the system is named "{action}_{module}" (e.g.
    | "voir_eleves"). This catalogue is the single source of truth used both
    | by the roles/permissions seeder and by the role management UI.
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
    | Protected roles
    |--------------------------------------------------------------------------
    |
    | These roles cannot be renamed or deleted through the role management UI,
    | to avoid an administrator accidentally locking themselves (or everyone
    | else) out of the back-office.
    |
    */
    'protected_roles' => ['super-admin'],

    /*
    |--------------------------------------------------------------------------
    | Bulletin (report card) — Senegalese grading conventions
    |--------------------------------------------------------------------------
    |
    | Classic Senegalese secondary-school report cards split each subject's
    | grade into a continuous-assessment note ("Devoir") and an end-of-term
    | exam note ("Composition"), then average the two for MOY/20. Exam types
    | map onto those two categories below.
    |
    */
    'exam_category_devoir' => ['devoir', 'interrogation', 'controle'],
    'exam_category_composition' => ['examen', 'examen_theorique', 'examen_pratique'],

    // Per-subject appreciation, keyed by the minimum MOY/20 threshold (descending).
    'appreciation_scale' => [
        18 => 'Excellent',
        16 => 'Très Bien',
        14 => 'Bien',
        12 => 'Assez Bien',
        8 => 'Passable',
        5 => 'Faible',
        0 => 'Très Faible',
    ],

    // Overall-average thresholds auto-suggesting a conseil de classe mention.
    // "blame" is never auto-suggested — it reflects a conduct decision, not a grade.
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
