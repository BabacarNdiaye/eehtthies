-- Généré automatiquement — données réelles EEHT de Thiès pour import en production.
-- Importer via phpMyAdmin APRÈS avoir exécuté `php artisan migrate` sur la base vide.

SET FOREIGN_KEY_CHECKS=0;

-- Table: academic_years (2 ligne(s))
DELETE FROM `academic_years`;
INSERT INTO `academic_years` (`id`, `label`, `start_date`, `end_date`, `is_current`, `created_at`, `updated_at`) VALUES
(1, '2026-2027', '2026-10-01 00:00:00', '2027-07-31 00:00:00', 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(2, '2025-2026', '2025-11-01 00:00:00', '2026-08-30 00:00:00', 0, '2026-08-23 12:42:30', '2026-08-23 12:42:30');

-- Table: accounts (29 ligne(s))
DELETE FROM `accounts`;
INSERT INTO `accounts` (`id`, `code`, `name`, `class`, `nature`, `is_active`, `created_at`, `updated_at`) VALUES
(1, '101000', 'Capital', 1, 'passif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(2, '120000', 'Résultat de l\'exercice', 1, 'passif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(3, '161000', 'Emprunts', 1, 'passif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(4, '211000', 'Terrains', 2, 'actif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(5, '218000', 'Autres immobilisations corporelles', 2, 'actif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(6, '311000', 'Stocks de fournitures et matières', 3, 'actif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(7, '401000', 'Fournisseurs', 4, 'passif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(8, '411000', 'Clients — Élèves', 4, 'actif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(9, '421000', 'Personnel — rémunérations dues', 4, 'passif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(10, '431000', 'Caisse de sécurité sociale', 4, 'passif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(11, '441000', 'État — impôts et taxes', 4, 'passif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(12, '447000', 'État — retenues à la source', 4, 'passif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(13, '521000', 'Banque', 5, 'actif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(14, '571000', 'Caisse', 5, 'actif', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(15, '601000', 'Achats de fournitures', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(16, '605000', 'Autres achats', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(17, '615000', 'Entretien, réparations et maintenance', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(18, '622000', 'Locations', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(19, '623000', 'Publicité, publications, relations publiques', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(20, '624000', 'Transports', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(21, '628000', 'Charges diverses', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(22, '631000', 'Impôts et taxes directs', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(23, '661000', 'Rémunérations directes versées au personnel', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(24, '664000', 'Charges sociales sur rémunérations', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(25, '681000', 'Dotations aux amortissements', 6, 'charge', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(26, '706100', 'Produits des frais d\'inscription', 7, 'produit', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(27, '706200', 'Produits de la scolarité et mensualités', 7, 'produit', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(28, '707000', 'Autres produits d\'exploitation', 7, 'produit', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(29, '758000', 'Produits divers', 7, 'produit', 1, '2026-08-23 14:29:25', '2026-08-23 14:29:25');

-- Table: attendances (6 ligne(s))
DELETE FROM `attendances`;
INSERT INTO `attendances` (`id`, `student_id`, `school_class_id`, `subject_id`, `date`, `status`, `justification`, `recorded_by`, `created_at`, `updated_at`) VALUES
(19, 6, 2, 4, '2026-08-23 00:00:00', 'present', NULL, 1, '2026-08-23 08:49:09', '2026-08-23 08:49:09'),
(20, 1, 2, 4, '2026-08-23 00:00:00', 'present', NULL, 1, '2026-08-23 08:49:09', '2026-08-23 08:49:09'),
(21, 5, 2, 4, '2026-08-23 00:00:00', 'present', NULL, 1, '2026-08-23 08:49:09', '2026-08-23 08:49:09'),
(22, 7, 2, 4, '2026-08-23 00:00:00', 'absent', NULL, 1, '2026-08-23 08:49:09', '2026-08-23 08:49:09'),
(23, 4, 2, 4, '2026-08-23 00:00:00', 'present', NULL, 1, '2026-08-23 08:49:09', '2026-08-23 08:49:09'),
(24, 3, 2, 4, '2026-08-23 00:00:00', 'present', NULL, 1, '2026-08-23 08:49:09', '2026-08-23 08:49:09');

-- Table: candidatures (2 ligne(s))
DELETE FROM `candidatures`;
INSERT INTO `candidatures` (`id`, `reference`, `formation_id`, `academic_year_id`, `first_name`, `last_name`, `birth_date`, `gender`, `email`, `phone`, `address`, `guardian_name`, `guardian_phone`, `last_school`, `last_diploma`, `motivation`, `status`, `admin_notes`, `source`, `interview_at`, `submitted_at`, `created_at`, `updated_at`) VALUES
(1, 'CAND-2026-NPIXTG', 7, NULL, 'Babacar', 'NDIAYE', '1994-04-19 00:00:00', 'M', 'babsgeo18@gmail.com', '771877918', 'Thies', NULL, NULL, NULL, NULL, NULL, 'inscription_finalisee', NULL, 'site', '2026-08-22 22:53:00', '2026-08-22 18:52:39', '2026-08-22 18:52:39', '2026-08-22 19:03:11'),
(2, 'CAND-2026-L8WRBK', 7, NULL, 'Moussa', 'NDIAYE', '2007-02-23 00:00:00', 'M', 'babsgeo18@gmail.com', '771877918', 'Thies', NULL, NULL, NULL, NULL, NULL, 'inscription_finalisee', NULL, 'site', '2026-08-24 12:34:00', '2026-08-23 12:34:11', '2026-08-23 12:34:11', '2026-08-23 12:36:59');

-- Table: event_items (2 ligne(s))
DELETE FROM `event_items`;
INSERT INTO `event_items` (`id`, `title`, `slug`, `description`, `image`, `location`, `start_at`, `end_at`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 'Journée Portes Ouvertes', 'journee-portes-ouvertes-uV58m', 'Venez découvrir nos infrastructures, nos formations et échanger avec nos équipes pédagogiques.', 'events/oeYzazbghPUrowd4dEqjP5EVzErxU76mDuuxY7at.jpg', 'Campus EEHT, Thiès', '2026-09-11 09:00:00', '2026-09-11 17:00:00', 1, '2026-08-22 14:52:57', '2026-08-22 18:48:23'),
(2, 'Cérémonie de remise des diplômes', 'ceremonie-de-remise-des-diplomes-ONWSj', 'Célébration de la réussite de la promotion sortante en présence des partenaires de l\'école.', 'events/hQXnd6OOe3Yd17Wa7IcBHCL00tGX4Z3jvlcvAAW2.jpg', 'Auditorium EEHT, Thiès', '2026-10-21 10:00:00', NULL, 1, '2026-08-22 14:52:57', '2026-08-22 18:48:12');

-- Table: exam_teacher (1 ligne(s))
DELETE FROM `exam_teacher`;
INSERT INTO `exam_teacher` (`id`, `exam_id`, `teacher_id`, `created_at`, `updated_at`) VALUES
(1, 25, 1, NULL, NULL);

-- Table: exams (2 ligne(s))
DELETE FROM `exams`;
INSERT INTO `exams` (`id`, `title`, `type`, `session`, `school_class_id`, `subject_id`, `room_id`, `academic_year_id`, `term`, `exam_date`, `start_time`, `end_time`, `max_score`, `coefficient`, `is_published`, `created_at`, `updated_at`, `created_by`) VALUES
(25, 'Devoir 1', 'devoir', 'normale', 2, 1, 1, 1, 'Semestre 1', '2026-08-22 00:00:00', '08:28', '09:28', 20, 1, 1, '2026-08-22 22:28:42', '2026-08-22 22:28:42', NULL),
(27, 'Devoir à faire', 'controle', 'normale', 2, 1, NULL, 1, 'Semestre 1', '2026-08-24 00:00:00', NULL, NULL, 20, 1, 0, '2026-08-22 23:59:34', '2026-08-22 23:59:34', 4);

-- Table: expenses (13 ligne(s))
DELETE FROM `expenses`;
INSERT INTO `expenses` (`id`, `category`, `label`, `amount`, `expense_date`, `payment_method`, `supplier_name`, `notes`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 'salaires', 'Salaires du personnel — mois en cours', 3500000, '2026-08-17 14:52:58', 'virement', NULL, NULL, NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 'fournisseurs', 'Achat denrées alimentaires', 250000, '2026-08-10 14:52:58', 'especes', 'Grossiste Thiès Alimentation', NULL, NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(3, 'maintenance', 'Entretien matériel de cuisine', 85000, '2026-08-02 14:52:58', 'especes', NULL, NULL, NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(4, 'transport', 'Transport élèves — sortie pédagogique', 120000, '2026-07-28 14:52:58', 'virement', NULL, NULL, NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(6, 'salaires', 'Salaire — Janvier 2026 — Directrice EEHT', 500000, '2026-08-23 00:00:00', 'virement', NULL, NULL, 1, '2026-08-23 14:09:32', '2026-08-23 14:09:32'),
(10, 'salaires', 'Salaire — Mars 2026 — Directrice EEHT', 500000, '2026-08-23 00:00:00', 'virement', NULL, NULL, 1, '2026-08-23 14:34:14', '2026-08-23 14:34:14'),
(11, 'salaires', 'Salaire — Mars 2026 — Babacar NDIAYE', 60000, '2026-08-23 00:00:00', 'virement', NULL, NULL, 1, '2026-08-23 14:34:18', '2026-08-23 14:34:18'),
(12, 'salaires', 'Salaire — Février 2026 — Babacar NDIAYE', 60000, '2026-08-23 00:00:00', 'virement', NULL, NULL, 1, '2026-08-23 14:34:20', '2026-08-23 14:34:20'),
(13, 'salaires', 'Salaire — Janvier 2026 — Babacar NDIAYE', 60000, '2026-08-23 00:00:00', 'virement', NULL, NULL, 1, '2026-08-23 14:34:22', '2026-08-23 14:34:22'),
(14, 'salaires', 'Salaire — Juin 2026 — Directrice EEHT', 500000, '2026-08-23 00:00:00', 'virement', NULL, NULL, 1, '2026-08-23 14:34:55', '2026-08-23 14:34:55'),
(15, 'salaires', 'Salaire — Juin 2026 — Babacar NDIAYE', 60000, '2026-08-23 00:00:00', 'virement', NULL, NULL, 1, '2026-08-23 14:34:58', '2026-08-23 14:34:58'),
(16, 'salaires', 'Salaire — Mai 2026 — Directrice EEHT', 500000, '2026-08-23 00:00:00', 'virement', NULL, NULL, 1, '2026-08-23 14:47:50', '2026-08-23 14:47:50'),
(17, 'salaires', 'Salaire — Avril 2026 — Babacar NDIAYE', 60000, '2026-08-23 00:00:00', 'mobile_money', NULL, NULL, 1, '2026-08-23 15:05:44', '2026-08-23 15:05:44');

-- Table: faqs (3 ligne(s))
DELETE FROM `faqs`;
INSERT INTO `faqs` (`id`, `question`, `answer`, `category`, `order`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 'Quelles sont les conditions d\'admission ?', 'Les conditions varient selon la formation (BFEM pour le CAP, Baccalauréat pour le BTS). Consultez la fiche de chaque formation pour le détail.', 'Admission', 1, 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(2, 'Comment déposer ma candidature ?', 'Rendez-vous dans l\'espace candidat du site, créez votre dossier et téléversez les documents demandés.', 'Admission', 2, 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(3, 'Quels sont les frais de scolarité ?', 'Les frais varient selon la formation choisie. Ils sont détaillés sur la page de chaque formation.', 'Finances', 3, 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57');

-- Table: formations (6 ligne(s))
DELETE FROM `formations`;
INSERT INTO `formations` (`id`, `name`, `code`, `slug`, `diploma`, `level`, `duration`, `description`, `admission_conditions`, `registration_fee`, `tuition_fee`, `program`, `objectives`, `career_prospects`, `capacity`, `image`, `is_active`, `order`, `created_at`, `updated_at`) VALUES
(2, 'BTS Tourisme', 'BTS-TOUR', 'bts-tourisme', 'BTS', 'Bac+2', '2 ans', 'Le Brevet de Technicien Supérieur (BTS) Tourisme est une formation d\'enseignement supérieur professionnel destinée à former des techniciens supérieurs capables de participer à la conception, à la commercialisation et à la gestion de produits et services touristiques.

La formation prépare aux métiers des agences de voyages, offices de tourisme, structures d\'hébergement, entreprises de loisirs, transport touristique et organisations de promotion touristique.', '• Être titulaire du Baccalauréat ou d\'un diplôme admis en équivalence
• Ou être titulaire d\'un diplôme professionnel permettant l\'accès au niveau BTS selon la réglementation applicable
• Satisfaire aux conditions d\'admission de l\'établissement
• Présenter un dossier complet', 50000, 700000, 'ENSEIGNEMENTS TOURISTIQUES
• Introduction au tourisme, géographie touristique
• Patrimoine culturel et naturel, destinations touristiques
• Techniques de production et de conception de produits touristiques
• Techniques de vente, gestion des agences de voyages
• Billetterie et réservation
• Marketing touristique et promotion des destinations
• Animation touristique, gestion des événements
• Tourisme durable, législation touristique

GESTION ET MANAGEMENT
• Gestion des entreprises touristiques
• Comptabilité et gestion financière
• Gestion des ressources humaines
• Management, économie et droit du tourisme
• Entrepreneuriat

COMMUNICATION ET LANGUES
• Français professionnel
• Anglais touristique
• Communication professionnelle et techniques de négociation
• Informatique et outils numériques du tourisme

PROFESSIONNALISATION
• Études de cas, projet touristique
• Travaux pratiques, visites professionnelles
• Stage en entreprise
• Mémoire ou projet de fin de formation', '• Concevoir et commercialiser des produits touristiques
• Accueillir, informer et conseiller les touristes
• Organiser des voyages et circuits
• Participer à la promotion d\'une destination
• Gérer les opérations d\'une agence de voyages
• Utiliser les outils numériques de réservation et de gestion
• Développer des activités touristiques durables
• Participer à la gestion d\'une entreprise touristique', '• Technicien supérieur en tourisme
• Agent de voyages, conseiller en voyages
• Agent de réservation
• Chargé de production ou de développement touristique
• Guide touristique, selon les qualifications et autorisations requises
• Agent d\'accueil touristique
• Chargé de promotion touristique, assistant marketing touristique
• Organisateur d\'événements
• Entrepreneur dans le secteur touristique', 35, 'formations/IST8M5eGDxfXCueYSz3nptiTi10oQ7lku5DHsvKz.jpg', 1, 5, '2026-08-22 14:52:57', '2026-08-22 18:46:10'),
(7, 'BEP Restauration', 'BEP-REST', 'bep-restauration', 'BEP', 'Niveau I', '2 ans', 'Le Brevet d\'Études Professionnelles (BEP) Restauration est une formation professionnalisante permettant d\'approfondir les compétences dans les domaines de la cuisine, du restaurant et du service.

Elle prépare les apprenants à maîtriser les différentes étapes de la production et du service en restauration, depuis l\'organisation du poste de travail jusqu\'à la satisfaction du client.

La formation accorde une place importante aux travaux pratiques et aux situations réelles de production, ainsi qu\'au développement des connaissances en gestion, communication, hygiène et organisation professionnelle.', '• Être titulaire du BFEM, du CAP correspondant ou d\'un diplôme admis en équivalence, selon la voie de formation
• Posséder un niveau scolaire compatible avec la formation
• Satisfaire aux conditions administratives fixées par l\'établissement et les autorités compétentes
• Être apte à suivre les activités pratiques liées aux métiers de la restauration', 0, 0, 'ENSEIGNEMENTS PROFESSIONNELS
• Technologie culinaire
• Techniques de cuisine
• Cuisine sénégalaise, africaine et internationale
• Pâtisserie de base
• Techniques de restaurant
• Service des mets et boissons
• Art de la table
• Organisation du travail
• Gestion des approvisionnements
• Connaissance des produits
• Hygiène et sécurité alimentaire
• Prévention des risques professionnels

ENSEIGNEMENTS GÉNÉRAUX ET APPLIQUÉS
• Français
• Anglais professionnel
• Mathématiques appliquées
• Sciences appliquées
• Informatique
• Communication professionnelle
• Économie et gestion
• Entrepreneuriat
• Droit et législation professionnelle
• Éducation civique

FORMATION PRATIQUE
• Travaux pratiques de cuisine et de restaurant
• Simulations professionnelles
• Études de cas
• Stage en entreprise', '• Réaliser des productions culinaires de qualité
• Organiser et gérer son poste de travail
• Assurer un service professionnel en salle
• Maîtriser les techniques de dressage et de présentation
• Appliquer les normes d\'hygiène et de sécurité
• Participer à la gestion des matières premières
• Communiquer avec la clientèle et les équipes
• Développer son autonomie professionnelle', '• Cuisinier débutant
• Commis de cuisine qualifié
• Employé qualifié de restauration
• Serveur qualifié
• Chef de rang débutant
• Employé de restaurant
• Employé polyvalent d\'hôtel
• Agent de restauration collective
• Employé chez un traiteur

Poursuite d\'études possible vers le BT Restauration ou d\'autres formations compatibles.', NULL, 'formations/Gz4RCJ3lTvT3sFLaLAPTOUA55EvlOBrarMbzMAhe.jpg', 1, 2, '2026-08-22 15:56:11', '2026-08-22 22:23:20'),
(8, 'BEP Réceptionniste', 'BEP-RECEP', 'bep-receptionniste', 'BEP', 'Niveau IV', '2 ans', 'Le BEP Réceptionniste prépare les apprenants aux métiers de l\'accueil et de la réception dans les établissements hôteliers et touristiques.

Le réceptionniste représente l\'un des principaux interlocuteurs du client : il assure l\'accueil, l\'information, l\'enregistrement, l\'orientation et le suivi du séjour des clients.

La formation permet de développer les compétences en communication, accueil, langues étrangères, outils informatiques et organisation des activités de réception.', '• Être titulaire du BFEM, d\'un diplôme professionnel correspondant ou d\'un diplôme admis en équivalence
• Posséder les aptitudes nécessaires à la communication et à l\'accueil
• Être motivé par les métiers de l\'hôtellerie
• Satisfaire aux conditions administratives de l\'établissement', 0, 0, 'ENSEIGNEMENTS PROFESSIONNELS
• Techniques d\'accueil et de réception
• Gestion des réservations
• Enregistrement et départ des clients
• Relation clientèle
• Communication professionnelle et correspondance commerciale
• Organisation d\'un établissement hôtelier
• Initiation à la gestion hôtelière
• Utilisation des logiciels de réception
• Gestion des réclamations

LANGUES ET COMMUNICATION
• Français professionnel
• Anglais hôtelier
• Communication orale et écrite
• Techniques de vente
• Accueil d\'une clientèle nationale et internationale

ENSEIGNEMENTS COMPLÉMENTAIRES
• Informatique
• Mathématiques appliquées
• Économie et gestion
• Hygiène et sécurité
• Législation professionnelle
• Entrepreneuriat
• Culture touristique
• Stage professionnel', '• Accueillir et orienter les clients
• Gérer les réservations
• Effectuer les opérations d\'arrivée et de départ
• Communiquer efficacement avec la clientèle
• Utiliser les outils informatiques professionnels
• Gérer les informations liées au séjour des clients
• Répondre aux demandes et réclamations
• Contribuer à l\'image et à la qualité de service d\'un établissement', '• Réceptionniste
• Agent d\'accueil
• Agent de réservation
• Employé de réception
• Standardiste
• Assistant réception
• Agent d\'information touristique
• Employé polyvalent dans un hôtel ou une résidence touristique', NULL, 'formations/i32g1ELhim996E3hFofYhDjsuq306EwuWt16LIwd.jpg', 1, 3, '2026-08-22 15:56:11', '2026-08-22 18:42:11'),
(9, 'BT Restauration', 'BT-REST', 'bt-restauration', 'BT', 'Niveau III', '3 ans', 'Le Brevet de Technicien (BT) Restauration est une formation de niveau supérieur au BEP permettant de former des techniciens capables d\'exercer des responsabilités plus importantes dans la production culinaire, le restaurant et l\'organisation d\'un service.

La formation développe à la fois les compétences techniques, organisationnelles et managériales : l\'apprenant est préparé à superviser une équipe, organiser une activité de restauration, contrôler la qualité des prestations et participer à la gestion d\'un établissement.', '• Être titulaire du BEP correspondant, du BFEM avec le niveau ou parcours exigé, ou d\'un diplôme admis en équivalence selon les modalités d\'accès
• Répondre aux conditions fixées pour la formation concernée
• Posséder de bonnes bases en restauration et dans les matières générales', 0, 0, 'DOMAINE PROFESSIONNEL
• Technologie de la restauration
• Techniques culinaires avancées
• Cuisine nationale et internationale, gastronomie, pâtisserie
• Organisation de la production
• Techniques de restaurant et art de la table
• Œnologie et connaissance des boissons
• Gestion des approvisionnements et des stocks
• Contrôle de la qualité
• Hygiène, sécurité et HACCP
• Management d\'équipe

GESTION ET ADMINISTRATION
• Économie, gestion hôtelière et restauration
• Comptabilité de base et calcul des coûts
• Gestion des achats et contrôle budgétaire
• Marketing et techniques de vente
• Création et gestion d\'entreprise

ENSEIGNEMENTS GÉNÉRAUX
• Français
• Anglais professionnel
• Mathématiques appliquées
• Informatique
• Communication professionnelle
• Droit et législation
• Entrepreneuriat

PROFESSIONNALISATION
• Travaux pratiques et projets professionnels
• Études de cas et visites pédagogiques
• Stage en entreprise', '• Organiser une activité de restauration
• Superviser la production culinaire
• Contrôler la qualité des prestations
• Encadrer une équipe
• Participer à la gestion d\'un restaurant
• Gérer les approvisionnements et les stocks
• Calculer les coûts et contribuer à la rentabilité
• Appliquer les normes d\'hygiène et de sécurité
• Développer un projet entrepreneurial dans la restauration', '• Technicien en restauration
• Chef de cuisine adjoint
• Chef de partie
• Responsable de salle
• Maître d\'hôtel débutant
• Responsable d\'unité de restauration
• Responsable de production
• Gestionnaire de restaurant
• Responsable de service traiteur
• Entrepreneur dans la restauration', NULL, 'formations/JTs03qZYLCYzo8R25vwOIBOctSO5V39I8PRnpGax.jpg', 1, 4, '2026-08-22 15:56:11', '2026-08-22 18:45:45'),
(10, 'DTS Tourisme', 'DTS-TOUR', 'dts-tourisme', 'DTS', 'Bac+3', '2 ans', 'Le Diplôme de Technicien Supérieur (DTS) Tourisme est une formation supérieure professionnelle orientée vers l\'acquisition de compétences techniques, managériales et opérationnelles dans le domaine du tourisme.

Cette formation permet de développer une expertise dans la gestion des entreprises touristiques, la conception de produits et circuits, la commercialisation, la promotion des destinations et le management des services touristiques, avec une place importante accordée à la professionnalisation, aux outils numériques, aux langues étrangères et à l\'expérience en entreprise.', '• Être titulaire du Baccalauréat ou d\'un diplôme reconnu équivalent
• Répondre aux conditions particulières fixées par l\'établissement
• Posséder un intérêt pour les métiers du tourisme, de la communication et de la gestion
• Déposer un dossier d\'admission complet', 0, 0, 'TOURISME ET DÉVELOPPEMENT
• Fondamentaux du tourisme, géographie touristique
• Patrimoine et culture, développement touristique
• Tourisme durable et responsable, aménagement touristique
• Gestion des destinations, études des marchés touristiques

PRODUCTION ET COMMERCIALISATION
• Production de voyages, conception de circuits touristiques
• Techniques de vente, gestion des agences de voyages
• Réservation et billetterie
• Marketing touristique, marketing digital et e-tourisme
• Relation client

MANAGEMENT ET GESTION
• Management des organisations touristiques
• Gestion financière, comptabilité, contrôle de gestion
• Gestion des ressources humaines
• Droit et économie du tourisme
• Gestion de projet, entrepreneuriat

COMMUNICATION
• Français professionnel, anglais touristique
• Communication professionnelle et digitale
• Techniques de négociation
• Informatique et outils professionnels

PROFESSIONNALISATION
• Projet tutoré, études de cas, séminaires professionnels
• Visites d\'entreprises
• Stage professionnel, rapport ou mémoire de stage
• Soutenance finale', '• Analyser le marché touristique
• Concevoir des produits et services touristiques
• Organiser et commercialiser des voyages
• Gérer une activité ou une entreprise touristique
• Promouvoir les destinations et patrimoines
• Élaborer des stratégies marketing
• Utiliser les technologies numériques du tourisme
• Gérer des projets touristiques
• Créer et développer une entreprise dans le secteur touristique', '• Technicien supérieur en tourisme
• Responsable d\'agence de voyages
• Chargé de production ou de réservation touristique
• Responsable commercial tourisme
• Chargé de marketing touristique
• Responsable d\'accueil touristique
• Chargé de développement touristique
• Assistant chef de projet touristique
• Gestionnaire de structure touristique
• Consultant junior en tourisme
• Entrepreneur touristique', NULL, 'formations/OvzoKBcYlZDsVl11EfxbkcQFhBJpcJ6jMBac9m1C.jpg', 1, 6, '2026-08-22 15:56:11', '2026-08-22 18:45:00'),
(11, 'CAP Restauration', 'CAP-REST', 'cap-restauration', 'CAP', 'Niveau V', '3 ans', 'Le Certificat d\'Aptitude Professionnelle (CAP) Restauration est une formation professionnelle destinée aux apprenants souhaitant acquérir les compétences de base nécessaires pour travailler dans les métiers de la restauration.

La formation permet notamment de maîtriser les techniques fondamentales de préparation culinaire, de service en salle, de mise en place, d\'accueil de la clientèle ainsi que les règles d\'hygiène, de sécurité alimentaire et d\'organisation du travail.

L\'apprenant est préparé à évoluer dans un environnement professionnel tel qu\'un restaurant, un hôtel, une cantine, un service traiteur ou toute autre structure de restauration.', '• Avoir le niveau requis pour intégrer une formation professionnelle de niveau CAP
• Être motivé par les métiers de la restauration
• Satisfaire aux conditions d\'inscription fixées par l\'établissement
• Présenter les pièces administratives demandées
• Pour les candidats suivant la voie des examens d\'État, respecter les conditions fixées par les autorités compétentes', 0, 0, 'ENSEIGNEMENTS PROFESSIONNELS
• Technologie professionnelle de la restauration
• Techniques culinaires
• Cuisine sénégalaise et internationale
• Techniques de préparation et de cuisson
• Service en salle
• Art de la table
• Mise en place et dressage
• Hygiène et sécurité alimentaire
• Sciences appliquées à l\'alimentation
• Connaissance des produits alimentaires

ENSEIGNEMENTS GÉNÉRAUX
• Communication professionnelle
• Français
• Mathématiques appliquées
• Informatique
• Anglais professionnel
• Éducation civique et professionnelle
• Entrepreneuriat

FORMATION PRATIQUE
• Travaux pratiques
• Stage professionnel', '• Participer à la préparation et à la production des repas
• Appliquer les techniques culinaires de base
• Réaliser la mise en place d\'un service
• Accueillir et servir les clients
• Respecter les règles d\'hygiène et de sécurité
• Utiliser correctement le matériel professionnel
• Travailler efficacement en équipe
• S\'intégrer dans une structure professionnelle de restauration', '• Commis de cuisine
• Aide-cuisinier
• Commis de restaurant
• Serveur ou serveuse
• Employé polyvalent de restauration
• Agent de restauration collective
• Employé de service dans un hôtel
• Employé dans une entreprise de restauration ou de traiteur

Poursuite d\'études possible vers le BEP Restauration selon les conditions d\'admission.', NULL, 'formations/laAj3BJ4glF7Yl05iz41kEaKG4HC4bK8a0oScXxx.jpg', 1, 1, '2026-08-22 16:00:34', '2026-08-22 18:40:18');

-- Table: galleries (1 ligne(s))
DELETE FROM `galleries`;
INSERT INTO `galleries` (`id`, `title`, `slug`, `category`, `cover_image`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 'Remise de diplôme', 'remise-de-diplome', 'Evenement', NULL, 1, '2026-08-22 18:16:42', '2026-08-22 18:16:42');

-- Table: gallery_media (3 ligne(s))
DELETE FROM `gallery_media`;
INSERT INTO `gallery_media` (`id`, `gallery_id`, `type`, `path`, `caption`, `order`, `created_at`, `updated_at`) VALUES
(1, 1, 'image', 'galleries/1/WKLDtZT5UyuJLPgu9nDdzWLqRJYudYLlaVRwe2uH.jpg', NULL, 0, '2026-08-22 18:17:03', '2026-08-22 18:17:03'),
(2, 1, 'image', 'galleries/1/cDfdxNTVDiHhU975cx2Hjb3A5LNBOk8xGQhCRMwr.jpg', NULL, 0, '2026-08-22 18:17:03', '2026-08-22 18:17:03'),
(3, 1, 'image', 'galleries/1/QxaQrhavwcgLk5kJUD64YczLPYCGQYCotwQpyFPN.jpg', NULL, 0, '2026-08-22 18:17:03', '2026-08-22 18:17:03');

-- Table: grades (6 ligne(s))
DELETE FROM `grades`;
INSERT INTO `grades` (`id`, `exam_id`, `student_id`, `score`, `is_absent`, `comment`, `entered_by`, `created_at`, `updated_at`) VALUES
(145, 25, 6, 10, 0, NULL, 4, '2026-08-22 22:29:31', '2026-08-22 22:29:31'),
(146, 25, 1, 12, 0, NULL, 4, '2026-08-22 22:29:31', '2026-08-22 22:29:31'),
(147, 25, 5, 13, 0, NULL, 4, '2026-08-22 22:29:31', '2026-08-22 22:29:31'),
(148, 25, 4, 16, 0, NULL, 4, '2026-08-22 22:29:31', '2026-08-22 22:29:31'),
(149, 25, 3, 12, 0, NULL, 4, '2026-08-22 22:29:31', '2026-08-22 22:29:31'),
(150, 25, 7, 10, 0, NULL, 4, '2026-08-23 00:18:08', '2026-08-23 00:18:08');

-- Table: internal_messages (11 ligne(s))
DELETE FROM `internal_messages`;
INSERT INTO `internal_messages` (`id`, `sender_id`, `recipient_id`, `subject`, `body`, `read_at`, `created_at`, `updated_at`, `thread_id`) VALUES
(8, 1, 4, 'BONJOUR', 'BONJOUR', '2026-08-22 22:35:11', '2026-08-22 22:34:50', '2026-08-22 22:35:11', 8),
(9, 4, 1, 'Re: BONJOUR', 'SAVA MON CHER', '2026-08-22 22:35:33', '2026-08-22 22:35:20', '2026-08-22 22:35:33', 8),
(10, 1, 4, 'Re: BONJOUR', 'TU FAIS QUOI', '2026-08-22 22:35:53', '2026-08-22 22:35:47', '2026-08-22 22:35:53', 8),
(11, 4, 1, 'Re: BONJOUR', 'RIEN', '2026-08-22 22:36:15', '2026-08-22 22:35:59', '2026-08-22 22:36:15', 8),
(12, 1, 4, 'Re: BONJOUR', 'OK', '2026-08-22 22:36:34', '2026-08-22 22:36:19', '2026-08-22 22:36:34', 8),
(13, 1, 4, 'Re: BONJOUR', 'OK', '2026-08-22 22:36:34', '2026-08-22 22:36:24', '2026-08-22 22:36:34', 8),
(14, 4, 1, 'Re: BONJOUR', 'Merci', '2026-08-22 23:28:44', '2026-08-22 23:28:22', '2026-08-22 23:28:44', 8),
(16, 4, 2, 'Devoir programmer', 'Viens', NULL, '2026-08-23 00:06:08', '2026-08-23 00:06:08', 16),
(17, 4, 2, 'hyjk', 'hkhk', NULL, '2026-08-23 00:07:21', '2026-08-23 00:07:21', 17),
(18, 4, 6, 'hyjk', 'hkhk', '2026-08-23 00:08:00', '2026-08-23 00:07:21', '2026-08-23 00:08:00', 18),
(19, 6, 4, 'Re: hyjk', 'bonjour', '2026-08-23 00:17:25', '2026-08-23 00:08:07', '2026-08-23 00:17:25', 18);

-- Table: internship_offers (2 ligne(s))
DELETE FROM `internship_offers`;
INSERT INTO `internship_offers` (`id`, `partner_id`, `formation_id`, `title`, `description`, `positions_available`, `start_date`, `end_date`, `expires_at`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'Stage cuisine — saison estivale', NULL, 3, '2026-09-22 14:52:58', '2026-11-22 14:52:58', NULL, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 2, NULL, 'Stage réception hôtelière', NULL, 2, '2026-09-22 14:52:58', '2026-11-22 14:52:58', NULL, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58');

-- Table: internships (2 ligne(s))
DELETE FROM `internships`;
INSERT INTO `internships` (`id`, `student_id`, `partner_id`, `internship_offer_id`, `title`, `start_date`, `end_date`, `supervisor_name`, `supervisor_phone`, `supervisor_email`, `status`, `evaluation_score`, `evaluation_appreciation`, `attestation_number`, `created_at`, `updated_at`) VALUES
(1, 1, 1, NULL, 'Stage pratique — cuisine gastronomique', '2026-04-22 14:52:58', '2026-06-22 14:52:58', 'Chef Amadou Ba', NULL, NULL, 'termine', 16.5, 'Stagiaire sérieux et impliqué, bonne maîtrise des techniques de base.', 'ATT-2026-HTYANR', '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 6, 3, 2, 'stage', '2026-08-23 00:00:00', '2026-09-23 00:00:00', NULL, NULL, NULL, 'en_cours', NULL, NULL, NULL, '2026-08-23 19:29:40', '2026-08-23 19:29:40');

-- Table: invoices (12 ligne(s))
DELETE FROM `invoices`;
INSERT INTO `invoices` (`id`, `reference`, `student_id`, `academic_year_id`, `type`, `label`, `amount`, `discount`, `due_date`, `notes`, `created_at`, `updated_at`, `period_month`) VALUES
(1, 'FACT-2026-LTKKPR', 1, 1, 'scolarite', 'Frais de scolarité — 2026/2027', 750000, 0, '2026-10-22 14:52:58', NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58', NULL),
(2, 'FACT-2026-JNV8UZ', 2, 1, 'scolarite', 'Frais de scolarité — 2026/2027', 750000, 0, '2026-10-22 14:52:58', NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58', NULL),
(3, 'FACT-2026-JULCB7', 3, 1, 'scolarite', 'Frais de scolarité — 2026/2027', 750000, 0, '2026-10-22 14:52:58', NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58', NULL),
(4, 'FACT-2026-VPDAXE', 4, 1, 'scolarite', 'Frais de scolarité — 2026/2027', 750000, 0, '2026-10-22 14:52:58', NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58', NULL),
(5, 'FACT-2026-YX3SC6', 5, 1, 'scolarite', 'Frais de scolarité — BEP Restauration', 0, 0, NULL, NULL, '2026-08-22 19:04:51', '2026-08-22 19:04:51', NULL),
(6, 'FACT-2026-OCO8IC', 6, 1, 'scolarite', 'Frais de scolarité — BEP Restauration', 0, 0, NULL, NULL, '2026-08-22 19:04:51', '2026-08-22 19:04:51', NULL),
(7, 'FACT-2026-RWZD5W', 7, 1, 'scolarite', 'Frais de scolarité — BEP Restauration', 0, 0, NULL, NULL, '2026-08-22 19:04:51', '2026-08-22 19:04:51', NULL),
(23, 'FACT-2026-BRMYOR', 1, 1, 'mensualite', 'Mensualité — Septembre — BEP Restauration', 35000, 0, '2026-08-22 00:00:00', NULL, '2026-08-22 21:37:32', '2026-08-22 21:37:56', 9),
(24, 'FACT-2026-FS1PFM', 3, 1, 'mensualite', 'Mensualité — Septembre — BEP Restauration', 35000, 0, NULL, NULL, '2026-08-22 21:37:32', '2026-08-22 21:37:32', 9),
(25, 'FACT-2026-FRBUDV', 4, 1, 'mensualite', 'Mensualité — Septembre — BEP Restauration', 35000, 0, NULL, NULL, '2026-08-22 21:37:32', '2026-08-22 21:37:32', 9),
(26, 'FACT-2026-9SATUA', 5, 1, 'mensualite', 'Mensualité — Septembre — BEP Restauration', 35000, 0, NULL, NULL, '2026-08-22 21:37:32', '2026-08-22 21:37:32', 9),
(27, 'FACT-2026-Y19IPU', 6, 1, 'mensualite', 'Mensualité — Septembre — BEP Restauration', 35000, 0, NULL, NULL, '2026-08-22 21:37:32', '2026-08-22 21:37:32', 9);

-- Table: job_offers (2 ligne(s))
DELETE FROM `job_offers`;
INSERT INTO `job_offers` (`id`, `partner_id`, `title`, `description`, `contract_type`, `location`, `expires_at`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 1, 'Chef de partie', NULL, 'cdi', 'Dakar', NULL, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 2, 'Réceptionniste polyglotte', NULL, 'cdd', 'Saly', NULL, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58');

-- Table: journal_entries (28 ligne(s))
DELETE FROM `journal_entries`;
INSERT INTO `journal_entries` (`id`, `journal_id`, `entry_date`, `reference`, `description`, `entryable_type`, `entryable_id`, `is_auto`, `created_by`, `created_at`, `updated_at`) VALUES
(6, 3, '2026-08-23 00:00:00', 'ECR-2026-PCEADL', 'Dépense — Salaire — Mars 2026 — Directrice EEHT', 'App\\Models\\Expense', 10, 1, NULL, '2026-08-23 14:34:14', '2026-08-23 14:34:14'),
(7, 3, '2026-08-23 00:00:00', 'ECR-2026-K8KQGY', 'Dépense — Salaire — Mars 2026 — Babacar NDIAYE', 'App\\Models\\Expense', 11, 1, NULL, '2026-08-23 14:34:18', '2026-08-23 14:34:18'),
(8, 3, '2026-08-23 00:00:00', 'ECR-2026-QECFHC', 'Dépense — Salaire — Février 2026 — Babacar NDIAYE', 'App\\Models\\Expense', 12, 1, NULL, '2026-08-23 14:34:20', '2026-08-23 14:34:20'),
(9, 3, '2026-08-23 00:00:00', 'ECR-2026-7AYBGW', 'Dépense — Salaire — Janvier 2026 — Babacar NDIAYE', 'App\\Models\\Expense', 13, 1, NULL, '2026-08-23 14:34:22', '2026-08-23 14:34:22'),
(10, 3, '2026-08-23 00:00:00', 'ECR-2026-NUDJZW', 'Dépense — Salaire — Juin 2026 — Directrice EEHT', 'App\\Models\\Expense', 14, 1, NULL, '2026-08-23 14:34:55', '2026-08-23 14:34:55'),
(11, 3, '2026-08-23 00:00:00', 'ECR-2026-XTXS9O', 'Dépense — Salaire — Juin 2026 — Babacar NDIAYE', 'App\\Models\\Expense', 15, 1, NULL, '2026-08-23 14:34:58', '2026-08-23 14:34:58'),
(12, 1, '2026-08-22 00:00:00', 'ECR-2026-1NLHN1', 'Facture FACT-2026-LTKKPR — Frais de scolarité — 2026/2027', 'App\\Models\\Invoice', 1, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(13, 1, '2026-08-22 00:00:00', 'ECR-2026-6OEE3H', 'Facture FACT-2026-JNV8UZ — Frais de scolarité — 2026/2027', 'App\\Models\\Invoice', 2, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(14, 1, '2026-08-22 00:00:00', 'ECR-2026-WRNRBK', 'Facture FACT-2026-JULCB7 — Frais de scolarité — 2026/2027', 'App\\Models\\Invoice', 3, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(15, 1, '2026-08-22 00:00:00', 'ECR-2026-WCFFEZ', 'Facture FACT-2026-VPDAXE — Frais de scolarité — 2026/2027', 'App\\Models\\Invoice', 4, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(16, 1, '2026-08-22 00:00:00', 'ECR-2026-QQRINY', 'Facture FACT-2026-BRMYOR — Mensualité — Septembre — BEP Restauration', 'App\\Models\\Invoice', 23, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(17, 1, '2026-08-22 00:00:00', 'ECR-2026-GNKERU', 'Facture FACT-2026-FS1PFM — Mensualité — Septembre — BEP Restauration', 'App\\Models\\Invoice', 24, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(18, 1, '2026-08-22 00:00:00', 'ECR-2026-BGWLH4', 'Facture FACT-2026-FRBUDV — Mensualité — Septembre — BEP Restauration', 'App\\Models\\Invoice', 25, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(19, 1, '2026-08-22 00:00:00', 'ECR-2026-VIJOCR', 'Facture FACT-2026-9SATUA — Mensualité — Septembre — BEP Restauration', 'App\\Models\\Invoice', 26, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(20, 1, '2026-08-22 00:00:00', 'ECR-2026-ULWUW2', 'Facture FACT-2026-Y19IPU — Mensualité — Septembre — BEP Restauration', 'App\\Models\\Invoice', 27, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(21, 4, '2026-08-12 00:00:00', 'ECR-2026-UYHFXH', 'Encaissement REC-2026-OVFUWW', 'App\\Models\\Payment', 1, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(22, 4, '2026-08-09 00:00:00', 'ECR-2026-LLDRRR', 'Encaissement REC-2026-WFCSYK', 'App\\Models\\Payment', 2, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(23, 4, '2026-08-23 00:00:00', 'ECR-2026-8FURTK', 'Encaissement REC-2026-AVRPNO', 'App\\Models\\Payment', 5, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(24, 4, '2026-08-23 00:00:00', 'ECR-2026-IHEORD', 'Encaissement REC-2026-L3ELLF', 'App\\Models\\Payment', 6, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(25, 4, '2026-08-23 00:00:00', 'ECR-2026-CXMPCI', 'Encaissement REC-2026-LF4TNJ', 'App\\Models\\Payment', 7, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(26, 3, '2026-08-17 00:00:00', 'ECR-2026-QGVQMP', 'Dépense — Salaires du personnel — mois en cours', 'App\\Models\\Expense', 1, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(27, 4, '2026-08-10 00:00:00', 'ECR-2026-XNRIFS', 'Dépense — Achat denrées alimentaires', 'App\\Models\\Expense', 2, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(28, 4, '2026-08-02 00:00:00', 'ECR-2026-IFUQSG', 'Dépense — Entretien matériel de cuisine', 'App\\Models\\Expense', 3, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(29, 3, '2026-07-28 00:00:00', 'ECR-2026-ICOJEX', 'Dépense — Transport élèves — sortie pédagogique', 'App\\Models\\Expense', 4, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(30, 3, '2026-08-23 00:00:00', 'ECR-2026-9OSBEN', 'Dépense — Salaire — Janvier 2026 — Directrice EEHT', 'App\\Models\\Expense', 6, 1, NULL, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(32, 3, '2026-08-23 00:00:00', 'ECR-2026-YCZD48', 'Dépense — Salaire — Mai 2026 — Directrice EEHT', 'App\\Models\\Expense', 16, 1, NULL, '2026-08-23 14:47:50', '2026-08-23 14:47:50'),
(33, 3, '2026-08-23 00:00:00', 'ECR-2026-EZZDJL', 'Dépense — Salaire — Avril 2026 — Babacar NDIAYE', 'App\\Models\\Expense', 17, 1, NULL, '2026-08-23 15:05:44', '2026-08-23 15:05:44'),
(34, 3, '2026-08-23 00:00:00', 'ECR-2026-IKD9S1', 'Encaissement REC-2026-OTTUUV', 'App\\Models\\Payment', 9, 1, NULL, '2026-08-23 18:27:21', '2026-08-23 18:27:21');

-- Table: journal_entry_lines (56 ligne(s))
DELETE FROM `journal_entry_lines`;
INSERT INTO `journal_entry_lines` (`id`, `journal_entry_id`, `account_id`, `label`, `debit`, `credit`, `created_at`, `updated_at`) VALUES
(23, 12, 8, 'Facture FACT-2026-LTKKPR — Frais de scolarité — 2026/2027', 750000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(24, 12, 27, 'Facture FACT-2026-LTKKPR — Frais de scolarité — 2026/2027', 0, 750000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(25, 13, 8, 'Facture FACT-2026-JNV8UZ — Frais de scolarité — 2026/2027', 750000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(26, 13, 27, 'Facture FACT-2026-JNV8UZ — Frais de scolarité — 2026/2027', 0, 750000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(27, 14, 8, 'Facture FACT-2026-JULCB7 — Frais de scolarité — 2026/2027', 750000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(28, 14, 27, 'Facture FACT-2026-JULCB7 — Frais de scolarité — 2026/2027', 0, 750000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(29, 15, 8, 'Facture FACT-2026-VPDAXE — Frais de scolarité — 2026/2027', 750000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(30, 15, 27, 'Facture FACT-2026-VPDAXE — Frais de scolarité — 2026/2027', 0, 750000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(31, 16, 8, 'Facture FACT-2026-BRMYOR — Mensualité — Septembre — BEP Restauration', 35000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(32, 16, 27, 'Facture FACT-2026-BRMYOR — Mensualité — Septembre — BEP Restauration', 0, 35000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(33, 17, 8, 'Facture FACT-2026-FS1PFM — Mensualité — Septembre — BEP Restauration', 35000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(34, 17, 27, 'Facture FACT-2026-FS1PFM — Mensualité — Septembre — BEP Restauration', 0, 35000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(35, 18, 8, 'Facture FACT-2026-FRBUDV — Mensualité — Septembre — BEP Restauration', 35000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(36, 18, 27, 'Facture FACT-2026-FRBUDV — Mensualité — Septembre — BEP Restauration', 0, 35000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(37, 19, 8, 'Facture FACT-2026-9SATUA — Mensualité — Septembre — BEP Restauration', 35000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(38, 19, 27, 'Facture FACT-2026-9SATUA — Mensualité — Septembre — BEP Restauration', 0, 35000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(39, 20, 8, 'Facture FACT-2026-Y19IPU — Mensualité — Septembre — BEP Restauration', 35000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(40, 20, 27, 'Facture FACT-2026-Y19IPU — Mensualité — Septembre — BEP Restauration', 0, 35000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(41, 21, 14, 'Encaissement REC-2026-OVFUWW', 750000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(42, 21, 8, 'Encaissement REC-2026-OVFUWW', 0, 750000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(43, 22, 14, 'Encaissement REC-2026-WFCSYK', 300000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(44, 22, 8, 'Encaissement REC-2026-WFCSYK', 0, 300000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(45, 23, 14, 'Encaissement REC-2026-AVRPNO', 35000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(46, 23, 8, 'Encaissement REC-2026-AVRPNO', 0, 35000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(47, 24, 14, 'Encaissement REC-2026-L3ELLF', 35000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(48, 24, 8, 'Encaissement REC-2026-L3ELLF', 0, 35000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(49, 25, 14, 'Encaissement REC-2026-LF4TNJ', 35000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(50, 25, 8, 'Encaissement REC-2026-LF4TNJ', 0, 35000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(51, 26, 23, 'Dépense — Salaires du personnel — mois en cours', 3500000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(52, 26, 13, 'Dépense — Salaires du personnel — mois en cours', 0, 3500000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(53, 27, 15, 'Dépense — Achat denrées alimentaires', 250000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(54, 27, 14, 'Dépense — Achat denrées alimentaires', 0, 250000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(55, 28, 17, 'Dépense — Entretien matériel de cuisine', 85000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(56, 28, 14, 'Dépense — Entretien matériel de cuisine', 0, 85000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(57, 29, 20, 'Dépense — Transport élèves — sortie pédagogique', 120000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(58, 29, 13, 'Dépense — Transport élèves — sortie pédagogique', 0, 120000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(59, 30, 23, 'Dépense — Salaire — Janvier 2026 — Directrice EEHT', 500000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(60, 30, 13, 'Dépense — Salaire — Janvier 2026 — Directrice EEHT', 0, 500000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(61, 6, 23, 'Dépense — Salaire — Mars 2026 — Directrice EEHT', 500000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(62, 6, 13, 'Dépense — Salaire — Mars 2026 — Directrice EEHT', 0, 500000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(63, 7, 23, 'Dépense — Salaire — Mars 2026 — Babacar NDIAYE', 60000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(64, 7, 13, 'Dépense — Salaire — Mars 2026 — Babacar NDIAYE', 0, 60000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(65, 8, 23, 'Dépense — Salaire — Février 2026 — Babacar NDIAYE', 60000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(66, 8, 13, 'Dépense — Salaire — Février 2026 — Babacar NDIAYE', 0, 60000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(67, 9, 23, 'Dépense — Salaire — Janvier 2026 — Babacar NDIAYE', 60000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(68, 9, 13, 'Dépense — Salaire — Janvier 2026 — Babacar NDIAYE', 0, 60000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(69, 10, 23, 'Dépense — Salaire — Juin 2026 — Directrice EEHT', 500000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(70, 10, 13, 'Dépense — Salaire — Juin 2026 — Directrice EEHT', 0, 500000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(71, 11, 23, 'Dépense — Salaire — Juin 2026 — Babacar NDIAYE', 60000, 0, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(72, 11, 13, 'Dépense — Salaire — Juin 2026 — Babacar NDIAYE', 0, 60000, '2026-08-23 14:40:36', '2026-08-23 14:40:36'),
(75, 32, 23, 'Dépense — Salaire — Mai 2026 — Directrice EEHT', 500000, 0, '2026-08-23 14:47:50', '2026-08-23 14:47:50'),
(76, 32, 13, 'Dépense — Salaire — Mai 2026 — Directrice EEHT', 0, 500000, '2026-08-23 14:47:50', '2026-08-23 14:47:50'),
(77, 33, 23, 'Dépense — Salaire — Avril 2026 — Babacar NDIAYE', 60000, 0, '2026-08-23 15:05:44', '2026-08-23 15:05:44'),
(78, 33, 13, 'Dépense — Salaire — Avril 2026 — Babacar NDIAYE', 0, 60000, '2026-08-23 15:05:44', '2026-08-23 15:05:44'),
(79, 34, 13, 'Encaissement REC-2026-OTTUUV', 35000, 0, '2026-08-23 18:27:21', '2026-08-23 18:27:21'),
(80, 34, 8, 'Encaissement REC-2026-OTTUUV', 0, 35000, '2026-08-23 18:27:21', '2026-08-23 18:27:21');

-- Table: journals (5 ligne(s))
DELETE FROM `journals`;
INSERT INTO `journals` (`id`, `code`, `name`, `created_at`, `updated_at`) VALUES
(1, 'VTE', 'Journal des ventes', '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(2, 'AC', 'Journal des achats', '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(3, 'BQ', 'Journal de banque', '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(4, 'CAI', 'Journal de caisse', '2026-08-23 14:29:25', '2026-08-23 14:29:25'),
(5, 'OD', 'Journal des opérations diverses', '2026-08-23 14:29:25', '2026-08-23 14:29:25');

-- Table: model_has_roles (30 ligne(s))
DELETE FROM `model_has_roles`;
INSERT INTO `model_has_roles` (`role_id`, `model_type`, `model_id`) VALUES
(11, 'App\\Models\\User', 3),
(11, 'App\\Models\\User', 2),
(12, 'App\\Models\\User', 5),
(10, 'App\\Models\\User', 4),
(10, 'App\\Models\\User', 7),
(10, 'App\\Models\\User', 8),
(11, 'App\\Models\\User', 6),
(1, 'App\\Models\\User', 9),
(2, 'App\\Models\\User', 9),
(1, 'App\\Models\\User', 11),
(1, 'App\\Models\\User', 10),
(5, 'App\\Models\\User', 10),
(11, 'App\\Models\\User', 12),
(11, 'App\\Models\\User', 14),
(1, 'App\\Models\\User', 1),
(1, 'App\\Models\\User', 15),
(1, 'App\\Models\\User', 16),
(11, 'App\\Models\\User', 17),
(4, 'App\\Models\\User', 18),
(1, 'App\\Models\\User', 19),
(1, 'App\\Models\\User', 20),
(1, 'App\\Models\\User', 33),
(1, 'App\\Models\\User', 34),
(5, 'App\\Models\\User', 35),
(4, 'App\\Models\\User', 13),
(1, 'App\\Models\\User', 36),
(1, 'App\\Models\\User', 39),
(5, 'App\\Models\\User', 40),
(1, 'App\\Models\\User', 41),
(11, 'App\\Models\\User', 43);

-- Table: news_article_photos (4 ligne(s))
DELETE FROM `news_article_photos`;
INSERT INTO `news_article_photos` (`id`, `news_article_id`, `path`, `caption`, `order`, `created_at`, `updated_at`) VALUES
(3, 3, 'news/yF4i8LiCn13jMTq8hkQcGKD8bPkilFYwTci8uwmY.jpg', NULL, 1, '2026-08-22 18:30:31', '2026-08-22 18:30:31'),
(4, 3, 'news/bHGd8lK8ToFjFSO8oqe6J1K05xeV0EGZjTsEz4NT.jpg', NULL, 2, '2026-08-22 18:30:31', '2026-08-22 18:30:31'),
(5, 3, 'news/YuZQbKcGqgXQQXhxdAWRxep2cT5szoTEfFWw0Xyo.jpg', NULL, 3, '2026-08-22 18:30:31', '2026-08-22 18:30:31'),
(6, 3, 'news/TNzTsCBolCAfzX8NqJ7eazd8dweYr1CpxMRu8vOB.jpg', NULL, 4, '2026-08-22 18:30:31', '2026-08-22 18:30:31');

-- Table: news_articles (6 ligne(s))
DELETE FROM `news_articles`;
INSERT INTO `news_articles` (`id`, `title`, `slug`, `excerpt`, `content`, `image`, `category`, `source`, `facebook_post_url`, `is_published`, `is_featured`, `published_at`, `author_id`, `created_at`, `updated_at`) VALUES
(1, 'Journée portes ouvertes 2026 : l\'EEHT ouvre ses portes', 'journee-portes-ouvertes-2026-leeht-ouvre-ses-portes-rtKnA', 'L\'EEHT de Thiès a accueilli de nombreux visiteurs pour découvrir ses infrastructures et ses formations.', 'L\'Elite École Hôtelière et Touristique de Thiès a organisé sa traditionnelle journée portes ouvertes, permettant aux futurs candidats et à leurs familles de découvrir les ateliers de cuisine, les salles de restaurant d\'application et de rencontrer l\'équipe pédagogique.', 'news/WohSCROLWMKo9Clo8AaHH2jc1Q8Dw8rGBM74nbLf.jpg', 'Événement', 'manuel', NULL, 1, 1, '2026-08-17 14:52:00', NULL, '2026-08-22 14:52:57', '2026-08-22 18:25:10'),
(2, 'Ouverture des candidatures pour la rentrée 2026-2027', 'ouverture-des-candidatures-pour-la-rentree-2026-2027-yNxSG', 'Les inscriptions sont désormais ouvertes pour toutes nos formations CAP, BTS et DTS.', 'L\'EEHT de Thiès annonce l\'ouverture des candidatures en ligne pour la rentrée académique 2026-2027. Les candidats peuvent déposer leur dossier directement depuis l\'espace candidat du site.', 'news/5AvYFztIO0D3dmq1k3DwSxCGfcupzu0aWdEsbqML.jpg', 'Admission', 'manuel', NULL, 1, 1, '2026-08-20 14:52:00', NULL, '2026-08-22 14:52:57', '2026-08-22 18:26:15'),
(3, 'Journée culinaire : nos étudiants en cuisine à l\'honneur', 'journee-culinaire-nos-etudiants-en-cuisine-a-lhonneur-1cWs5', 'Les étudiants en Cuisine ont mis leur savoir-faire à l\'épreuve lors d\'une journée de démonstration culinaire ouverte aux familles et partenaires de l\'école.', 'Le temps d\'une journée, les ateliers de cuisine de l\'EEHT de Thiès se sont transformés en véritable vitrine du talent de nos étudiants. Encadrés par leurs enseignants, les apprenants en CAP et BEP Restauration ont préparé et présenté des plats mêlant cuisine sénégalaise traditionnelle et techniques internationales.

Cet exercice, organisé dans le cadre de la formation pratique, permet aux étudiants de travailler dans des conditions proches de celles d\'un véritable service : gestion du temps, dressage, présentation et sens de l\'accueil.

Parents, partenaires professionnels et anciens élèves ont pu goûter aux réalisations du jour et échanger avec les étudiants sur leur parcours. Une belle occasion de mettre en lumière l\'exigence et la passion qui animent nos ateliers pédagogiques au quotidien.', 'news/TDrSRlcjQ9E3e4BfGlH4IFKcZ9bVf5VTEODqnLTz.jpg', 'Vie étudiante', 'manuel', NULL, 1, 0, '2026-08-05 10:00:00', 1, '2026-08-22 18:19:43', '2026-08-22 18:23:16'),
(4, 'Nos étudiants en stage dans les meilleurs établissements de la région', 'nos-etudiants-en-stage-dans-les-meilleurs-etablissements-de-la-region-TBYuW', 'Plusieurs promotions de l\'EEHT ont rejoint cet été des hôtels, restaurants et agences de voyage partenaires pour leur stage professionnel.', 'La formation professionnalisante de l\'EEHT de Thiès accorde une place centrale aux stages en entreprise. Cette année encore, nos étudiants en BTS Tourisme, BT Restauration et BEP Réceptionniste ont intégré des structures hôtelières et touristiques partenaires pour mettre en pratique les compétences acquises en classe et en atelier.

Ces immersions professionnelles permettent aux étudiants de découvrir les réalités du terrain, de développer leur autonomie et de nouer des contacts précieux pour leur future carrière. Plusieurs d\'entre eux ont déjà reçu des propositions d\'embauche à l\'issue de leur stage.

L\'EEHT tient à remercier l\'ensemble de ses partenaires professionnels pour leur confiance renouvelée et leur accompagnement dans la formation de la relève du secteur hôtelier et touristique sénégalais.', 'news/cHSbNhqBdoNzFMRlHriTy0fpgdXB8JxJgrICIK8n.jpg', 'Insertion professionnelle', 'manuel', NULL, 1, 0, '2026-07-22 09:30:00', 1, '2026-08-22 18:19:43', '2026-08-22 18:23:33'),
(5, 'Remise des diplômes : une nouvelle promotion sort de l\'EEHT', 'remise-des-diplomes-une-nouvelle-promotion-sort-de-leeht-1B2S4', 'L\'école a célébré la réussite de ses diplômés en CAP, BEP, BT, BTS et DTS lors d\'une cérémonie de remise de diplômes.', 'C\'est avec fierté que l\'EEHT de Thiès a organisé la cérémonie de remise des diplômes de sa dernière promotion. Étudiants, familles, enseignants et partenaires se sont réunis pour célébrer l\'aboutissement de plusieurs années d\'efforts et d\'apprentissage.

Au programme : discours de la direction, témoignages d\'anciens élèves aujourd\'hui en poste dans de grands établissements, et remise officielle des diplômes à chaque lauréat. Un moment fort qui marque le passage du statut d\'étudiant à celui de professionnel, prêt à intégrer le monde du travail ou à poursuivre des études supérieures.

L\'EEHT félicite chaleureusement l\'ensemble de ses diplômés et leur souhaite pleine réussite dans la suite de leur parcours, convaincue qu\'ils porteront haut les valeurs d\'excellence et de rigueur transmises tout au long de leur formation.', 'news/tIaWYzeyD6xQ6LizUCB1AJyyLGOVhZWUULLmlEkm.jpg', 'Distinction', 'manuel', NULL, 1, 0, '2026-07-10 15:00:00', 1, '2026-08-22 18:19:43', '2026-08-22 18:21:33'),
(6, 'Initiation à l\'œnologie et au service des vins pour nos étudiants en BT Restauration', 'initiation-a-loenologie-et-au-service-des-vins-pour-nos-etudiants-en-bt-restauration-DZmCJ', 'Un module spécialisé a permis aux étudiants de découvrir les techniques de service des boissons et les bases de l\'œnologie.', 'Dans le cadre de leur formation professionnelle, les étudiants en BT Restauration ont bénéficié d\'un module dédié à l\'œnologie et au service des vins, une compétence essentielle pour évoluer dans les métiers de la restauration haut de gamme et de l\'hôtellerie.

Au programme : reconnaissance des cépages, techniques de dégustation, accords mets-vins et protocole de service en salle. Cet enseignement, dispensé par des professionnels du secteur, complète la formation technique et théorique déjà acquise en cuisine et en service.

Ce type de module illustre la volonté de l\'EEHT de Thiès de proposer une formation complète et actualisée, en phase avec les standards des métiers de la restauration et de l\'hôtellerie de qualité.', 'news/0ORltTCiDSegeFeMtEq5IOAfjkD7U2Ncyqa5pEkb.jpg', 'Pédagogie', 'manuel', NULL, 1, 0, '2026-06-18 11:00:00', 1, '2026-08-22 18:19:43', '2026-08-22 18:23:44');

-- Table: partners (3 ligne(s))
DELETE FROM `partners`;
INSERT INTO `partners` (`id`, `name`, `logo`, `type`, `description`, `website`, `contact_name`, `contact_email`, `contact_phone`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 'Radisson Blu Dakar', NULL, 'Hôtel', 'Partenaire pour les stages pratiques et l\'insertion professionnelle.', NULL, NULL, NULL, NULL, 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(2, 'Pullman Dakar Teranga', NULL, 'Hôtel', 'Accueil d\'élèves en stage et recrutement d\'anciens diplômés.', NULL, NULL, NULL, NULL, 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(3, 'Office National du Tourisme du Sénégal', NULL, 'Institution', 'Partenariat institutionnel pour la promotion du tourisme.', NULL, NULL, NULL, NULL, 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57');

-- Table: payments (6 ligne(s))
DELETE FROM `payments`;
INSERT INTO `payments` (`id`, `receipt_number`, `invoice_id`, `amount`, `method`, `reference`, `paid_at`, `notes`, `received_by`, `created_at`, `updated_at`) VALUES
(1, 'REC-2026-OVFUWW', 1, 750000, 'especes', NULL, '2026-08-12 14:52:58', NULL, NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 'REC-2026-WFCSYK', 2, 300000, 'especes', NULL, '2026-08-09 14:52:58', NULL, NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(5, 'REC-2026-AVRPNO', 27, 35000, 'especes', NULL, '2026-08-23 00:00:00', NULL, 1, '2026-08-23 08:28:41', '2026-08-23 08:28:41'),
(6, 'REC-2026-L3ELLF', 24, 35000, 'especes', NULL, '2026-08-23 00:00:00', NULL, 1, '2026-08-23 08:29:35', '2026-08-23 08:29:35'),
(7, 'REC-2026-LF4TNJ', 23, 35000, 'especes', NULL, '2026-08-23 00:00:00', NULL, 1, '2026-08-23 09:47:23', '2026-08-23 09:47:23'),
(9, 'REC-2026-OTTUUV', 26, 35000, 'mobile_money', NULL, '2026-08-23 00:00:00', NULL, 1, '2026-08-23 18:27:21', '2026-08-23 18:27:21');

-- Table: permissions (180 ligne(s))
DELETE FROM `permissions`;
INSERT INTO `permissions` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
(1, 'voir_formations', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(2, 'ajouter_formations', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(3, 'modifier_formations', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(4, 'supprimer_formations', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(5, 'valider_formations', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(6, 'exporter_formations', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(7, 'voir_candidatures', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(8, 'ajouter_candidatures', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(9, 'modifier_candidatures', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(10, 'supprimer_candidatures', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(11, 'valider_candidatures', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(12, 'exporter_candidatures', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(13, 'voir_eleves', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(14, 'ajouter_eleves', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(15, 'modifier_eleves', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(16, 'supprimer_eleves', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(17, 'valider_eleves', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(18, 'exporter_eleves', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(19, 'voir_enseignants', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(20, 'ajouter_enseignants', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(21, 'modifier_enseignants', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(22, 'supprimer_enseignants', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(23, 'valider_enseignants', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(24, 'exporter_enseignants', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(25, 'voir_classes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(26, 'ajouter_classes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(27, 'modifier_classes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(28, 'supprimer_classes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(29, 'valider_classes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(30, 'exporter_classes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(31, 'voir_matieres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(32, 'ajouter_matieres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(33, 'modifier_matieres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(34, 'supprimer_matieres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(35, 'valider_matieres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(36, 'exporter_matieres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(37, 'voir_emploi_du_temps', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(38, 'ajouter_emploi_du_temps', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(39, 'modifier_emploi_du_temps', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(40, 'supprimer_emploi_du_temps', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(41, 'valider_emploi_du_temps', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(42, 'exporter_emploi_du_temps', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(43, 'voir_presences', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(44, 'ajouter_presences', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(45, 'modifier_presences', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(46, 'supprimer_presences', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(47, 'valider_presences', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(48, 'exporter_presences', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(49, 'voir_examens', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(50, 'ajouter_examens', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(51, 'modifier_examens', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(52, 'supprimer_examens', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(53, 'valider_examens', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(54, 'exporter_examens', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(55, 'voir_notes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(56, 'ajouter_notes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(57, 'modifier_notes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(58, 'supprimer_notes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(59, 'valider_notes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(60, 'exporter_notes', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(61, 'voir_bulletins', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(62, 'ajouter_bulletins', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(63, 'modifier_bulletins', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(64, 'supprimer_bulletins', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(65, 'valider_bulletins', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(66, 'exporter_bulletins', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(67, 'voir_salles', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(68, 'ajouter_salles', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(69, 'modifier_salles', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(70, 'supprimer_salles', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(71, 'valider_salles', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(72, 'exporter_salles', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(73, 'voir_comptabilite', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(74, 'ajouter_comptabilite', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(75, 'modifier_comptabilite', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(76, 'supprimer_comptabilite', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(77, 'valider_comptabilite', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(78, 'exporter_comptabilite', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(79, 'voir_stocks', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(80, 'ajouter_stocks', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(81, 'modifier_stocks', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(82, 'supprimer_stocks', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(83, 'valider_stocks', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(84, 'exporter_stocks', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(85, 'voir_communication', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(86, 'ajouter_communication', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(87, 'modifier_communication', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(88, 'supprimer_communication', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(89, 'valider_communication', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(90, 'exporter_communication', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(91, 'voir_actualites', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(92, 'ajouter_actualites', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(93, 'modifier_actualites', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(94, 'supprimer_actualites', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(95, 'valider_actualites', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(96, 'exporter_actualites', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(97, 'voir_evenements', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(98, 'ajouter_evenements', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(99, 'modifier_evenements', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(100, 'supprimer_evenements', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(101, 'valider_evenements', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(102, 'exporter_evenements', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(103, 'voir_galerie', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(104, 'ajouter_galerie', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(105, 'modifier_galerie', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(106, 'supprimer_galerie', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(107, 'valider_galerie', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(108, 'exporter_galerie', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(109, 'voir_partenaires', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(110, 'ajouter_partenaires', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(111, 'modifier_partenaires', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(112, 'supprimer_partenaires', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(113, 'valider_partenaires', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(114, 'exporter_partenaires', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(115, 'voir_temoignages', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(116, 'ajouter_temoignages', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(117, 'modifier_temoignages', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(118, 'supprimer_temoignages', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(119, 'valider_temoignages', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(120, 'exporter_temoignages', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(121, 'voir_faq', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(122, 'ajouter_faq', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(123, 'modifier_faq', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(124, 'supprimer_faq', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(125, 'valider_faq', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(126, 'exporter_faq', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(127, 'voir_statistiques', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(128, 'ajouter_statistiques', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(129, 'modifier_statistiques', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(130, 'supprimer_statistiques', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(131, 'valider_statistiques', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(132, 'exporter_statistiques', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(133, 'voir_utilisateurs', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(134, 'ajouter_utilisateurs', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(135, 'modifier_utilisateurs', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(136, 'supprimer_utilisateurs', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(137, 'valider_utilisateurs', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(138, 'exporter_utilisateurs', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(139, 'voir_parametres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(140, 'ajouter_parametres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(141, 'modifier_parametres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(142, 'supprimer_parametres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(143, 'valider_parametres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(144, 'exporter_parametres', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(145, 'voir_insertion', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(146, 'ajouter_insertion', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(147, 'modifier_insertion', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(148, 'supprimer_insertion', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(149, 'valider_insertion', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(150, 'exporter_insertion', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(151, 'voir_organigramme', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(152, 'ajouter_organigramme', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(153, 'modifier_organigramme', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(154, 'supprimer_organigramme', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(155, 'valider_organigramme', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(156, 'exporter_organigramme', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(157, 'voir_roles', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(158, 'ajouter_roles', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(159, 'modifier_roles', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(160, 'supprimer_roles', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(161, 'valider_roles', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(162, 'exporter_roles', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(163, 'voir_salaires', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(164, 'ajouter_salaires', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(165, 'modifier_salaires', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(166, 'supprimer_salaires', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(167, 'valider_salaires', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(168, 'exporter_salaires', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(169, 'voir_sauvegardes', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(170, 'ajouter_sauvegardes', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(171, 'modifier_sauvegardes', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(172, 'supprimer_sauvegardes', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(173, 'valider_sauvegardes', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(174, 'exporter_sauvegardes', 'web', '2026-08-23 19:55:23', '2026-08-23 19:55:23'),
(175, 'voir_activite', 'web', '2026-08-23 20:57:05', '2026-08-23 20:57:05'),
(176, 'ajouter_activite', 'web', '2026-08-23 20:57:05', '2026-08-23 20:57:05'),
(177, 'modifier_activite', 'web', '2026-08-23 20:57:05', '2026-08-23 20:57:05'),
(178, 'supprimer_activite', 'web', '2026-08-23 20:57:05', '2026-08-23 20:57:05'),
(179, 'valider_activite', 'web', '2026-08-23 20:57:05', '2026-08-23 20:57:05'),
(180, 'exporter_activite', 'web', '2026-08-23 20:57:05', '2026-08-23 20:57:05');

-- Table: products (6 ligne(s))
DELETE FROM `products`;
INSERT INTO `products` (`id`, `name`, `category`, `unit`, `unit_cost`, `quantity_in_stock`, `min_threshold`, `supplier_id`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Farine de blé', 'alimentaire', 'kg', 450, 80, 20, 1, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 'Huile de tournesol', 'alimentaire', 'litre', 1200, 15, 20, 1, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(3, 'Riz parfumé', 'alimentaire', 'kg', 600, 100, 25, 1, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(4, 'Produit dégraissant', 'entretien', 'litre', 2500, 8, 10, NULL, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(5, 'Assiettes de service', 'materiel_restauration', 'pièce', 1500, 60, 15, 2, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(6, 'Toques de cuisine', 'uniformes', 'pièce', 3500, 25, 10, 2, 1, '2026-08-22 14:52:58', '2026-08-22 14:52:58');

-- Table: report_cards (5 ligne(s))
DELETE FROM `report_cards`;
INSERT INTO `report_cards` (`id`, `student_id`, `school_class_id`, `academic_year_id`, `term`, `average`, `rank`, `class_size`, `general_appreciation`, `qr_token`, `is_published`, `generated_at`, `created_at`, `updated_at`, `decision`, `mention`, `class_average`, `previous_term_average`, `annual_average`, `annual_rank`, `retard_count`, `absence_count`, `unjustified_absence_count`) VALUES
(6, 1, 2, 1, 'Semestre 1', NULL, NULL, 5, NULL, 'naKu16dhoTMvVkRSNl3Jh34y', 0, '2026-08-22 21:34:58', '2026-08-22 21:34:58', '2026-08-22 21:34:58', 'non_defini', NULL, NULL, NULL, NULL, NULL, 0, 0, 0),
(7, 3, 2, 1, 'Semestre 1', NULL, NULL, 5, NULL, 'fcOgfl4FjMEohv4TW2HPfOza', 0, '2026-08-22 21:34:58', '2026-08-22 21:34:58', '2026-08-22 21:34:58', 'non_defini', NULL, NULL, NULL, NULL, NULL, 0, 0, 0),
(8, 4, 2, 1, 'Semestre 1', NULL, NULL, 5, NULL, '9ATp50NBvNrESkzGo1ZexecO', 0, '2026-08-22 21:34:58', '2026-08-22 21:34:58', '2026-08-22 21:34:58', 'non_defini', NULL, NULL, NULL, NULL, NULL, 0, 0, 0),
(9, 5, 2, 1, 'Semestre 1', NULL, NULL, 5, NULL, 'spl16mBZiscRosEMj1G79sV8', 0, '2026-08-22 21:34:58', '2026-08-22 21:34:58', '2026-08-22 21:34:58', 'non_defini', NULL, NULL, NULL, NULL, NULL, 0, 0, 0),
(10, 6, 2, 1, 'Semestre 1', NULL, NULL, 5, NULL, '5O2j98VqUCeTl4dYSpxwk1C9', 0, '2026-08-22 21:34:58', '2026-08-22 21:34:58', '2026-08-22 21:34:58', 'non_defini', NULL, NULL, NULL, NULL, NULL, 0, 0, 0);

-- Table: role_has_permissions (1026 ligne(s))
DELETE FROM `role_has_permissions`;
INSERT INTO `role_has_permissions` (`permission_id`, `role_id`) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(6, 1),
(7, 1),
(8, 1),
(9, 1),
(10, 1),
(11, 1),
(12, 1),
(13, 1),
(14, 1),
(15, 1),
(16, 1),
(17, 1),
(18, 1),
(19, 1),
(20, 1),
(21, 1),
(22, 1),
(23, 1),
(24, 1),
(25, 1),
(26, 1),
(27, 1),
(28, 1),
(29, 1),
(30, 1),
(31, 1),
(32, 1),
(33, 1),
(34, 1),
(35, 1),
(36, 1),
(37, 1),
(38, 1),
(39, 1),
(40, 1),
(41, 1),
(42, 1),
(43, 1),
(44, 1),
(45, 1),
(46, 1),
(47, 1),
(48, 1),
(49, 1),
(50, 1),
(51, 1),
(52, 1),
(53, 1),
(54, 1),
(55, 1),
(56, 1),
(57, 1),
(58, 1),
(59, 1),
(60, 1),
(61, 1),
(62, 1),
(63, 1),
(64, 1),
(65, 1),
(66, 1),
(67, 1),
(68, 1),
(69, 1),
(70, 1),
(71, 1),
(72, 1),
(73, 1),
(74, 1),
(75, 1),
(76, 1),
(77, 1),
(78, 1),
(79, 1),
(80, 1),
(81, 1),
(82, 1),
(83, 1),
(84, 1),
(85, 1),
(86, 1),
(87, 1),
(88, 1),
(89, 1),
(90, 1),
(91, 1),
(92, 1),
(93, 1),
(94, 1),
(95, 1),
(96, 1),
(97, 1),
(98, 1),
(99, 1),
(100, 1),
(101, 1),
(102, 1),
(103, 1),
(104, 1),
(105, 1),
(106, 1),
(107, 1),
(108, 1),
(109, 1),
(110, 1),
(111, 1),
(112, 1),
(113, 1),
(114, 1),
(115, 1),
(116, 1),
(117, 1),
(118, 1),
(119, 1),
(120, 1),
(121, 1),
(122, 1),
(123, 1),
(124, 1),
(125, 1),
(126, 1),
(127, 1),
(128, 1),
(129, 1),
(130, 1),
(131, 1),
(132, 1),
(133, 1),
(134, 1),
(135, 1),
(136, 1),
(137, 1),
(138, 1),
(139, 1),
(140, 1),
(141, 1),
(142, 1),
(143, 1),
(144, 1),
(145, 1),
(146, 1),
(147, 1),
(148, 1),
(149, 1),
(150, 1),
(151, 1),
(152, 1),
(153, 1),
(154, 1),
(155, 1),
(156, 1),
(157, 1),
(158, 1),
(159, 1),
(160, 1),
(161, 1),
(162, 1),
(163, 1),
(164, 1),
(165, 1),
(166, 1),
(167, 1),
(168, 1),
(169, 1),
(170, 1),
(171, 1),
(172, 1),
(173, 1),
(174, 1),
(175, 1),
(176, 1),
(177, 1),
(178, 1),
(179, 1),
(180, 1),
(1, 2),
(2, 2),
(3, 2),
(4, 2),
(5, 2),
(6, 2),
(7, 2),
(8, 2),
(9, 2),
(10, 2),
(11, 2),
(12, 2),
(13, 2),
(14, 2),
(15, 2),
(16, 2),
(17, 2),
(18, 2),
(19, 2),
(20, 2);
INSERT INTO `role_has_permissions` (`permission_id`, `role_id`) VALUES
(21, 2),
(22, 2),
(23, 2),
(24, 2),
(25, 2),
(26, 2),
(27, 2),
(28, 2),
(29, 2),
(30, 2),
(31, 2),
(32, 2),
(33, 2),
(34, 2),
(35, 2),
(36, 2),
(37, 2),
(38, 2),
(39, 2),
(40, 2),
(41, 2),
(42, 2),
(43, 2),
(44, 2),
(45, 2),
(46, 2),
(47, 2),
(48, 2),
(49, 2),
(50, 2),
(51, 2),
(52, 2),
(53, 2),
(54, 2),
(55, 2),
(56, 2),
(57, 2),
(58, 2),
(59, 2),
(60, 2),
(61, 2),
(62, 2),
(63, 2),
(64, 2),
(65, 2),
(66, 2),
(67, 2),
(68, 2),
(69, 2),
(70, 2),
(71, 2),
(72, 2),
(73, 2),
(74, 2),
(75, 2),
(76, 2),
(77, 2),
(78, 2),
(79, 2),
(80, 2),
(81, 2),
(82, 2),
(83, 2),
(84, 2),
(85, 2),
(86, 2),
(87, 2),
(88, 2),
(89, 2),
(90, 2),
(91, 2),
(92, 2),
(93, 2),
(94, 2),
(95, 2),
(96, 2),
(97, 2),
(98, 2),
(99, 2),
(100, 2),
(101, 2),
(102, 2),
(103, 2),
(104, 2),
(105, 2),
(106, 2),
(107, 2),
(108, 2),
(109, 2),
(110, 2),
(111, 2),
(112, 2),
(113, 2),
(114, 2),
(115, 2),
(116, 2),
(117, 2),
(118, 2),
(119, 2),
(120, 2),
(121, 2),
(122, 2),
(123, 2),
(124, 2),
(125, 2),
(126, 2),
(127, 2),
(128, 2),
(129, 2),
(130, 2),
(131, 2),
(132, 2),
(133, 2),
(134, 2),
(135, 2),
(136, 2),
(137, 2),
(138, 2),
(139, 2),
(140, 2),
(141, 2),
(142, 2),
(143, 2),
(144, 2),
(145, 2),
(146, 2),
(147, 2),
(148, 2),
(149, 2),
(150, 2),
(151, 2),
(152, 2),
(153, 2),
(154, 2),
(155, 2),
(156, 2),
(157, 2),
(158, 2),
(159, 2),
(160, 2),
(161, 2),
(162, 2),
(163, 2),
(164, 2),
(165, 2),
(166, 2),
(167, 2),
(168, 2),
(169, 2),
(170, 2),
(171, 2),
(172, 2),
(173, 2),
(174, 2),
(175, 2),
(176, 2),
(177, 2),
(178, 2),
(179, 2),
(180, 2),
(1, 3),
(2, 3),
(3, 3),
(4, 3),
(5, 3),
(6, 3),
(7, 3),
(8, 3),
(9, 3),
(10, 3),
(11, 3),
(12, 3),
(13, 3),
(14, 3),
(15, 3),
(16, 3),
(17, 3),
(18, 3),
(19, 3),
(20, 3),
(21, 3),
(22, 3),
(23, 3),
(24, 3),
(25, 3),
(26, 3),
(27, 3),
(28, 3),
(29, 3),
(30, 3),
(31, 3),
(32, 3),
(33, 3),
(34, 3),
(35, 3),
(36, 3),
(37, 3),
(38, 3),
(39, 3),
(40, 3);
INSERT INTO `role_has_permissions` (`permission_id`, `role_id`) VALUES
(41, 3),
(42, 3),
(43, 3),
(44, 3),
(45, 3),
(46, 3),
(47, 3),
(48, 3),
(67, 3),
(68, 3),
(69, 3),
(70, 3),
(71, 3),
(72, 3),
(85, 3),
(86, 3),
(87, 3),
(88, 3),
(89, 3),
(90, 3),
(91, 3),
(92, 3),
(93, 3),
(94, 3),
(95, 3),
(96, 3),
(97, 3),
(98, 3),
(99, 3),
(100, 3),
(101, 3),
(102, 3),
(127, 3),
(128, 3),
(129, 3),
(130, 3),
(131, 3),
(132, 3),
(133, 3),
(134, 3),
(135, 3),
(136, 3),
(137, 3),
(138, 3),
(139, 3),
(140, 3),
(141, 3),
(142, 3),
(143, 3),
(144, 3),
(145, 3),
(146, 3),
(147, 3),
(148, 3),
(149, 3),
(150, 3),
(151, 3),
(152, 3),
(153, 3),
(154, 3),
(155, 3),
(156, 3),
(157, 3),
(158, 3),
(159, 3),
(160, 3),
(161, 3),
(162, 3),
(163, 3),
(164, 3),
(165, 3),
(166, 3),
(167, 3),
(168, 3),
(73, 5),
(74, 5),
(75, 5),
(76, 5),
(77, 5),
(78, 5),
(127, 5),
(128, 5),
(129, 5),
(130, 5),
(131, 5),
(132, 5),
(163, 5),
(164, 5),
(165, 5),
(166, 5),
(167, 5),
(168, 5),
(73, 6),
(74, 6),
(75, 6),
(76, 6),
(77, 6),
(78, 6),
(79, 7),
(80, 7),
(81, 7),
(82, 7),
(83, 7),
(84, 7),
(7, 9),
(8, 9),
(9, 9),
(10, 9),
(11, 9),
(12, 9),
(85, 9),
(86, 9),
(87, 9),
(88, 9),
(89, 9),
(90, 9),
(127, 9),
(128, 9),
(129, 9),
(130, 9),
(131, 9),
(132, 9),
(37, 10),
(38, 10),
(39, 10),
(40, 10),
(41, 10),
(42, 10),
(43, 10),
(44, 10),
(45, 10),
(46, 10),
(47, 10),
(48, 10),
(49, 10),
(50, 10),
(51, 10),
(52, 10),
(53, 10),
(54, 10),
(55, 10),
(56, 10),
(57, 10),
(58, 10),
(59, 10),
(60, 10),
(1, 11),
(2, 11),
(3, 11),
(4, 11),
(5, 11),
(6, 11),
(7, 11),
(8, 11),
(9, 11),
(10, 11),
(11, 11),
(12, 11),
(13, 11),
(14, 11),
(15, 11),
(16, 11),
(17, 11),
(18, 11),
(19, 11),
(20, 11),
(21, 11),
(22, 11),
(23, 11),
(24, 11),
(25, 11),
(26, 11),
(27, 11),
(28, 11),
(29, 11),
(30, 11),
(31, 11),
(32, 11),
(33, 11),
(34, 11),
(35, 11),
(36, 11),
(37, 11),
(38, 11),
(39, 11),
(40, 11),
(41, 11),
(42, 11),
(43, 11),
(44, 11),
(45, 11),
(46, 11),
(47, 11),
(48, 11),
(49, 11),
(50, 11),
(51, 11),
(52, 11),
(53, 11),
(54, 11);
INSERT INTO `role_has_permissions` (`permission_id`, `role_id`) VALUES
(55, 11),
(56, 11),
(57, 11),
(58, 11),
(59, 11),
(60, 11),
(61, 11),
(62, 11),
(63, 11),
(64, 11),
(65, 11),
(66, 11),
(67, 11),
(68, 11),
(69, 11),
(70, 11),
(71, 11),
(72, 11),
(73, 11),
(74, 11),
(75, 11),
(76, 11),
(77, 11),
(78, 11),
(79, 11),
(80, 11),
(81, 11),
(82, 11),
(83, 11),
(84, 11),
(85, 11),
(86, 11),
(87, 11),
(88, 11),
(89, 11),
(90, 11),
(91, 11),
(92, 11),
(93, 11),
(94, 11),
(95, 11),
(96, 11),
(97, 11),
(98, 11),
(99, 11),
(100, 11),
(101, 11),
(102, 11),
(103, 11),
(104, 11),
(105, 11),
(106, 11),
(107, 11),
(108, 11),
(109, 11),
(110, 11),
(111, 11),
(112, 11),
(113, 11),
(114, 11),
(115, 11),
(116, 11),
(117, 11),
(118, 11),
(119, 11),
(120, 11),
(121, 11),
(122, 11),
(123, 11),
(124, 11),
(125, 11),
(126, 11),
(127, 11),
(128, 11),
(129, 11),
(130, 11),
(131, 11),
(132, 11),
(133, 11),
(134, 11),
(135, 11),
(136, 11),
(137, 11),
(138, 11),
(139, 11),
(140, 11),
(141, 11),
(142, 11),
(143, 11),
(144, 11),
(145, 11),
(146, 11),
(147, 11),
(148, 11),
(149, 11),
(150, 11),
(151, 11),
(152, 11),
(153, 11),
(154, 11),
(155, 11),
(156, 11),
(157, 11),
(158, 11),
(159, 11),
(160, 11),
(161, 11),
(162, 11),
(163, 11),
(164, 11),
(165, 11),
(166, 11),
(167, 11),
(168, 11),
(169, 11),
(170, 11),
(171, 11),
(172, 11),
(173, 11),
(174, 11),
(175, 11),
(176, 11),
(177, 11),
(178, 11),
(179, 11),
(180, 11),
(1, 12),
(2, 12),
(3, 12),
(4, 12),
(5, 12),
(6, 12),
(7, 12),
(8, 12),
(9, 12),
(10, 12),
(11, 12),
(12, 12),
(13, 12),
(14, 12),
(15, 12),
(16, 12),
(17, 12),
(18, 12),
(19, 12),
(20, 12),
(21, 12),
(22, 12),
(23, 12),
(24, 12),
(25, 12),
(26, 12),
(27, 12),
(28, 12),
(29, 12),
(30, 12),
(31, 12),
(32, 12),
(33, 12),
(34, 12),
(35, 12),
(36, 12),
(37, 12),
(38, 12),
(39, 12),
(40, 12),
(41, 12),
(42, 12),
(43, 12),
(44, 12),
(45, 12),
(46, 12),
(47, 12),
(48, 12),
(49, 12),
(50, 12),
(51, 12),
(52, 12),
(53, 12),
(54, 12),
(55, 12),
(56, 12),
(57, 12),
(58, 12),
(59, 12),
(60, 12),
(61, 12),
(62, 12),
(63, 12),
(64, 12),
(65, 12),
(66, 12),
(67, 12),
(68, 12),
(69, 12),
(70, 12),
(71, 12),
(72, 12),
(73, 12),
(74, 12);
INSERT INTO `role_has_permissions` (`permission_id`, `role_id`) VALUES
(75, 12),
(76, 12),
(77, 12),
(78, 12),
(79, 12),
(80, 12),
(81, 12),
(82, 12),
(83, 12),
(84, 12),
(85, 12),
(86, 12),
(87, 12),
(88, 12),
(89, 12),
(90, 12),
(91, 12),
(92, 12),
(93, 12),
(94, 12),
(95, 12),
(96, 12),
(97, 12),
(98, 12),
(99, 12),
(100, 12),
(101, 12),
(102, 12),
(103, 12),
(104, 12),
(105, 12),
(106, 12),
(107, 12),
(108, 12),
(109, 12),
(110, 12),
(111, 12),
(112, 12),
(113, 12),
(114, 12),
(115, 12),
(116, 12),
(117, 12),
(118, 12),
(119, 12),
(120, 12),
(121, 12),
(122, 12),
(123, 12),
(124, 12),
(125, 12),
(126, 12),
(127, 12),
(128, 12),
(129, 12),
(130, 12),
(131, 12),
(132, 12),
(133, 12),
(134, 12),
(135, 12),
(136, 12),
(137, 12),
(138, 12),
(139, 12),
(140, 12),
(141, 12),
(142, 12),
(143, 12),
(144, 12),
(145, 12),
(146, 12),
(147, 12),
(148, 12),
(149, 12),
(150, 12),
(151, 12),
(152, 12),
(153, 12),
(154, 12),
(155, 12),
(156, 12),
(157, 12),
(158, 12),
(159, 12),
(160, 12),
(161, 12),
(162, 12),
(163, 12),
(164, 12),
(165, 12),
(166, 12),
(167, 12),
(168, 12),
(169, 12),
(170, 12),
(171, 12),
(172, 12),
(173, 12),
(174, 12),
(175, 12),
(176, 12),
(177, 12),
(178, 12),
(179, 12),
(180, 12),
(85, 8),
(86, 8),
(87, 8),
(88, 8),
(89, 8),
(90, 8),
(91, 8),
(92, 8),
(93, 8),
(94, 8),
(95, 8),
(96, 8),
(97, 8),
(98, 8),
(99, 8),
(100, 8),
(101, 8),
(102, 8),
(103, 8),
(104, 8),
(105, 8),
(106, 8),
(107, 8),
(108, 8),
(115, 8),
(116, 8),
(117, 8),
(118, 8),
(119, 8),
(120, 8),
(121, 8),
(122, 8),
(123, 8),
(124, 8),
(125, 8),
(126, 8),
(1, 4),
(2, 4),
(3, 4),
(4, 4),
(5, 4),
(6, 4),
(13, 4),
(14, 4),
(15, 4),
(16, 4),
(17, 4),
(18, 4),
(19, 4),
(20, 4),
(21, 4),
(22, 4),
(23, 4),
(24, 4),
(25, 4),
(26, 4),
(27, 4),
(28, 4),
(29, 4),
(30, 4),
(31, 4),
(32, 4),
(33, 4),
(34, 4),
(35, 4),
(36, 4),
(37, 4),
(38, 4),
(39, 4),
(40, 4),
(41, 4),
(42, 4),
(43, 4),
(44, 4),
(45, 4),
(46, 4),
(47, 4),
(48, 4),
(49, 4),
(50, 4),
(51, 4),
(52, 4),
(53, 4),
(54, 4),
(55, 4),
(56, 4),
(57, 4),
(58, 4),
(59, 4),
(60, 4),
(61, 4),
(62, 4),
(63, 4),
(64, 4);
INSERT INTO `role_has_permissions` (`permission_id`, `role_id`) VALUES
(65, 4),
(66, 4),
(67, 4),
(68, 4),
(69, 4),
(70, 4),
(71, 4),
(72, 4),
(145, 4),
(146, 4),
(147, 4),
(148, 4),
(149, 4),
(150, 4),
(7, 4),
(8, 4),
(9, 4),
(10, 4),
(11, 4),
(12, 4),
(85, 4),
(86, 4),
(87, 4),
(88, 4),
(89, 4),
(90, 4);

-- Table: roles (12 ligne(s))
DELETE FROM `roles`;
INSERT INTO `roles` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
(1, 'super-admin', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(2, 'direction', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(3, 'administration', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(4, 'responsable-pedagogique', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(5, 'comptable', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(6, 'caissier', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(7, 'responsable-stocks', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(8, 'responsable-communication', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(9, 'responsable-marketing', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(10, 'enseignant', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(11, 'eleve', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(12, 'parent', 'web', '2026-08-22 14:52:57', '2026-08-22 14:52:57');

-- Table: rooms (4 ligne(s))
DELETE FROM `rooms`;
INSERT INTO `rooms` (`id`, `name`, `type`, `capacity`, `created_at`, `updated_at`) VALUES
(1, 'Salle 101', 'Salle de classe', 35, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 'Atelier Cuisine 1', 'Atelier pratique', 20, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(3, 'Restaurant d\'application', 'Atelier pratique', 25, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(4, 'Amphithéâtre A', 'Amphithéâtre', 80, '2026-08-22 14:52:58', '2026-08-22 14:52:58');

-- Table: salary_payments (9 ligne(s))
DELETE FROM `salary_payments`;
INSERT INTO `salary_payments` (`id`, `user_id`, `expense_id`, `period_year`, `period_month`, `amount`, `paid_at`, `payment_method`, `notes`, `recorded_by`, `created_at`, `updated_at`) VALUES
(2, 1, 6, 2026, 1, 500000, '2026-08-23 00:00:00', 'virement', NULL, 1, '2026-08-23 14:09:32', '2026-08-23 14:09:32'),
(5, 1, 10, 2026, 3, 500000, '2026-08-23 00:00:00', 'virement', NULL, 1, '2026-08-23 14:34:14', '2026-08-23 14:34:14'),
(6, 13, 11, 2026, 3, 60000, '2026-08-23 00:00:00', 'virement', NULL, 1, '2026-08-23 14:34:18', '2026-08-23 14:34:18'),
(7, 13, 12, 2026, 2, 60000, '2026-08-23 00:00:00', 'virement', NULL, 1, '2026-08-23 14:34:20', '2026-08-23 14:34:20'),
(8, 13, 13, 2026, 1, 60000, '2026-08-23 00:00:00', 'virement', NULL, 1, '2026-08-23 14:34:22', '2026-08-23 14:34:22'),
(9, 1, 14, 2026, 6, 500000, '2026-08-23 00:00:00', 'virement', NULL, 1, '2026-08-23 14:34:55', '2026-08-23 14:34:55'),
(10, 13, 15, 2026, 6, 60000, '2026-08-23 00:00:00', 'virement', NULL, 1, '2026-08-23 14:34:58', '2026-08-23 14:34:58'),
(11, 1, 16, 2026, 5, 500000, '2026-08-23 00:00:00', 'virement', NULL, 1, '2026-08-23 14:47:50', '2026-08-23 14:47:50'),
(12, 13, 17, 2026, 4, 60000, '2026-08-23 00:00:00', 'mobile_money', NULL, 1, '2026-08-23 15:05:44', '2026-08-23 15:05:44');

-- Table: school_classes (2 ligne(s))
DELETE FROM `school_classes`;
INSERT INTO `school_classes` (`id`, `name`, `formation_id`, `academic_year_id`, `capacity`, `created_at`, `updated_at`) VALUES
(2, 'Premiere année BEP Restauration', 7, 1, 30, '2026-08-22 19:00:00', '2026-08-22 19:00:37'),
(3, 'Deuxième année BEP Restauration', 7, 1, 30, '2026-08-22 19:01:02', '2026-08-22 19:01:14');

-- Table: sent_emails (6 ligne(s))
DELETE FROM `sent_emails`;
INSERT INTO `sent_emails` (`id`, `sender_id`, `subject`, `body`, `recipients`, `recipients_count`, `failed_count`, `created_at`, `updated_at`) VALUES
(1, 1, 'Test de la messagerie EEHT', 'Ceci est un message de test.', '[{"email":"awa.diop@eeht-thies.sn","name":"Awa Diop"}]', 1, 0, '2026-08-22 19:37:46', '2026-08-22 19:37:46'),
(2, 1, 'Frais d\'inscription', 'La date limites des inscription c\'est cette semaine', '[{"email":"ousmane.diallo@eeht-thies.sn","name":"Ousmane Diallo"},{"email":"awa.diop@eeht-thies.sn","name":"Awa Diop"},{"email":"modou.fall@eeht-thies.sn","name":"Modou Fall"},{"email":"rokhaya.gueye@eeht-thies.sn","name":"Rokhaya Gueye"},{"email":"babsgeo18@gmail.com","name":"Babacar NDIAYE"},{"email":"cheikh.ndiaye@eeht-thies.sn","name":"Cheikh Ndiaye"},{"email":"bineta.sow@eeht-thies.sn","name":"Bineta Sow"}]', 7, 0, '2026-08-22 21:39:29', '2026-08-22 21:39:29'),
(4, 1, 'Devoir', 'GEHEH', '[{"email":"babsgeo18@gmail.com","name":"Babacar NDIAYE"}]', 1, 0, '2026-08-22 22:01:48', '2026-08-22 22:01:48'),
(5, 1, 'Debut des cours', 'Nous vous informons la debut des cours', '[{"email":"babsgeo18@gmail.com","name":"Babacar NDIAYE"}]', 1, 0, '2026-08-22 22:18:55', '2026-08-22 22:18:55'),
(6, 1, 'Bonjour', 'Bonjour', '[{"email":"fatou.diagne@eeht-thies.sn","name":"Fatou Diagne"}]', 1, 0, '2026-08-22 22:26:18', '2026-08-22 22:26:18'),
(7, 1, 'BONJOUR', 'BONJOUR', '[{"email":"fatou.diagne@eeht-thies.sn","name":"Fatou Diagne"}]', 1, 0, '2026-08-22 22:34:50', '2026-08-22 22:34:50');

-- Table: settings (28 ligne(s))
DELETE FROM `settings`;
INSERT INTO `settings` (`id`, `key`, `value`, `group`, `created_at`, `updated_at`) VALUES
(1, 'site_name', 'Elite École Hôtelière et Touristique de Thiès', 'general', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(2, 'site_short_name', 'EEHT de Thiès', 'general', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(3, 'site_email', 'contact@eeht-thies.sn', 'general', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(4, 'site_phone', '+221 33 951 00 00', 'general', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(5, 'site_address', 'Route de Dakar, Thiès, Sénégal', 'general', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(6, 'facebook_url', 'https://facebook.com/eehtthies', 'general', '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(7, 'years_experience', '05', 'general', '2026-08-22 14:52:57', '2026-08-22 16:27:55'),
(8, 'students_trained', '200', 'general', '2026-08-22 14:52:57', '2026-08-22 16:27:55'),
(9, 'success_rate', '92', 'general', '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(10, 'partners_count', '10', 'general', '2026-08-22 14:52:58', '2026-08-22 16:27:55'),
(11, 'site_tagline', NULL, 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(12, 'opening_hours', NULL, 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(13, 'site_ninea', NULL, 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(14, 'site_rccm', NULL, 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(15, 'instagram_url', NULL, 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(16, 'whatsapp_url', NULL, 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(17, 'linkedin_url', NULL, 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(18, 'youtube_url', NULL, 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(19, 'site_logo', 'settings/xwfGUKjr2EXBNCxMkYHXiSpGTZZl9nQJ7VUc5Esl.jpg', 'general', '2026-08-22 15:13:38', '2026-08-22 15:13:38'),
(20, 'theme_primary_color', '#8bc93f', 'general', '2026-08-22 16:41:02', '2026-08-22 16:41:58'),
(21, 'theme_secondary_color', '#670338', 'general', '2026-08-22 16:41:02', '2026-08-22 17:04:03'),
(22, 'theme_accent_color', '#410123', 'general', '2026-08-22 16:41:02', '2026-08-23 12:31:52'),
(23, 'theme_neutral_color', '#50022b', 'general', '2026-08-22 17:07:53', '2026-08-23 12:31:43'),
(24, 'director_name', 'Thioro El Mansour DIA', 'general', '2026-08-22 18:50:36', '2026-08-22 21:36:33'),
(25, 'director_role', 'Directrice Generale', 'general', '2026-08-22 18:50:36', '2026-08-22 21:36:33'),
(26, 'director_message', NULL, 'general', '2026-08-22 18:50:36', '2026-08-22 18:50:36'),
(27, 'director_photo', 'settings/LS0iM1oGZxsMAMr5DIhd43D50W3kl9U2dGvk9Ju7.jpg', 'general', '2026-08-22 18:50:36', '2026-08-22 18:50:36'),
(28, 'about_photo', 'settings/7C0TIXrX4py4CXE46WkSgLpv8OoqKft6rWu62Dm1.jpg', 'general', '2026-08-23 12:17:41', '2026-08-23 12:20:37');

-- Table: sliders (3 ligne(s))
DELETE FROM `sliders`;
INSERT INTO `sliders` (`id`, `title`, `subtitle`, `image`, `button_text`, `button_link`, `order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'L\'excellence hôtelière et touristique à Thiès', 'Formez-vous aux métiers de l\'hôtellerie, de la restauration et du tourisme dans un cadre professionnel de haut niveau.', 'sliders/FvDFDwkRpkcYsmZzE24u7ETVChCRMDdC1S9G0zS1.jpg', 'Découvrir l\'EEHT', '/a-propos', 1, 1, '2026-08-22 14:52:57', '2026-08-22 17:41:53'),
(2, 'Des formations professionnalisantes', 'CAP, BTS, DTS : des parcours adaptés à chaque ambition, encadrés par des professionnels expérimentés.', 'sliders/w5KCd7Zkqjf8VdI54ri7TXwWr9AMyvnAl3yMPoGu.jpg', 'Voir nos formations', '/formations', 2, 1, '2026-08-22 14:52:57', '2026-08-22 17:42:09'),
(3, 'Candidatez dès maintenant', 'Les admissions pour la rentrée 2026-2027 sont ouvertes. Déposez votre dossier en ligne en quelques minutes.', 'sliders/XF0p2GnX4xQszcQKcpJRvcBCoi4UGU2XaFK9sfzS.jpg', 'Candidater maintenant', '/candidature', 3, 1, '2026-08-22 14:52:57', '2026-08-22 17:42:20');

-- Table: students (8 ligne(s))
DELETE FROM `students`;
INSERT INTO `students` (`id`, `user_id`, `matricule`, `photo`, `first_name`, `last_name`, `birth_date`, `gender`, `address`, `phone`, `email`, `formation_id`, `school_class_id`, `academic_year_id`, `guardian_name`, `guardian_phone`, `emergency_contact`, `status`, `candidature_id`, `created_at`, `updated_at`, `guardian_email`, `parent_user_id`, `graduation_year`, `current_position`, `current_employer`, `linkedin_url`, `alumni_bio`, `is_alumni_public`, `birth_place`, `is_repeating`, `blood_group`, `allergies`, `chronic_conditions`, `current_medication`, `health_insurance`, `doctor_name`, `doctor_phone`, `health_notes`, `diploma_number`, `diploma_issued_at`, `professional_email`) VALUES
(1, 2, 'ELV-2026-0001', NULL, 'Awa', 'Diop', NULL, 'F', NULL, NULL, NULL, 7, 2, 1, 'Serigne Diop', NULL, NULL, 'actif', NULL, '2026-08-22 14:52:58', '2026-08-23 21:49:55', 'serigne.diop@gmail.com', 5, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, 'O+', 'Arachides', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'awa.diop@eeht-thies.sn'),
(2, 3, 'ELV-2026-0002', NULL, 'Modou', 'Fall', '1998-03-12 00:00:00', 'M', NULL, NULL, NULL, 7, 2, 1, 'Ndeye Fall', NULL, NULL, 'diplome', NULL, '2026-08-22 14:52:58', '2026-08-23 15:56:43', 'ndeye.fall@gmail.com', NULL, 2024, 'Chef de cuisine', 'Hôtel Terrou-Bi', NULL, 'Diplômé de l\'EEHT, aujourd\'hui chef de cuisine dans un hôtel de renom à Dakar.', 1, 'Thiès', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'DIP-2026-THLJA9', '2026-08-23 01:14:25', 'modou.fall@eeht-thies.sn'),
(3, NULL, 'ELV-2026-0003', NULL, 'Bineta', 'Sow', NULL, 'F', NULL, NULL, NULL, 7, 2, 1, 'Abdou Sow', NULL, NULL, 'actif', NULL, '2026-08-22 14:52:58', '2026-08-23 15:56:43', 'abdou.sow@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'bineta.sow@eeht-thies.sn'),
(4, NULL, 'ELV-2026-0004', NULL, 'Cheikh', 'Ndiaye', NULL, 'M', NULL, NULL, NULL, 7, 2, 1, 'Coumba Ndiaye', NULL, NULL, 'actif', NULL, '2026-08-22 14:52:58', '2026-08-23 15:56:43', 'coumba.ndiaye@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'cheikh.ndiaye@eeht-thies.sn'),
(5, NULL, 'ELV-2026-0005', NULL, 'Rokhaya', 'Gueye', NULL, 'F', NULL, NULL, NULL, 7, 2, 1, 'Lamine Gueye', NULL, NULL, 'actif', NULL, '2026-08-22 14:52:58', '2026-08-23 15:56:43', 'lamine.gueye@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'rokhaya.gueye@eeht-thies.sn'),
(6, 14, 'ELV-2026-0006', NULL, 'Ousmane', 'Diallo', NULL, 'M', NULL, NULL, NULL, 7, 2, 1, 'Fatim Diallo', NULL, NULL, 'actif', NULL, '2026-08-22 14:52:58', '2026-08-23 15:56:43', 'fatim.diallo@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ousmane.diallo@eeht-thies.sn'),
(7, 6, 'ELV-2026-0007', NULL, 'Babacar', 'NDIAYE', '1994-04-19 00:00:00', 'M', 'Thies', '771877918', 'babsgeo18@gmail.com', 7, 2, 1, NULL, NULL, NULL, 'actif', 1, '2026-08-22 19:03:11', '2026-08-23 15:56:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'babacar.ndiaye2@eeht-thies.sn'),
(8, 17, 'ELV-2026-0008', NULL, 'Moussa', 'NDIAYE', '2007-02-23 00:00:00', 'M', 'Thies', '771877918', NULL, 7, 2, 1, NULL, NULL, NULL, 'actif', 2, '2026-08-23 12:36:59', '2026-08-23 15:56:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'moussa.ndiaye@eeht-thies.sn');

-- Table: subject_teacher (3 ligne(s))
DELETE FROM `subject_teacher`;
INSERT INTO `subject_teacher` (`id`, `subject_id`, `teacher_id`, `created_at`, `updated_at`) VALUES
(1, 1, 1, NULL, NULL),
(2, 4, 3, NULL, NULL),
(3, 2, 2, NULL, NULL);

-- Table: subjects (4 ligne(s))
DELETE FROM `subjects`;
INSERT INTO `subjects` (`id`, `name`, `code`, `formation_id`, `coefficient`, `created_at`, `updated_at`) VALUES
(1, 'Cuisine professionnelle', 'CUIS', NULL, 4, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 'Service en salle', 'SERV', NULL, 3, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(3, 'Gestion hôtelière', 'GEST', NULL, 3, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(4, 'Anglais professionnel', 'ANGL', NULL, 2, '2026-08-22 14:52:58', '2026-08-22 14:52:58');

-- Table: suppliers (2 ligne(s))
DELETE FROM `suppliers`;
INSERT INTO `suppliers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`, `created_at`, `updated_at`) VALUES
(1, 'Grossiste Thiès Alimentation', 'Modou Kane', '77 111 22 33', NULL, NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58'),
(2, 'Sénégal Hôtellerie Équipements', 'Fatou Ndoye', '77 222 33 44', NULL, NULL, '2026-08-22 14:52:58', '2026-08-22 14:52:58');

-- Table: teachers (3 ligne(s))
DELETE FROM `teachers`;
INSERT INTO `teachers` (`id`, `user_id`, `matricule`, `first_name`, `last_name`, `photo`, `phone`, `email`, `address`, `specialty`, `diplomas`, `experience_years`, `status`, `created_at`, `updated_at`, `professional_email`) VALUES
(1, 4, 'ENS-0001', 'Fatou', 'Diagne', NULL, NULL, NULL, NULL, 'Cuisine gastronomique', NULL, 12, 'actif', '2026-08-22 14:52:57', '2026-08-23 15:56:43', 'fatou.diagne@eeht-thies.sn'),
(2, 7, 'ENS-0002', 'Moussa', 'Sarr', NULL, NULL, NULL, NULL, 'Management hôtelier', NULL, 9, 'actif', '2026-08-22 14:52:57', '2026-08-23 15:56:43', 'moussa.sarr@eeht-thies.sn'),
(3, 8, 'ENS-0003', 'Aïssatou', 'Ba', NULL, NULL, NULL, NULL, 'Tourisme et accueil', NULL, 7, 'actif', '2026-08-22 14:52:57', '2026-08-23 15:56:43', 'aissatou.ba@eeht-thies.sn');

-- Table: testimonials (2 ligne(s))
DELETE FROM `testimonials`;
INSERT INTO `testimonials` (`id`, `name`, `photo`, `role`, `formation_id`, `content`, `rating`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 'Khady Fall', NULL, 'Ancienne élève, BTS Hôtellerie', NULL, 'L\'EEHT m\'a donné toutes les clés pour réussir dans l\'hôtellerie internationale. L\'encadrement et les stages pratiques ont fait toute la différence.', 5, 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57'),
(2, 'Ibrahima Sy', NULL, 'Ancien élève, CAP Cuisine', NULL, 'Une formation exigeante mais passionnante, avec des ateliers modernes et des enseignants très expérimentés.', 5, 1, '2026-08-22 14:52:57', '2026-08-22 14:52:57');

-- Table: timetable_entries (2 ligne(s))
DELETE FROM `timetable_entries`;
INSERT INTO `timetable_entries` (`id`, `school_class_id`, `subject_id`, `teacher_id`, `room_id`, `day_of_week`, `start_time`, `end_time`, `created_at`, `updated_at`) VALUES
(5, 2, 1, 1, 1, 1, '08:00', '10:00', '2026-08-22 22:24:32', '2026-08-22 22:24:32'),
(6, 2, 4, 3, 1, 2, '08:00', '10:00', '2026-08-23 08:00:52', '2026-08-23 08:00:52');

-- Table: users (12 ligne(s))
DELETE FROM `users`;
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `avatar`, `is_active`, `last_login_at`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`, `position`, `department`, `hire_date`, `monthly_salary`, `manager_id`, `personal_email`) VALUES
(1, 'Directrice EEHT', 'admin@eeht-thies.sn', NULL, 'avatars/V2NCwsIRJ5swv3dsdHeXU3s9ZaWvq8yYtxv20gZP.jpg', 1, NULL, '2026-08-22 14:52:57', '$2y$12$MBF.xTG3nJalet31oFBdr.7JbgrgR/2zfeyJb8MSKrN.oEizzB1p6', NULL, '2026-08-22 14:52:57', '2026-08-23 14:32:01', NULL, NULL, NULL, 500000, NULL, NULL),
(2, 'Awa Diop', 'awa.diop@eeht-thies.sn', NULL, NULL, 1, NULL, NULL, '$2y$12$H1TMKSwzDfvuttkalA6LJOqF/NIfI0lrqJi70rg4Ra6jooZJ.2972', NULL, '2026-08-22 15:10:28', '2026-08-23 15:29:16', NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'Modou Fall', 'modou.fall@eeht-thies.sn', NULL, NULL, 1, NULL, NULL, '$2y$12$8GoGMckzz3wFJcB2qOsw1uOmqADbQaA.QX449UPjcxIyqIv1nVYHC', NULL, '2026-08-22 16:10:50', '2026-08-22 16:10:50', NULL, NULL, NULL, NULL, NULL, NULL),
(4, 'Fatou Diagne', 'fatou.diagne@eeht-thies.sn', NULL, NULL, 1, NULL, NULL, '$2y$12$itrUxmAU9mUteDM0MsNxweZEiFn.WfoKJoF4SeOoQKzFclEDzmFLC', '69zZaZgzYymGQpmS5tQQ3Z3vfjCvKxKEIua6lPKPNs9yN1YQmB8dZS9WlqvK', '2026-08-22 18:56:46', '2026-08-23 15:29:16', NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'Serigne Diop', 'serigne.diop@gmail.com', NULL, NULL, 1, NULL, NULL, '$2y$12$rJZdH2FjuanyKGja1qaJv.zmo6Xa7bEJ4mtjyEteRSriXyJuHAfnq', NULL, '2026-08-22 18:58:43', '2026-08-23 15:29:16', NULL, NULL, NULL, NULL, NULL, NULL),
(6, 'Moussa NDIAYE', 'babsgeo18@gmail.com', NULL, NULL, 1, NULL, NULL, '$2y$12$zrLXqKUp2UjkvqNiHnrhtuqwN2QI6OCo.rlFJ5CIaxrOqtUE0sBam', NULL, '2026-08-22 19:03:26', '2026-08-23 12:37:05', NULL, NULL, NULL, NULL, NULL, NULL),
(7, 'Moussa Sarr', 'moussa.sarr@eeht-thies.sn', NULL, NULL, 1, NULL, NULL, '$2y$12$ZEf2NXu/JGZEPxZQKolLXuDWVsxjhIDMUQL1/7l/P5UdKxxZ3DrUe', NULL, '2026-08-23 00:09:46', '2026-08-23 00:09:46', NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'Aïssatou Ba', 'aissatou.ba@eeht-thies.sn', NULL, NULL, 1, NULL, NULL, '$2y$12$1txpuMEn818a3UmkOvv0hOGATEi53yDLK6E6CE99ACyFXQN1ZAU3S', NULL, '2026-08-23 00:09:51', '2026-08-23 00:09:51', NULL, NULL, NULL, NULL, NULL, NULL),
(13, 'Babacar NDIAYE', 'babacar.ndiaye@eeht-thies.sn', NULL, 'avatars/14CZuqE9HME05JBXb61GIu9y2q3vFnjOFjKQzbvm.jpg', 1, NULL, NULL, '$2y$12$x30zBySBkOFq4TY63sEoB.eQu/TuyNWmyRFteo.s70/TNsQfZidT6', NULL, '2026-08-23 14:13:26', '2026-08-23 20:24:56', NULL, NULL, NULL, 60000, 1, NULL),
(14, 'Ousmane Diallo', 'ousmane.diallo@eeht-thies.sn', NULL, NULL, 1, NULL, NULL, '$2y$12$g.uLAW.wS6RNmtb/DiOA9.uokNSn1LB6cY0.b7j7goYBGL55EdqB6', NULL, '2026-08-23 14:22:05', '2026-08-23 14:22:05', NULL, NULL, NULL, NULL, NULL, NULL),
(17, 'Moussa NDIAYE', 'moussa.ndiaye2@eeht-thies.sn', NULL, NULL, 1, NULL, NULL, '$2y$12$VtkS.hMNq8p/QSXGD97G7utiHWr6nEtqJ9g6RhUC6zscuNMMUje82', NULL, '2026-08-23 15:53:40', '2026-08-23 15:54:14', NULL, NULL, NULL, NULL, NULL, NULL),
(18, 'Alpha Thiam', 'alpha.thiam@eeht-thies.sn', NULL, NULL, 1, NULL, NULL, '$2y$12$wFigx4SELWc0UjG1wR7c9.pcqylIgXky8GbikznZlHiSfBQxuuhuS', NULL, '2026-08-23 15:56:42', '2026-08-23 15:56:42', NULL, NULL, '2025-09-23 00:00:00', 150000, 1, 'babsgeo18@gmail.com');

SET FOREIGN_KEY_CHECKS=1;
