import {
    Activity,
    AlertTriangle,
    ArrowLeftRight,
    ArrowUpCircle,
    Award,
    BadgeCheck,
    Banknote,
    BarChart3,
    BellRing,
    BookMarked,
    BookOpen,
    BookText,
    Briefcase,
    Building,
    Building2,
    Calendar,
    CalendarCheck,
    CalendarClock,
    CalendarDays,
    CalendarOff,
    CalendarRange,
    ChartNoAxesCombined,
    ChefHat,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Coins,
    Contact,
    CreditCard,
    DatabaseBackup,
    DoorOpen,
    FileClock,
    FileQuestion,
    FileSpreadsheet,
    FileUser,
    Gavel,
    Gauge,
    Globe,
    GraduationCap,
    Group,
    HandCoins,
    Handshake,
    IdCard,
    Image as ImageIcon,
    Inbox,
    KeyRound,
    Landmark,
    Layers,
    LayoutDashboard,
    Library,
    LineChart,
    ListChecks,
    ListTree,
    LockKeyhole,
    Mail,
    Megaphone,
    MessageSquare,
    MessageSquareWarning,
    MessagesSquare,
    Network,
    Newspaper,
    Package,
    PackageCheck,
    PanelTop,
    PenSquare,
    PieChart,
    Presentation,
    Quote,
    ReceiptText,
    Route,
    Scale,
    ShoppingCart,
    ScanLine,
    School,
    ScrollText,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Sliders,
    SlidersHorizontal,
    Smartphone,
    Target,
    TrendingDown,
    TrendingUp,
    Truck,
    UserCheck,
    UserCog,
    UserPlus,
    Users,
    UsersRound,
    UserX,
    Vault,
    Wallet,
    Warehouse,
    Wifi,
    type LucideIcon,
} from 'lucide-react';

/**
 * Navigation de l'administration : une seule description, lue par la barre latérale (ordinateur), la feuille Menu
 * et la barre du bas (téléphone), la palette de recherche et le fil d'Ariane. Chaque `href` est un nom de route
 * Laravel et chaque `permission` une entrée du catalogue config/eeht.php : AdminNavigationTest le vérifie.
 *
 * Les groupes suivent la vie d'une école de formation : on recrute et on inscrit (admissions & élèves), on suit les
 * présences, on organise les formations et les classes, on enseigne, on évalue et on diplôme, puis viennent
 * l'argent (frais de scolarité, comptabilité, stocks), l'insertion professionnelle, la communication, le site, les
 * statistiques, le personnel et l'administration du logiciel. Un métier retrouve ses pages au même endroit : le
 * caissier dans « Finance », l'économe dans « Économat ».
 *
 * Une page appartient à une seule rubrique (les fonctions `active` ne se recouvrent pas) : AdminMenuCoverageTest le
 * vérifie pour toutes les pages d'administration, y compris celles que l'on ajoutera.
 */
export interface NavItem {
    /** Intertitre affiché au-dessus de cet élément quand il change d'un élément à l'autre (grands groupes). */
    section?: string;
    label: string;
    /** Nom de la route Laravel (et non son adresse). */
    href: string;
    icon: LucideIcon;
    active: (current: string) => boolean;
    /** La permission « voir_x » nécessaire pour voir cet élément. À omettre pour l'afficher à tous les rôles du personnel. */
    permission?: string;
    /** Mots que l'on peut taper dans la palette pour trouver la rubrique (accents et majuscules sans importance). */
    keywords?: string;
}

export interface NavGroup {
    label: string | null;
    icon?: LucideIcon;
    items: NavItem[];
}

export interface QuickAction {
    label: string;
    href: string;
    icon: LucideIcon;
    permission: string;
}

/** Les pages de présence existent sous deux préfixes de route (admin.pointage.* et admin.attendance.*). */
const isPresence = (current: string) => current.startsWith('admin.pointage') || current.startsWith('admin.attendance');


export const navGroups: NavGroup[] = [
    {
        label: null,
        items: [
            {
                label: 'Tableau de bord',
                href: 'admin.dashboard',
                icon: LayoutDashboard,
                active: (c) => c === 'admin.dashboard',
                keywords: 'accueil synthese chiffres',
            },
        ],
    },
    {
        label: 'Admissions',
        icon: UserPlus,
        items: [
            {
                label: 'Candidatures',
                href: 'admin.candidatures.index',
                icon: FileUser,
                active: (c) => c.startsWith('admin.candidatures'),
                permission: 'voir_candidatures',
                keywords: 'admissions dossiers inscription candidats pre-inscription',
            },
        ],
    },
    {
        label: 'Scolarité',
        icon: Users,
        items: [
            {
                label: 'Élèves',
                href: 'admin.students.index',
                icon: IdCard,
                // Liste des élèves et « En ligne » : onglets (StudentTabs).
                active: (c) => c.startsWith('admin.students'),
                permission: 'voir_eleves',
                keywords: 'etudiants apprenants inscrits matricule dossiers en ligne connectes presence en direct',
            },
            {
                label: 'Classes',
                href: 'admin.school-classes.index',
                icon: Group,
                // Classes et années académiques : onglets (ClassTabs).
                active: (c) => c.startsWith('admin.school-classes') || c.startsWith('admin.academic-years'),
                permission: 'voir_classes',
                keywords: 'promotions groupes effectifs annee academique annees scolaires',
            },
            {
                label: 'Présences',
                href: 'admin.pointage.index',
                icon: ClipboardCheck,
                // Pointage, registre, statistiques et scanner d'entrée : onglets (PresenceTabs).
                active: (c) => isPresence(c) || c.startsWith('admin.borne.pointage'),
                permission: 'voir_presences',
                keywords: 'presence appel absences retards registre statistiques taux de presence absenteisme scanner cartes entree borne qr',
            },
            {
                label: 'Discipline',
                href: 'admin.discipline.index',
                icon: ShieldAlert,
                active: (c) => c.startsWith('admin.discipline'),
                permission: 'voir_discipline',
                keywords: 'sanctions avertissement blame exclusion conduite vie scolaire',
            },
            {
                label: 'Passation de classe',
                href: 'admin.class-promotion.index',
                icon: ArrowUpCircle,
                active: (c) => c.startsWith('admin.class-promotion'),
                permission: 'modifier_eleves',
                keywords: 'passage promotion redoublement fin d annee exclusion',
            },
        ],
    },
    {
        label: 'Pédagogie',
        icon: School,
        items: [
            {
                label: 'Formations',
                href: 'admin.formations.index',
                icon: GraduationCap,
                // Formations, niveaux, compétences et bibliothèque : onglets (FormationTabs).
                active: (c) => c.startsWith('admin.formations') || c.startsWith('admin.formation-levels') || c.startsWith('admin.skills') || c.startsWith('admin.library'),
                permission: 'voir_formations',
                keywords: 'filieres diplomes programmes cursus niveaux regles de passage referentiel de competences niveaux regles de passage referentiel de competences bibliotheque ressources',
            },
            {
                label: 'Matières',
                href: 'admin.subjects.index',
                icon: BookOpen,
                active: (c) => c.startsWith('admin.subjects'),
                permission: 'voir_matieres',
                keywords: 'cours disciplines coefficients',
            },
            {
                label: 'Emploi du temps',
                href: 'admin.timetable.index',
                icon: Clock,
                // Emploi du temps et cahier de texte : onglets (TeachingTabs).
                active: (c) => c.startsWith('admin.timetable') || c.startsWith('admin.lesson-logs'),
                permission: 'voir_emploi_du_temps',
                keywords: 'planning horaires cours seances cahier de texte seances contenu devoirs cahier de texte seances contenu devoirs',
            },
            {
                label: 'Salles & ateliers',
                href: 'admin.rooms.index',
                icon: DoorOpen,
                // Salles et ateliers pratiques : onglets (RoomTabs).
                active: (c) => c.startsWith('admin.rooms') || c.startsWith('admin.practical-sessions'),
                permission: 'voir_salles',
                keywords: 'locaux ateliers amphitheatre ateliers pratiques travaux pratiques',
            },
            {
                label: 'Fiches enseignants',
                href: 'admin.teachers.index',
                icon: Contact,
                active: (c) => c.startsWith('admin.teachers'),
                permission: 'voir_enseignants',
                keywords: 'professeurs formateurs intervenants vacataires',
            },
        ],
    },
    {
        label: 'Évaluations',
        icon: Award,
        items: [
            {
                label: 'Examens & devoirs',
                href: 'admin.exams.index',
                icon: PenSquare,
                active: (c) => c.startsWith('admin.exams'),
                permission: 'voir_examens',
                keywords: 'epreuves controles notes interrogations compositions',
            },
            {
                label: 'Évaluations de compétences',
                href: 'admin.skill-assessments.index',
                icon: ListChecks,
                active: (c) => c.startsWith('admin.skill-assessments'),
                permission: 'voir_notes',
                keywords: 'competences fiches grilles',
            },
            {
                label: 'Bulletins',
                href: 'admin.report-cards.index',
                icon: ScrollText,
                active: (c) => c.startsWith('admin.report-cards'),
                permission: 'voir_bulletins',
                keywords: 'releves notes moyennes semestre',
            },
            {
                label: 'Conseils de classe',
                href: 'admin.councils.index',
                icon: Gavel,
                // Conseils, actions de suivi, bilan et réglages : onglets (CouncilTabs).
                active: (c) => c.startsWith('admin.councils') || c.startsWith('admin.council-sittings') || c.startsWith('admin.council-dashboard') || c.startsWith('admin.council-settings') || (c.startsWith('admin.follow-ups') && c !== 'admin.follow-ups.mine'),
                permission: 'voir_conseils',
                keywords: 'conseil de classe deliberation decisions proces verbal pv seance appreciations actions de suivi entretiens actions de suivi entretiens bilan tableau de bord reglages seuils',
            },
            {
                label: 'Diplômes & attestations',
                href: 'admin.certificates.index',
                icon: BadgeCheck,
                active: (c) => c.startsWith('admin.certificates'),
                permission: 'voir_eleves',
                keywords: 'certificats attestations de stage remise',
            },
        ],
    },
    {
        label: 'Finance',
        icon: CreditCard,
        items: [
            {
                label: 'Encaisser',
                href: 'admin.cashier.create',
                icon: HandCoins,
                active: (c) => c.startsWith('admin.cashier'),
                permission: 'ajouter_comptabilite',
                keywords: 'caisse guichet paiement mensualite scolarite inscription recu wave orange money cheque',
            },
            {
                // Une seule rubrique pour le suivi des élèves : factures, mensualités, impayés, échéanciers et paiements en ligne
                // sont des onglets de la même page (FinanceTabs).
                label: 'Factures & suivi',
                href: 'admin.invoices.index',
                icon: ReceiptText,
                active: (c) => c.startsWith('admin.invoices') || c.startsWith('admin.payment-plans') || c.startsWith('admin.online-payments'),
                permission: 'voir_comptabilite',
                keywords: 'paiements scolarite frais recus mensualites inscription impayes retards relances echeances echeanciers tranches plans wave orange money carte tentatives anomalies reconcilier',
            },
            {
                label: 'Tableau de bord financier',
                href: 'admin.finance.dashboard',
                icon: Wallet,
                active: (c) => c === 'admin.finance.dashboard',
                permission: 'voir_comptabilite',
                keywords: 'finance tresorerie argent budget recettes depenses recouvrement',
            },
            {
                label: 'Journal de caisse',
                href: 'admin.finance.cash-journal',
                icon: Vault,
                active: (c) => c === 'admin.finance.cash-journal',
                permission: 'voir_comptabilite',
                keywords: 'caisse tresorerie recettes depenses solde livre de caisse',
            },
            {
                label: 'Dépenses',
                href: 'admin.expenses.index',
                icon: TrendingDown,
                active: (c) => c.startsWith('admin.expenses'),
                permission: 'voir_comptabilite',
                keywords: 'achats charges frais',
            },
            {
                // Écritures, grand livre, balance, bilan, compte de résultat et plan comptable sont des onglets (AccountingTabs).
                label: 'Comptabilité',
                href: 'admin.accounting.journal-entries.index',
                icon: BookMarked,
                active: (c) => c.startsWith('admin.accounting'),
                permission: 'voir_comptabilite',
                keywords: 'ecritures journal debit credit grand livre balance generale bilan compte de resultat plan comptable comptes',
            },
            {
                label: 'Réglages des paiements',
                href: 'admin.finance.settings',
                icon: SlidersHorizontal,
                active: (c) => c.startsWith('admin.finance.settings'),
                permission: 'modifier_comptabilite',
                keywords: 'echeance jour du mois relances rappels generation automatique mensualites',
            },
        ],
    },
    {
        label: 'Économat',
        icon: Warehouse,
        items: [
            {
                label: "Tableau de bord de l'économat",
                href: 'admin.economat.dashboard',
                icon: Gauge,
                active: (c) => c === 'admin.economat.dashboard',
                permission: 'voir_stocks',
                keywords: 'economat econome stock valeur ruptures alertes reapprovisionnement',
            },
            {
                label: 'Articles & stocks',
                href: 'admin.products.index',
                icon: Package,
                active: (c) => c.startsWith('admin.products') && c !== 'admin.products.movements',
                permission: 'voir_stocks',
                keywords: 'inventaire marchandises articles produits denrees fournitures uniformes materiel seuils alerte',
            },
            {
                label: 'Bons de commande',
                href: 'admin.purchase-orders.index',
                icon: ShoppingCart,
                active: (c) => c.startsWith('admin.purchase-orders'),
                permission: 'voir_stocks',
                keywords: 'achats commandes fournisseurs reception livraison bon de commande approvisionnement',
            },
            {
                label: 'Demandes de matériel',
                href: 'admin.supply-requests.index',
                icon: PackageCheck,
                active: (c) => c.startsWith('admin.supply-requests'),
                permission: 'voir_stocks',
                keywords: 'demandes atelier pratique cours cuisine sortie livraison matiere premiere classe',
            },
            {
                label: 'Inventaire',
                href: 'admin.inventory.index',
                icon: ListChecks,
                active: (c) => c.startsWith('admin.inventory'),
                permission: 'voir_stocks',
                keywords: 'comptage ecarts regularisation stock physique',
            },
            {
                label: 'Mouvements de stock',
                href: 'admin.products.movements',
                icon: ArrowLeftRight,
                active: (c) => c === 'admin.products.movements',
                permission: 'voir_stocks',
                keywords: 'entrees sorties ajustements historique inventaire',
            },
            {
                label: 'Fournisseurs',
                href: 'admin.suppliers.index',
                icon: Truck,
                active: (c) => c.startsWith('admin.suppliers'),
                permission: 'voir_stocks',
                keywords: 'achats approvisionnement',
            },
        ],
    },
    {
        label: 'Stages & emploi',
        icon: Briefcase,
        items: [
            {
                label: 'Offres de stage',
                href: 'admin.internship-offers.index',
                icon: ClipboardList,
                active: (c) => c.startsWith('admin.internship-offers'),
                permission: 'voir_insertion',
                keywords: 'insertion entreprises',
            },
            {
                label: 'Stages des élèves',
                href: 'admin.internships.index',
                icon: Route,
                active: (c) => c.startsWith('admin.internships'),
                permission: 'voir_insertion',
                keywords: 'insertion entreprises tuteurs conventions',
            },
            {
                label: "Offres d'emploi",
                href: 'admin.job-offers.index',
                icon: Building2,
                active: (c) => c.startsWith('admin.job-offers'),
                permission: 'voir_insertion',
                keywords: 'insertion recrutement postes',
            },
            {
                label: 'Partenaires',
                href: 'admin.partners.index',
                icon: Handshake,
                active: (c) => c.startsWith('admin.partners'),
                permission: 'voir_partenaires',
                keywords: 'entreprises sponsors institutions logos',
            },
        ],
    },
    {
        label: 'Communication',
        icon: MessagesSquare,
        items: [
            {
                label: 'EEHT Connect',
                href: 'connect.index',
                icon: MessageSquare,
                active: (c) => c.startsWith('connect.'),
                keywords: 'chat discussion messagerie instantanee',
            },
            {
                label: 'Messages du site',
                href: 'admin.messages.index',
                icon: Inbox,
                active: (c) => c.startsWith('admin.messages'),
                permission: 'voir_communication',
                keywords: 'contact formulaire',
            },
            {
                label: 'Messagerie',
                href: 'admin.mail.index',
                icon: Mail,
                active: (c) => c.startsWith('admin.mail'),
                permission: 'voir_communication',
                keywords: 'email courrier envoyer',
            },
            {
                label: 'Annonces officielles',
                href: 'admin.announcements.index',
                icon: Megaphone,
                active: (c) => c.startsWith('admin.announcements'),
                permission: 'voir_communication',
                keywords: 'communiques',
            },
            {
                label: 'Modération des groupes',
                href: 'admin.class-discussions.index',
                icon: MessageSquareWarning,
                active: (c) => c.startsWith('admin.class-discussions'),
                permission: 'voir_communication',
                keywords: 'discussions classe',
            },
        ],
    },
    {
        // « Site web » et non « Site public » : le lien « Voir le site public » du pied de menu porte déjà ce nom.
        label: 'Site web',
        icon: PanelTop,
        items: [
            {
                label: 'Actualités',
                href: 'admin.news.index',
                icon: Newspaper,
                active: (c) => c.startsWith('admin.news'),
                permission: 'voir_actualites',
                keywords: 'articles blog',
            },
            {
                label: 'Événements',
                href: 'admin.events.index',
                icon: Calendar,
                active: (c) => c.startsWith('admin.events'),
                permission: 'voir_evenements',
                keywords: 'agenda',
            },
            {
                label: 'Galerie',
                href: 'admin.galleries.index',
                icon: ImageIcon,
                active: (c) => c.startsWith('admin.galleries'),
                permission: 'voir_galerie',
                keywords: 'photos albums',
            },
            {
                label: 'Témoignages',
                href: 'admin.testimonials.index',
                icon: Quote,
                active: (c) => c.startsWith('admin.testimonials'),
                permission: 'voir_temoignages',
                keywords: 'avis',
            },
            {
                label: 'Diaporama accueil',
                href: 'admin.sliders.index',
                icon: Sliders,
                active: (c) => c.startsWith('admin.sliders'),
                permission: 'voir_communication',
                keywords: 'slider banniere',
            },
            {
                label: 'FAQ',
                href: 'admin.faqs.index',
                icon: FileQuestion,
                active: (c) => c.startsWith('admin.faqs'),
                permission: 'voir_faq',
                keywords: 'questions reponses aide',
            },
        ],
    },
    {
        // Rubrique seule : elle s'affiche comme un lien direct, sans groupe à déplier.
        label: null,
        items: [
            {
                // Académique, financier, marketing, élèves à risque et trafic sont des onglets (StatisticsTabs).
                label: 'Statistiques',
                href: 'admin.statistics.academic',
                icon: LineChart,
                active: (c) => c.startsWith('admin.statistics'),
                permission: 'voir_statistiques',
                keywords: 'indicateurs resultats academique financieres recettes depenses recouvrement marketing candidatures sources eleves a risque decrochage alertes trafic visites connexions',
            },
        ],
    },
    {
        label: 'Ressources humaines',
        icon: UserCog,
        items: [
            {
                label: 'Tableau de bord RH',
                href: 'admin.hr.index',
                icon: Building,
                active: (c) => c === 'admin.hr.index',
                permission: 'voir_utilisateurs',
                keywords: 'ressources humaines personnel',
            },
            {
                label: 'Personnel administratif',
                href: 'admin.users.index',
                icon: UsersRound,
                active: (c) => c.startsWith('admin.users'),
                permission: 'voir_utilisateurs',
                keywords: 'utilisateurs comptes equipe',
            },
            {
                label: 'Organigramme',
                href: 'admin.org-chart.index',
                icon: Network,
                active: (c) => c.startsWith('admin.org-chart'),
                permission: 'voir_organigramme',
                keywords: 'hierarchie',
            },
            {
                label: 'Congés',
                href: 'admin.leave.index',
                icon: CalendarOff,
                active: (c) => c.startsWith('admin.leave'),
                // Pas de contrôle de permission : libre-service (ses propres demandes), comme
                // admin.dashboard. L'approbation ou le refus est contrôlé dans le contrôleur.
                keywords: 'vacances absences demandes',
            },
            {
                label: 'Paie mensuelle',
                href: 'admin.payroll.index',
                icon: Banknote,
                active: (c) => c.startsWith('admin.payroll'),
                permission: 'voir_salaires',
                keywords: 'salaires bulletins ordre de paiement virement wave orange money valider',
            },
            {
                label: 'Registre des salaires',
                href: 'admin.salaries.index',
                icon: Coins,
                active: (c) => c.startsWith('admin.salaries'),
                permission: 'voir_salaires',
                keywords: 'salaires paie fiches de paie historique',
            },
        ],
    },
    {
        label: 'Administration',
        icon: ShieldCheck,
        items: [
            {
                label: 'Paramètres',
                href: 'admin.settings.edit',
                icon: Settings,
                active: (c) => c.startsWith('admin.settings'),
                permission: 'voir_parametres',
                keywords: 'reglages logo couleurs site reinitialiser donnees',
            },
            {
                label: 'Rôles & permissions',
                href: 'admin.roles.index',
                icon: LockKeyhole,
                active: (c) => c.startsWith('admin.roles'),
                permission: 'voir_roles',
                keywords: 'droits acces profils',
            },
            {
                label: "Journal d'activité",
                href: 'admin.activity-log.index',
                icon: FileClock,
                active: (c) => c.startsWith('admin.activity-log'),
                permission: 'voir_activite',
                keywords: 'historique audit',
            },
            {
                label: 'Sauvegardes',
                href: 'admin.backups.index',
                icon: DatabaseBackup,
                active: (c) => c.startsWith('admin.backups'),
                permission: 'voir_sauvegardes',
                keywords: 'backup export base',
            },
        ],
    },
];

/** Pages que la palette sait ouvrir sans qu'elles figurent dans le menu (le mot de passe et « Ma paie » sont au pied de la barre latérale). */
export const utilityPages: NavItem[] = [
    {
        label: 'Ma paie',
        href: 'admin.my-payslips.index',
        icon: Wallet,
        active: (c) => c.startsWith('admin.my-payslips'),
        keywords: 'bulletin de paie salaire fiche de paie mes bulletins',
    },
    {
        label: 'Mes actions de suivi',
        href: 'admin.follow-ups.mine',
        icon: ClipboardList,
        active: (c) => c === 'admin.follow-ups.mine',
        keywords: 'conseil de classe suivi mes actions echeance entretien',
    },
    {
        label: 'Mon mot de passe',
        href: 'admin.password',
        icon: KeyRound,
        active: (c) => c === 'admin.password',
        keywords: 'securite connexion compte',
    },
    {
        label: 'Voir le site public',
        href: 'home',
        icon: Globe,
        active: () => false,
        keywords: 'vitrine site web',
    },
];

/** Raccourcis de création, montrés par la palette et le tableau de bord ; chacun exige la permission d'ajout du module. */
export const quickActions: QuickAction[] = [
    { label: 'Nouvel élève', href: 'admin.students.create', icon: UserPlus, permission: 'ajouter_eleves' },
    { label: 'Encaisser un paiement', href: 'admin.cashier.create', icon: HandCoins, permission: 'ajouter_comptabilite' },
    { label: 'Nouvelle facture', href: 'admin.invoices.create', icon: ReceiptText, permission: 'ajouter_comptabilite' },
    { label: 'Nouvelle dépense', href: 'admin.expenses.create', icon: TrendingDown, permission: 'ajouter_comptabilite' },
    { label: 'Nouvel enseignant', href: 'admin.teachers.create', icon: Contact, permission: 'ajouter_enseignants' },
    { label: 'Nouvelle actualité', href: 'admin.news.create', icon: Newspaper, permission: 'ajouter_actualites' },
    { label: 'Nouvel événement', href: 'admin.events.create', icon: Calendar, permission: 'ajouter_evenements' },
];

/**
 * Rubrique mise en avant dans la barre du bas (2ᵉ onglet), la première que le rôle peut voir. Le libellé est
 * court pour tenir sous l'icône.
 */
const tabShortcuts: { href: string; label: string }[] = [
    { href: 'admin.students.index', label: 'Élèves' },
    { href: 'admin.candidatures.index', label: 'Candidatures' },
    { href: 'admin.invoices.index', label: 'Factures' },
    { href: 'admin.products.index', label: 'Stocks' },
    { href: 'admin.news.index', label: 'Actualités' },
    { href: 'admin.messages.index', label: 'Contacts' },
];

export interface Located {
    item: NavItem;
    group: NavGroup;
}

/** Écrans de saisie qui ne s'appellent ni create ni edit : l'appel, les notes d'une épreuve, la passation de classe. */
const entryRoutes = new Set(['admin.pointage.index', 'admin.attendance.index', 'admin.exams.grades', 'admin.class-promotion.index']);

/**
 * Vrai pour une page de saisie : création ou modification (admin.students.create, admin.settings.edit…), appel,
 * notes, passation. Sur téléphone ces écrans n'ont pas de barre du bas : la barre Enregistrer collée au bas de
 * l'écran (FormActions) la remplace, la flèche du haut ramène à la liste et la loupe ouvre la recherche.
 */
export function isFormRoute(current: string): boolean {
    return /\.(create|edit)$/.test(current) || entryRoutes.has(current);
}

/** Retire les accents et les majuscules : « Élèves » et « eleves » se valent dans la recherche. */
export function normalize(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Rubriques et groupes que le rôle a le droit de voir (un groupe sans rubrique visible disparaît). */
export function visibleGroups(permissions: readonly string[] | undefined): NavGroup[] {
    const granted = new Set(permissions ?? []);

    return navGroups
        .map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || granted.has(item.permission)) }))
        .filter((group) => group.items.length > 0);
}

/** Actions rapides permises à ce rôle. */
export function visibleQuickActions(permissions: readonly string[] | undefined): QuickAction[] {
    const granted = new Set(permissions ?? []);

    return quickActions.filter((action) => granted.has(action.permission));
}

/** Rubrique (et groupe) qui possède la route courante, ou null pour une page hors menu. */
export function locate(groups: NavGroup[], current: string): Located | null {
    for (const group of groups) {
        for (const item of group.items) {
            if (item.active(current)) return { item, group };
        }
    }

    return null;
}

/** Rubrique mise en avant dans la barre du bas pour ce rôle. */
export function shortcutTab(groups: NavGroup[]): { item: NavItem; label: string } | null {
    const items = groups.flatMap((group) => group.items);

    for (const shortcut of tabShortcuts) {
        const item = items.find((candidate) => candidate.href === shortcut.href);

        if (item) return { item, label: shortcut.label };
    }

    return null;
}

/** Dernier niveau du fil d'Ariane d'une page qui n'est pas l'index de sa rubrique (les pages de suivi ont leur propre rubrique). */
const leafLabels: Record<string, string> = {
    create: 'Nouveau',
    edit: 'Modifier',
    show: 'Détail',
    grades: 'Notes',
    reset: 'Réinitialisation',
    minutes: 'Procès-verbal',
    audit: 'Journal',
};

export interface Crumbs {
    group: string | null;
    item: NavItem | null;
    /** Dernier niveau (« Nouveau », « Modifier »…) quand on est sous la page d'index de la rubrique. */
    leaf: string | null;
    /** Vrai pour une page de détail, de création ou de modification : la rubrique a alors sa propre page d'index. */
    isSubPage: boolean;
}

/** Fil d'Ariane de la route courante. */
export function crumbsFor(groups: NavGroup[], current: string): Crumbs {
    const located = locate(groups, current);

    if (!located) {
        // Page hors menu (mot de passe…) : on la nomme quand même dans le fil d'Ariane.
        const utility = utilityPages.find((page) => page.active(current)) ?? null;

        return { group: null, item: utility, leaf: null, isSubPage: false };
    }

    const isSubPage = current !== located.item.href;
    const segments = current.split('.').filter((segment) => segment !== 'index');
    const leaf = isSubPage ? [...segments].reverse().map((segment) => leafLabels[segment]).find(Boolean) ?? null : null;

    return { group: located.group.label, item: located.item, leaf, isSubPage };
}

/** Mots de la saisie, sans accent ni majuscule (« l'élève » donne « l » et « eleve »). */
export function searchTokens(query: string): string[] {
    return normalize(query).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Vrai si chaque mot tapé est le début d'un mot du texte : « fact » trouve « Factures », « eleve » ne trouve pas « relevés ». */
export function startsAllWords(text: string, tokens: string[]): boolean {
    const words = searchTokens(text);

    return tokens.every((token) => words.some((word) => word.startsWith(token)));
}

/** Rubriques dont le nom, le groupe ou les mots-clés commencent par tous les mots tapés ; celles dont le nom y répond d'abord. */
export function matchPages(groups: NavGroup[], query: string, limit = 8): Located[] {
    const tokens = searchTokens(query);

    if (tokens.length === 0) return [];

    const scored: { located: Located; score: number }[] = [];

    for (const group of groups) {
        for (const item of group.items) {
            if (!startsAllWords(`${item.label} ${group.label ?? ''} ${item.keywords ?? ''}`, tokens)) continue;

            const score = normalize(item.label).startsWith(tokens[0]) ? 0 : startsAllWords(item.label, tokens) ? 1 : 2;

            scored.push({ located: { item, group }, score });
        }
    }

    return scored
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((entry) => entry.located);
}

/** Pages utilitaires correspondant à la saisie (mot de passe, site public). */
export function matchUtilityPages(query: string): NavItem[] {
    const tokens = searchTokens(query);

    if (tokens.length === 0) return [];

    return utilityPages.filter((item) => startsAllWords(`${item.label} ${item.keywords ?? ''}`, tokens));
}
