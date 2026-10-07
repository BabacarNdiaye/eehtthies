import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';

interface Tab {
    key: string;
    label: string;
    /** Nom de la route Laravel. */
    href: string;
    /** Permission nécessaire pour voir l'onglet (absente : celle de la rubrique suffit). */
    permission?: string;
}

/**
 * Onglets d'une rubrique qui regroupe plusieurs pages du menu (même permission) : le menu reste court, la page voisine
 * est à un clic. Sur téléphone la rangée défile en travers ; l'onglet courant est annoncé aux lecteurs d'écran.
 */
function Tabs({ label, tabs, current }: { label: string; tabs: Tab[]; current: string }) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    tabs = tabs.filter((tab) => tab.key === current || !tab.permission || permissions.includes(tab.permission));

    return (
        <nav aria-label={label} className="scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-2 whitespace-nowrap sm:flex-wrap">
                {tabs.map((tab) => (
                    <li key={tab.key}>
                        <Link
                            href={route(tab.href)}
                            aria-current={tab.key === current ? 'page' : undefined}
                            className={`inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                tab.key === current ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export const PRESENCE_TABS: Tab[] = [
    { key: 'pointage', label: 'Pointage', href: 'admin.pointage.index' },
    { key: 'register', label: "Registre d'absences", href: 'admin.pointage.register' },
    { key: 'report', label: 'Statistiques', href: 'admin.pointage.report' },
    { key: 'gate', label: "Scanner les cartes (entrée)", href: 'admin.borne.pointage.gate', permission: 'ajouter_presences' },
];

export const FORMATION_TABS: Tab[] = [
    { key: 'formations', label: 'Formations', href: 'admin.formations.index' },
    { key: 'levels', label: 'Niveaux & règles de passage', href: 'admin.formation-levels.index' },
    { key: 'skills', label: 'Référentiel de compétences', href: 'admin.skills.index' },
    { key: 'library', label: 'Bibliothèque', href: 'admin.library.index' },
];

export const TEACHING_TABS: Tab[] = [
    { key: 'timetable', label: 'Emploi du temps', href: 'admin.timetable.index' },
    { key: 'lesson-log', label: 'Cahier de texte', href: 'admin.lesson-logs.index' },
];

export const COUNCIL_TABS: Tab[] = [
    { key: 'councils', label: 'Conseils de classe', href: 'admin.councils.index' },
    { key: 'follow-ups', label: 'Actions de suivi', href: 'admin.follow-ups.index' },
    { key: 'dashboard', label: 'Bilan des conseils', href: 'admin.council-dashboard.index', permission: 'voir_conseils_direction' },
    { key: 'settings', label: 'Réglages', href: 'admin.council-settings.index', permission: 'voir_parametrage_conseils' },
];

export const STUDENT_TABS: Tab[] = [
    { key: 'students', label: 'Élèves', href: 'admin.students.index' },
    { key: 'online', label: 'En ligne', href: 'admin.students.online' },
];

export const CLASS_TABS: Tab[] = [
    { key: 'classes', label: 'Classes', href: 'admin.school-classes.index' },
    { key: 'years', label: 'Années académiques', href: 'admin.academic-years.index' },
];

export const ROOM_TABS: Tab[] = [
    { key: 'rooms', label: 'Salles', href: 'admin.rooms.index' },
    { key: 'workshops', label: 'Ateliers pratiques', href: 'admin.practical-sessions.index' },
];

export const PresenceTabs = ({ current }: { current: 'pointage' | 'register' | 'report' | 'gate' }) => <Tabs label="Présences" tabs={PRESENCE_TABS} current={current} />;
export const FormationTabs = ({ current }: { current: 'formations' | 'levels' | 'skills' | 'library' }) => <Tabs label="Programmes" tabs={FORMATION_TABS} current={current} />;
export const TeachingTabs = ({ current }: { current: 'timetable' | 'lesson-log' }) => <Tabs label="Enseignement" tabs={TEACHING_TABS} current={current} />;
export const CouncilTabs = ({ current }: { current: 'councils' | 'follow-ups' | 'dashboard' | 'settings' }) => <Tabs label="Conseils de classe" tabs={COUNCIL_TABS} current={current} />;
export const StudentTabs = ({ current }: { current: 'students' | 'online' }) => <Tabs label="Élèves" tabs={STUDENT_TABS} current={current} />;
export const ClassTabs = ({ current }: { current: 'classes' | 'years' }) => <Tabs label="Classes" tabs={CLASS_TABS} current={current} />;
export const RoomTabs = ({ current }: { current: 'rooms' | 'workshops' }) => <Tabs label="Salles et ateliers" tabs={ROOM_TABS} current={current} />;
