import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowUpCircle,
    Award,
    Building,
    CalendarClock,
    CalendarOff,
    BadgeCheck,
    BarChart3,
    BookOpen,
    BookText,
    Briefcase,
    Building2,
    Calculator,
    Calendar,
    ChevronLeft,
    CalendarDays,
    ChefHat,
    ChevronDown,
    LineChart,
    ClipboardCheck,
    Clock,
    Coins,
    DatabaseBackup,
    FileClock,
    DoorOpen,
    FileQuestion,
    FileSpreadsheet,
    GraduationCap,
    Handshake,
    IdCard,
    Image,
    KeyRound,
    Landmark,
    Library,
    LayoutDashboard,
    ListTree,
    LogOut,
    Mail,
    Medal,
    Megaphone,
    Menu,
    MessageSquare,
    Network,
    Newspaper,
    Package,
    PenSquare,
    Presentation,
    Quote,
    Receipt,
    Route,
    Scale,
    ScanLine,
    Settings,
    ShieldCheck,
    Target,
    Sliders,
    TrendingDown,
    TrendingUp,
    Truck,
    UserCog,
    Users,
    UsersRound,
    UserX,
    Wallet,
    X,
} from 'lucide-react';
import { PropsWithChildren, useState } from 'react';
import { PageProps } from '@/types';
import SiteLogo from '@/Components/SiteLogo';
import NotificationBell from '@/Components/NotificationBell';
import useAutoPushSubscribe from '@/hooks/useAutoPushSubscribe';

interface NavItem {
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    active: (current: string) => boolean;
    /** The "voir_x" permission required to see this item. Omit to show it to every staff role. */
    permission?: string;
}

interface NavGroup {
    label: string | null;
    icon?: typeof LayoutDashboard;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        label: null,
        items: [
            {
                label: 'Tableau de bord',
                href: 'admin.dashboard',
                icon: LayoutDashboard,
                active: (c) => c === 'admin.dashboard',
            },
        ],
    },
    {
        label: 'Admissions',
        icon: Megaphone,
        items: [
            {
                label: 'Candidatures',
                href: 'admin.candidatures.index',
                icon: Megaphone,
                active: (c) => c.startsWith('admin.candidatures'),
                permission: 'voir_candidatures',
            },
        ],
    },
    {
        label: 'Pédagogie — Structure',
        icon: GraduationCap,
        items: [
            {
                label: 'Formations',
                href: 'admin.formations.index',
                icon: GraduationCap,
                active: (c) => c.startsWith('admin.formations'),
                permission: 'voir_formations',
            },
            {
                label: 'Classes',
                href: 'admin.school-classes.index',
                icon: Presentation,
                active: (c) => c.startsWith('admin.school-classes'),
                permission: 'voir_classes',
            },
            {
                label: 'Matières',
                href: 'admin.subjects.index',
                icon: BookOpen,
                active: (c) => c.startsWith('admin.subjects'),
                permission: 'voir_matieres',
            },
            {
                label: 'Année académique',
                href: 'admin.academic-years.index',
                icon: CalendarDays,
                active: (c) => c.startsWith('admin.academic-years'),
                permission: 'voir_classes',
            },
            {
                label: 'Salles',
                href: 'admin.rooms.index',
                icon: DoorOpen,
                active: (c) => c.startsWith('admin.rooms'),
                permission: 'voir_salles',
            },
            {
                label: 'Bibliothèque',
                href: 'admin.library.index',
                icon: Library,
                active: (c) => c.startsWith('admin.library'),
                permission: 'voir_formations',
            },
        ],
    },
    {
        label: 'Pédagogie — Scolarité',
        icon: Users,
        items: [
            {
                label: 'Élèves',
                href: 'admin.students.index',
                icon: IdCard,
                active: (c) => c.startsWith('admin.students'),
                permission: 'voir_eleves',
            },
            {
                label: 'Passation de classe',
                href: 'admin.class-promotion.index',
                icon: ArrowUpCircle,
                active: (c) => c.startsWith('admin.class-promotion'),
                permission: 'modifier_eleves',
            },
            {
                label: 'Emploi du temps',
                href: 'admin.timetable.index',
                icon: Clock,
                active: (c) => c.startsWith('admin.timetable'),
                permission: 'voir_emploi_du_temps',
            },
            {
                label: 'Pointage des élèves',
                href: 'admin.pointage.index',
                icon: ClipboardCheck,
                // Excludes .register: that has its own nav item below and must not
                // also light up "Pointage des élèves" (they share the admin.pointage
                // route-name prefix).
                active: (c) =>
                    (c.startsWith('admin.pointage') || c.startsWith('admin.attendance')) &&
                    !c.includes('.register'),
                permission: 'voir_presences',
            },
            {
                label: 'Scanner les cartes (entrée)',
                href: 'admin.borne.pointage.gate',
                icon: ScanLine,
                active: (c) => c.startsWith('admin.borne.pointage'),
                permission: 'ajouter_presences',
            },
            {
                label: "Registre d'absence",
                href: 'admin.pointage.register',
                icon: UserX,
                active: (c) => c.startsWith('admin.pointage.register') || c.startsWith('admin.attendance.register'),
                permission: 'voir_presences',
            },
            {
                label: 'Ateliers pratiques',
                href: 'admin.practical-sessions.index',
                icon: ChefHat,
                active: (c) => c.startsWith('admin.practical-sessions'),
                permission: 'voir_salles',
            },
        ],
    },
    {
        label: 'Pédagogie — Évaluation',
        icon: Award,
        items: [
            {
                label: 'Examens & devoirs',
                href: 'admin.exams.index',
                icon: PenSquare,
                active: (c) => c.startsWith('admin.exams'),
                permission: 'voir_examens',
            },
            {
                label: 'Bulletins',
                href: 'admin.report-cards.index',
                icon: Award,
                active: (c) => c.startsWith('admin.report-cards'),
                permission: 'voir_bulletins',
            },
            {
                label: 'Diplômes & attestations',
                href: 'admin.certificates.index',
                icon: BadgeCheck,
                active: (c) => c.startsWith('admin.certificates'),
                permission: 'voir_eleves',
            },
            {
                label: 'Référentiel de compétences',
                href: 'admin.skills.index',
                icon: Medal,
                active: (c) => c.startsWith('admin.skills'),
                permission: 'voir_formations',
            },
            {
                label: 'Niveaux & règles de passage',
                href: 'admin.formation-levels.index',
                icon: Medal,
                active: (c) => c.startsWith('admin.formation-levels'),
                permission: 'voir_formations',
            },
            {
                label: 'Évaluations de compétences',
                href: 'admin.skill-assessments.index',
                icon: ClipboardCheck,
                active: (c) => c.startsWith('admin.skill-assessments'),
                permission: 'voir_notes',
            },
        ],
    },
    {
        label: 'Enseignants',
        icon: UserCog,
        items: [
            {
                label: 'Fiches enseignants',
                href: 'admin.teachers.index',
                icon: UsersRound,
                active: (c) => c.startsWith('admin.teachers'),
                permission: 'voir_enseignants',
            },
            {
                label: 'Cahier de texte',
                href: 'admin.lesson-logs.index',
                icon: BookText,
                active: (c) => c.startsWith('admin.lesson-logs'),
                permission: 'voir_emploi_du_temps',
            },
        ],
    },
    {
        label: 'Finance & stocks',
        icon: Wallet,
        items: [
            {
                label: 'Finance',
                href: 'admin.finance.dashboard',
                icon: Wallet,
                active: (c) => c.startsWith('admin.finance'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Factures',
                href: 'admin.invoices.index',
                icon: Receipt,
                active: (c) => c.startsWith('admin.invoices'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Échéanciers',
                href: 'admin.payment-plans.index',
                icon: CalendarClock,
                active: (c) => c.startsWith('admin.payment-plans'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Dépenses',
                href: 'admin.expenses.index',
                icon: TrendingDown,
                active: (c) => c.startsWith('admin.expenses'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Fournisseurs',
                href: 'admin.suppliers.index',
                icon: Truck,
                active: (c) => c.startsWith('admin.suppliers'),
                permission: 'voir_stocks',
            },
            {
                label: 'Produits & stocks',
                href: 'admin.products.index',
                icon: Package,
                active: (c) => c.startsWith('admin.products'),
                permission: 'voir_stocks',
            },
        ],
    },
    {
        label: 'Comptabilité',
        icon: Calculator,
        items: [
            {
                label: 'Balance générale',
                href: 'admin.accounting.trial-balance',
                icon: Scale,
                active: (c) => c === 'admin.accounting.trial-balance',
                permission: 'voir_comptabilite',
            },
            {
                label: 'Bilan',
                href: 'admin.accounting.balance-sheet',
                icon: Landmark,
                active: (c) => c === 'admin.accounting.balance-sheet',
                permission: 'voir_comptabilite',
            },
            {
                label: 'Compte de résultat',
                href: 'admin.accounting.income-statement',
                icon: TrendingUp,
                active: (c) => c === 'admin.accounting.income-statement',
                permission: 'voir_comptabilite',
            },
            {
                label: 'Écritures comptables',
                href: 'admin.accounting.journal-entries.index',
                icon: FileSpreadsheet,
                active: (c) => c.startsWith('admin.accounting.journal-entries'),
                permission: 'voir_comptabilite',
            },
            {
                label: 'Grand livre',
                href: 'admin.accounting.ledger',
                icon: BookText,
                active: (c) => c === 'admin.accounting.ledger',
                permission: 'voir_comptabilite',
            },
            {
                label: 'Plan comptable',
                href: 'admin.accounting.accounts.index',
                icon: ListTree,
                active: (c) => c.startsWith('admin.accounting.accounts'),
                permission: 'voir_comptabilite',
            },
        ],
    },
    {
        label: 'Insertion professionnelle',
        icon: Briefcase,
        items: [
            {
                label: 'Offres de stage',
                href: 'admin.internship-offers.index',
                icon: Briefcase,
                active: (c) => c.startsWith('admin.internship-offers'),
                permission: 'voir_insertion',
            },
            {
                label: 'Stages des élèves',
                href: 'admin.internships.index',
                icon: Route,
                active: (c) => c.startsWith('admin.internships'),
                permission: 'voir_insertion',
            },
            {
                label: "Offres d'emploi",
                href: 'admin.job-offers.index',
                icon: Building2,
                active: (c) => c.startsWith('admin.job-offers'),
                permission: 'voir_insertion',
            },
        ],
    },
    {
        label: 'Site public',
        icon: Newspaper,
        items: [
            {
                label: 'Actualités',
                href: 'admin.news.index',
                icon: Newspaper,
                active: (c) => c.startsWith('admin.news'),
                permission: 'voir_actualites',
            },
            {
                label: 'Événements',
                href: 'admin.events.index',
                icon: Calendar,
                active: (c) => c.startsWith('admin.events'),
                permission: 'voir_evenements',
            },
            {
                label: 'Galerie',
                href: 'admin.galleries.index',
                icon: Image,
                active: (c) => c.startsWith('admin.galleries'),
                permission: 'voir_galerie',
            },
            {
                label: 'Partenaires',
                href: 'admin.partners.index',
                icon: Handshake,
                active: (c) => c.startsWith('admin.partners'),
                permission: 'voir_partenaires',
            },
            {
                label: 'Témoignages',
                href: 'admin.testimonials.index',
                icon: Quote,
                active: (c) => c.startsWith('admin.testimonials'),
                permission: 'voir_temoignages',
            },
            {
                label: 'Slider accueil',
                href: 'admin.sliders.index',
                icon: Sliders,
                active: (c) => c.startsWith('admin.sliders'),
                permission: 'voir_communication',
            },
            {
                label: 'FAQ',
                href: 'admin.faqs.index',
                icon: FileQuestion,
                active: (c) => c.startsWith('admin.faqs'),
                permission: 'voir_faq',
            },
        ],
    },
    {
        label: 'Communication',
        icon: MessageSquare,
        items: [
            {
                label: 'Messages',
                href: 'admin.messages.index',
                icon: MessageSquare,
                active: (c) => c.startsWith('admin.messages'),
                permission: 'voir_communication',
            },
            {
                label: 'Messagerie',
                href: 'admin.mail.index',
                icon: Mail,
                active: (c) => c.startsWith('admin.mail'),
                permission: 'voir_communication',
            },
            {
                label: 'Annonces officielles',
                href: 'admin.announcements.index',
                icon: Megaphone,
                active: (c) => c.startsWith('admin.announcements'),
                permission: 'voir_communication',
            },
            {
                label: 'Discussions de classe',
                href: 'admin.class-discussions.index',
                icon: MessageSquare,
                active: (c) => c.startsWith('admin.class-discussions'),
                permission: 'voir_communication',
            },
        ],
    },
    {
        label: 'Statistiques',
        icon: BarChart3,
        items: [
            {
                label: 'Statistiques académiques',
                href: 'admin.statistics.academic',
                icon: LineChart,
                active: (c) => c === 'admin.statistics.academic',
                permission: 'voir_statistiques',
            },
            {
                label: 'Statistiques financières',
                href: 'admin.statistics.financial',
                icon: BarChart3,
                active: (c) => c === 'admin.statistics.financial',
                permission: 'voir_statistiques',
            },
            {
                label: 'Statistiques marketing',
                href: 'admin.statistics.marketing',
                icon: Target,
                active: (c) => c === 'admin.statistics.marketing',
                permission: 'voir_statistiques',
            },
            {
                label: 'Élèves à risque',
                href: 'admin.statistics.at-risk',
                icon: AlertTriangle,
                active: (c) => c === 'admin.statistics.at-risk',
                permission: 'voir_statistiques',
            },
            {
                label: 'Trafic',
                href: 'admin.statistics.traffic',
                icon: Activity,
                active: (c) => c === 'admin.statistics.traffic',
                permission: 'voir_statistiques',
            },
        ],
    },
    {
        label: 'Ressources Humaines',
        icon: UsersRound,
        items: [
            {
                label: 'Tableau de bord RH',
                href: 'admin.hr.index',
                icon: Building,
                active: (c) => c === 'admin.hr.index',
                permission: 'voir_utilisateurs',
            },
            {
                label: 'Personnel administratif',
                href: 'admin.users.index',
                icon: Users,
                active: (c) => c.startsWith('admin.users'),
                permission: 'voir_utilisateurs',
            },
            {
                label: 'Salaires',
                href: 'admin.salaries.index',
                icon: Coins,
                active: (c) => c.startsWith('admin.salaries'),
                permission: 'voir_salaires',
            },
            {
                label: 'Organigramme',
                href: 'admin.org-chart.index',
                icon: Network,
                active: (c) => c.startsWith('admin.org-chart'),
                permission: 'voir_organigramme',
            },
            {
                label: 'Rôles & permissions',
                href: 'admin.roles.index',
                icon: ShieldCheck,
                active: (c) => c.startsWith('admin.roles'),
                permission: 'voir_roles',
            },
            {
                label: 'Congés',
                href: 'admin.leave.index',
                icon: CalendarOff,
                active: (c) => c.startsWith('admin.leave'),
                // No permission gate: self-service (own requests), like admin.dashboard.
                // Approve/reject is gated inside the controller.
            },
        ],
    },
    {
        label: 'Administration',
        icon: ShieldCheck,
        items: [
            {
                label: "Journal d'activité",
                href: 'admin.activity-log.index',
                icon: FileClock,
                active: (c) => c.startsWith('admin.activity-log'),
                permission: 'voir_activite',
            },
            {
                label: 'Paramètres',
                href: 'admin.settings.edit',
                icon: Settings,
                active: (c) => c.startsWith('admin.settings'),
                permission: 'voir_parametres',
            },
            {
                label: 'Sauvegardes',
                href: 'admin.backups.index',
                icon: DatabaseBackup,
                active: (c) => c.startsWith('admin.backups'),
                permission: 'voir_sauvegardes',
            },
        ],
    },
];

function FlashBanner({
    message,
    tone,
}: {
    message: string;
    tone: 'success' | 'error';
}) {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;

    const toneClasses =
        tone === 'success'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-red-50 text-red-700';

    return (
        <div
            className={`mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium animate-fade-in-up sm:mx-6 ${toneClasses}`}
        >
            <span>{message}</span>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Fermer"
                className="rounded-md p-1 transition-colors hover:bg-black/5"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function AdminLayout({ children }: PropsWithChildren) {
    const { props, component } = usePage<PageProps>();
    const { auth, flash } = props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useAutoPushSubscribe();
    const currentRoute = route().current() ?? component;
    const visibleGroups = navGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => !item.permission || auth.permissions?.includes(item.permission)),
        }))
        .filter((group) => group.items.length > 0);

    const [openGroup, setOpenGroup] = useState<string | null>(
        () =>
            visibleGroups.find((g) => g.label && g.items.some((item) => item.active(currentRoute as string)))
                ?.label ?? null,
    );
    const toggleGroup = (label: string) => {
        setOpenGroup((prev) => (prev === label ? null : label));
    };

    const SidebarContent = (
        <>
            <div className="flex h-16 items-center gap-2.5 px-5">
                <SiteLogo size={36} tone="gold" />
                <div className="flex flex-col leading-tight">
                    <span className="font-serif text-sm font-bold text-white">
                        EEHT Admin
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-ink-400">
                        Gestion intégrée
                    </span>
                </div>
            </div>
            <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {visibleGroups.map((group) => {
                    if (!group.label) {
                        return group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.active(currentRoute as string);
                            return (
                                <Link
                                    key={item.href}
                                    href={route(item.href)}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                                        isActive
                                            ? 'bg-gold-500 text-ink-900'
                                            : 'text-ink-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Icon className="h-4.5 w-4.5 shrink-0" />
                                    {item.label}
                                </Link>
                            );
                        });
                    }

                    const GroupIcon = group.icon ?? LayoutDashboard;
                    const isOpen = openGroup === group.label;
                    const hasActiveChild = group.items.some((item) => item.active(currentRoute as string));

                    return (
                        <div key={group.label} className="pb-1">
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.label as string)}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                                    isOpen
                                        ? 'bg-white/5 text-white'
                                        : hasActiveChild
                                          ? 'text-gold-400'
                                          : 'text-ink-300 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <GroupIcon className="h-4.5 w-4.5 shrink-0" />
                                <span className="flex-1 text-left">{group.label}</span>
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-fluid ${isOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            <div
                                className={`grid transition-all duration-300 ease-fluid ${
                                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                }`}
                            >
                                <div className="overflow-hidden">
                                    <div className="mt-1 space-y-0.5 rounded-lg bg-black/25 p-1.5 shadow-inner shadow-black/20 ring-1 ring-inset ring-white/5">
                                        {group.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = item.active(currentRoute as string);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={route(item.href)}
                                                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                                                        isActive
                                                            ? 'bg-gold-500 text-ink-900'
                                                            : 'text-ink-300 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    <Icon className="h-4 w-4 shrink-0" />
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>
            <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-sm font-semibold text-white">
                        {auth.user?.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                            {auth.user?.name}
                        </p>
                        <p className="truncate text-xs text-ink-400">
                            {auth.roles?.[0]}
                        </p>
                    </div>
                </div>
                <Link
                    href={route('admin.password')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-300 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                >
                    <KeyRound className="h-4 w-4" /> Mot de passe
                </Link>
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-300 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                >
                    <LogOut className="h-4 w-4" /> Déconnexion
                </Link>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-ink-50">
            <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink-900 lg:flex">
                {SidebarContent}
            </aside>

            <div
                className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}
                aria-hidden={!sidebarOpen}
            >
                <div
                    className={`absolute inset-0 bg-ink-950/60 transition-opacity duration-300 ease-fluid ${
                        sidebarOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                />
                <aside
                    className={`absolute inset-y-0 left-0 flex w-64 transform flex-col bg-ink-900 transition-transform duration-300 ease-fluid ${
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <button
                        className="absolute right-3 top-4 rounded-md p-1 text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Fermer le menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    {SidebarContent}
                </aside>
            </div>

            <div className="flex flex-1 flex-col lg:pl-64">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white px-4 sm:px-6">
                    <div className="flex items-center gap-1 lg:hidden">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Ouvrir le menu"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        {!route().current('admin.dashboard') && (
                            <button
                                onClick={() => window.history.back()}
                                aria-label="Retour"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <div className="hidden text-sm text-ink-500 lg:block">
                        Plateforme de gestion intégrée — EEHT de Thiès
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell href={route('admin.mail.index')} />
                        <Link
                            href={route('home')}
                            className="text-sm font-medium text-ink-600 transition-colors duration-150 hover:text-gold-600"
                        >
                            Voir le site public →
                        </Link>
                    </div>
                </header>

                {flash?.success && (
                    <FlashBanner message={flash.success} tone="success" />
                )}
                {flash?.error && (
                    <FlashBanner message={flash.error} tone="error" />
                )}

                <main className="flex-1 px-4 py-6 sm:px-6 lg:py-8">
                    <div key={currentRoute as string} className="animate-fade-in-up">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
