import { Link } from '@inertiajs/react';

interface Tab {
    key: string;
    label: string;
    /** Nom de la route Laravel. */
    href: string;
}

/**
 * Onglets d'une rubrique qui regroupe plusieurs pages du menu (même permission) : le menu reste court, la page voisine
 * est à un clic. Sur téléphone la rangée défile en travers ; l'onglet courant est annoncé aux lecteurs d'écran.
 */
function Tabs({ label, tabs, current }: { label: string; tabs: Tab[]; current: string }) {
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
];

export const FORMATION_TABS: Tab[] = [
    { key: 'formations', label: 'Formations', href: 'admin.formations.index' },
    { key: 'levels', label: 'Niveaux & règles de passage', href: 'admin.formation-levels.index' },
    { key: 'skills', label: 'Référentiel de compétences', href: 'admin.skills.index' },
];

export const TEACHING_TABS: Tab[] = [
    { key: 'timetable', label: 'Emploi du temps', href: 'admin.timetable.index' },
    { key: 'lesson-log', label: 'Cahier de texte', href: 'admin.lesson-logs.index' },
];

export const COUNCIL_TABS: Tab[] = [
    { key: 'councils', label: 'Conseils de classe', href: 'admin.councils.index' },
    { key: 'follow-ups', label: 'Actions de suivi', href: 'admin.follow-ups.index' },
];

export const PresenceTabs = ({ current }: { current: 'pointage' | 'register' | 'report' }) => <Tabs label="Présences" tabs={PRESENCE_TABS} current={current} />;
export const FormationTabs = ({ current }: { current: 'formations' | 'levels' | 'skills' }) => <Tabs label="Programmes" tabs={FORMATION_TABS} current={current} />;
export const TeachingTabs = ({ current }: { current: 'timetable' | 'lesson-log' }) => <Tabs label="Enseignement" tabs={TEACHING_TABS} current={current} />;
export const CouncilTabs = ({ current }: { current: 'councils' | 'follow-ups' }) => <Tabs label="Conseils de classe" tabs={COUNCIL_TABS} current={current} />;
