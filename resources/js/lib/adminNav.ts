import {
    Activity,
    AlertTriangle,
    ArrowLeftRight,
    ArrowUpCircle,
    Award,
    BadgeCheck,
    Banknote,
    FileText,
    BarChart3,
    BellRing,
    BookMarked,
    BookOpen,
    BookText,
    Briefcase,
    Building,
    Building2,
    Calculator,
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
    PanelTop,
    PenSquare,
    PieChart,
    Presentation,
    Quote,
    ReceiptText,
    Route,
    Scale,
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
 * caissier dans « Frais de scolarité », le magasinier dans « Stocks & achats ».
 *
 * Une page appartient à une seule rubrique (les fonctions `active` ne se recouvrent pas) : AdminMenuCoverageTest le
 * vérifie pour toutes les pages d'administration, y compris celles que l'on ajoutera.
 */
export interface NavItem {
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

/** Pages de suivi des factures qui ont leur propre rubrique : « Factures » ne doit pas s'allumer aussi sur elles. */
const invoiceFollowUps = ['admin.invoices.monthly', 'admin.invoices.overdue'];

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
        label: 'Admissions & élèves',
        icon: Users,
        items: [
            {
                label: 'Candidatures',
                href: 'admin.candidatures.index',
                icon: FileUser,
                active: (c) => c.startsWith('admin.candidatures'),
                permission: 'voir_candidatures',
                keywords: 'admissions dossiers inscription candidats pre-inscription',
            },
            {
                label: 'Élèves',
                href: 'admin.students.index',
                icon: IdCard,
                active: (c) => c.startsWith('admin.students'),
                permission: 'voir_eleves',
                keywords: 'etudiants apprenants inscrits matricule dossiers',
            },
        ],
    },
    {
        label: 'Vie scolaire',
        icon: CalendarCheck,
        items: [
            {
                label: 'Pointage des élèves',
                href: 'admin.pointage.index',
                icon: ClipboardCheck,
                // Le registre et les statistiques ont leur propre rubrique plus bas : ils partagent le préfixe de
                // route admin.pointage et ne doivent pas aussi allumer « Pointage des élèves ».
                active: (c) => isPresence(c) && !c.includes('.register') && !c.endsWith('.report'),
                permission: 'voir_presences',
                keywords: 'presence appel absences retards',
            },
            {
                label: 'Scanner les cartes (entrée)',
                href: 'admin.borne.pointage.gate',
                icon: ScanLine,
                active: (c) => c.startsWith('admin.borne.pointage'),
                permission: 'ajouter_presences',
                keywords: 'qr badge borne entree carte scan',
            },
            {
                label: "Registre d'absences",
                href: 'admin.pointage.register',
                icon: UserX,
                active: (c) => isPresence(c) && c.includes('.register'),
                permission: 'voir_presences',
                keywords: 'absences retards historique justifiees cahier',
            },
            {
                label: 'Statistiques de présence',
                href: 'admin.pointage.report',
                icon: UserCheck,
                active: (c) => isPresence(c) && c.endsWith('.report'),
                permission: 'voir_presences',
                keywords: 'assiduite taux de presence absenteisme periode',
            },
            {
                label: 'Discipline',
                href: 'admin.discipline.index',
                icon: ShieldAlert,
                active: (c) => c.startsWith('admin.discipline'),
                permission: 'voir_discipline',
                keywords: 'sanctions avertissement blame exclusion conduite vie scolaire',
            },
        ],
    },
    {
        label: 'Structure pédagogique',
        icon: School,
        items: [
            {
                label: 'Formations',
                href: 'admin.formations.index',
                icon: GraduationCap,
                active: (c) => c.startsWith('admin.formations'),
                permission: 'voir_formations',
                keywords: 'filieres diplomes programmes cursus',
            },
            {
                label: 'Niveaux & règles de passage',
                href: 'admin.formation-levels.index',
                icon: Layers,
                active: (c) => c.startsWith('admin.formation-levels'),
                permission: 'voir_formations',
                keywords: 'progression annees passage redoublement seuils',
            },
            {
                label: 'Classes',
                href: 'admin.school-classes.index',
                icon: Group,
                active: (c) => c.startsWith('admin.school-classes'),
                permission: 'voir_classes',
                keywords: 'promotions groupes effectifs',
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
                label: 'Référentiel de compétences',
                href: 'admin.skills.index',
                icon: Gauge,
                active: (c) => c.startsWith('admin.skills'),
                permission: 'voir_formations',
                keywords: 'competences savoir-faire',
            },
            {
                label: 'Année académique',
                href: 'admin.academic-years.index',
                icon: CalendarDays,
                active: (c) => c.startsWith('admin.academic-years'),
                permission: 'voir_classes',
                keywords: 'annee scolaire periode semestres rentree',
            },
        ],
    },
    {
        label: 'Enseignement',
        icon: Presentation,
        items: [
            {
                label: 'Emploi du temps',
                href: 'admin.timetable.index',
                icon: Clock,
                active: (c) => c.startsWith('admin.timetable'),
                permission: 'voir_emploi_du_temps',
                keywords: 'planning horaires cours seances',
            },
            {
                label: 'Cahier de texte',
                href: 'admin.lesson-logs.index',
                icon: BookText,
                active: (c) => c.startsWith('admin.lesson-logs'),
                permission: 'voir_emploi_du_temps',
                keywords: 'cours contenu devoirs seances journal de classe',
            },
            {
                label: 'Ateliers pratiques',
                href: 'admin.practical-sessions.index',
                icon: ChefHat,
                active: (c) => c.startsWith('admin.practical-sessions'),
                permission: 'voir_salles',
                keywords: 'travaux pratiques seances cuisine tp',
            },
            {
                label: 'Fiches enseignants',
                href: 'admin.teachers.index',
                icon: Contact,
                active: (c) => c.startsWith('admin.teachers'),
                permission: 'voir_enseignants',
                keywords: 'professeurs formateurs intervenants vacataires',
            },
            {
                label: 'Salles',
                href: 'admin.rooms.index',
                icon: DoorOpen,
                active: (c) => c.startsWith('admin.rooms'),
                permission: 'voir_salles',
                keywords: 'locaux ateliers amphitheatre',
            },
            {
                label: 'Bibliothèque',
                href: 'admin.library.index',
                icon: Library,
                active: (c) => c.startsWith('admin.library'),
                permission: 'voir_formations',
                keywords: 'documents ressources livres supports de cours',
            },
        ],
    },
    {
        label: 'Évaluations & diplômes',
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
                label: 'Passation de classe',
                href: 'admin.class-promotion.index',
                icon: ArrowUpCircle,
                active: (c) => c.startsWith('admin.class-promotion'),
                permission: 'modifier_eleves',
                keywords: 'passage promotion redoublement fin d annee exclusion',
            },
            {
                label: 'Diplômes & attestations',
                href: 'admin.certificates.index',
                icon: BadgeCheck,
                active: (c) => c.startsWith('admin.certificates'),
                permission: 'voir_eleves',
                keywords: 'certificats attestations de stage remise',
            },
            {
                label: 'Conseils de classe',
                href: 'admin.councils.index',
                icon: Gavel,
                active: (c) => c.startsWith('admin.councils') || c.startsWith('admin.council-sittings'),
                permission: 'voir_conseils',
                keywords: 'conseil de classe deliberation decisions proces verbal pv seance appreciations',
            },
            {
                label: 'Actions de suivi',
                href: 'admin.follow-ups.index',
                icon: ClipboardList,
                active: (c) => c.startsWith('admin.follow-ups') && c !== 'admin.follow-ups.mine',
                permission: 'voir_conseils',
                keywords: 'conseil de classe suivi soutien entretien famille echeance responsable',
            },
            {
                label: 'Bilan des conseils',
                href: 'admin.council-dashboard.index',
                icon: ChartNoAxesCombined,
                active: (c) => c.startsWith('admin.council-dashboard'),
                permission: 'voir_conseils_direction',
                keywords: 'tableau de bord direction conseils de classe indicateurs decisions taux reussite actions de suivi',
            },
            {
                label: 'Réglages des conseils',
                href: 'admin.council-settings.index',
                icon: SlidersHorizontal,
                active: (c) => c.startsWith('admin.council-settings'),
                permission: 'voir_parametrage_conseils',
                keywords: 'conseil de classe decisions seuils alertes pastilles groupes de matieres validation recours',
            },
        ],
    },
    {
        label: 'Frais de scolarité',
        icon: CreditCard,
        items: [
            {
                label: 'Encaisser',
                href: 'admin.cashier.create',
                icon: HandCoins,
                active: (c) => c.startsWith('admin.cashier'),
                permission: 'ajouter_comptabilite',
                keywords: 'caisse guichet paiement mensualite scolarite recu wave orange money cheque',
            },
            {
                label: 'Factures',
                href: 'admin.invoices.index',
                icon: ReceiptText,
                active: (c) => c.startsWith('admin.invoices') && !invoiceFollowUps.includes(c),
                permission: 'voir_comptabilite',
                keywords: 'paiements scolarite frais recus mensualites inscription',
            },
            {
                label: 'Suivi des mensualités',
                href: 'admin.invoices.monthly',
                icon: CalendarRange,
                active: (c) => c === 'admin.invoices.monthly',
                permission: 'voir_comptabilite',
                keywords: 'mensualites mois a jour retards echeances tableau scolarite generer',
            },
            {
                label: 'Impayés',
                href: 'admin.invoices.overdue',
                icon: BellRing,
                active: (c) => c === 'admin.invoices.overdue',
                permission: 'voir_comptabilite',
                keywords: 'retards de paiement echeance relances relancer dettes arrieres soldes',
            },
            {
                label: 'Échéanciers',
                href: 'admin.payment-plans.index',
                icon: CalendarClock,
                active: (c) => c.startsWith('admin.payment-plans'),
                permission: 'voir_comptabilite',
                keywords: 'mensualites tranches paiement plans etalement echeance',
            },
            {
                label: 'Paiements en ligne',
                href: 'admin.online-payments.index',
                icon: Smartphone,
                active: (c) => c.startsWith('admin.online-payments'),
                permission: 'voir_comptabilite',
                keywords: 'wave orange money carte fournisseur tentatives anomalies reconcilier simulation',
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
        label: 'Comptabilité',
        icon: Calculator,
        items: [
            {
                label: 'Tableau de bord financier',
                href: 'admin.finance.dashboard',
                icon: Wallet,
                active: (c) => c === 'admin.finance.dashboard',
                permission: 'voir_comptabilite',
                keywords: 'finance tresorerie argent budget recettes depenses',
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
                label: 'Journal de caisse',
                href: 'admin.finance.cash-journal',
                icon: Vault,
                active: (c) => c === 'admin.finance.cash-journal',
                permission: 'voir_comptabilite',
                keywords: 'caisse tresorerie recettes depenses solde livre de caisse',
            },
            {
                label: 'Écritures comptables',
                href: 'admin.accounting.journal-entries.index',
                icon: FileSpreadsheet,
                active: (c) => c.startsWith('admin.accounting.journal-entries'),
                permission: 'voir_comptabilite',
                keywords: 'journal debit credit',
            },
            {
                label: 'Grand livre',
                href: 'admin.accounting.ledger',
                icon: BookMarked,
                active: (c) => c.startsWith('admin.accounting.ledger'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Balance générale',
                href: 'admin.accounting.trial-balance',
                icon: Scale,
                active: (c) => c.startsWith('admin.accounting.trial-balance'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Bilan',
                href: 'admin.accounting.balance-sheet',
                icon: Landmark,
                active: (c) => c.startsWith('admin.accounting.balance-sheet'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Compte de résultat',
                href: 'admin.accounting.income-statement',
                icon: TrendingUp,
                active: (c) => c.startsWith('admin.accounting.income-statement'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Plan comptable',
                href: 'admin.accounting.accounts.index',
                icon: ListTree,
                active: (c) => c.startsWith('admin.accounting.accounts'),
                permission: 'voir_comptabilite',
                keywords: 'comptes',
            },
        ],
    },
    {
        label: 'Stocks & achats',
        icon: Warehouse,
        items: [
            {
                label: 'Produits & stocks',
                href: 'admin.products.index',
                icon: Package,
                active: (c) => c.startsWith('admin.products') && c !== 'admin.products.movements',
                permission: 'voir_stocks',
                keywords: 'inventaire marchandises articles seuils alerte',
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
                label: 'Notes d\'information',
                href: 'admin.information-notes.index',
                icon: FileText,
                active: (c) => c.startsWith('admin.information-notes'),
                permission: 'voir_communication',
                keywords: 'note service circulaire direction pdf',
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
        label: 'Statistiques',
        icon: PieChart,
        items: [
            {
                label: 'Statistiques académiques',
                href: 'admin.statistics.academic',
                icon: LineChart,
                active: (c) => c === 'admin.statistics.academic',
                permission: 'voir_statistiques',
                keywords: 'indicateurs resultats',
            },
            {
                label: 'Statistiques financières',
                href: 'admin.statistics.financial',
                icon: BarChart3,
                active: (c) => c === 'admin.statistics.financial',
                permission: 'voir_statistiques',
                keywords: 'indicateurs recettes depenses recouvrement',
            },
            {
                label: 'Statistiques marketing',
                href: 'admin.statistics.marketing',
                icon: Target,
                active: (c) => c === 'admin.statistics.marketing',
                permission: 'voir_statistiques',
                keywords: 'indicateurs candidatures sources',
            },
            {
                label: 'Élèves à risque',
                href: 'admin.statistics.at-risk',
                icon: AlertTriangle,
                active: (c) => c === 'admin.statistics.at-risk',
                permission: 'voir_statistiques',
                keywords: 'decrochage alertes',
            },
            {
                label: 'Trafic',
                href: 'admin.statistics.traffic',
                icon: Activity,
                active: (c) => c === 'admin.statistics.traffic',
                permission: 'voir_statistiques',
                keywords: 'connexions visites',
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
