import { Link } from '@inertiajs/react';

const tabs = [
    { key: 'academic', label: 'Académique', href: 'admin.statistics.academic' },
    { key: 'financial', label: 'Financier', href: 'admin.statistics.financial' },
    { key: 'marketing', label: 'Marketing', href: 'admin.statistics.marketing' },
    { key: 'at-risk', label: 'Élèves à risque', href: 'admin.statistics.at-risk' },
    { key: 'traffic', label: 'Trafic', href: 'admin.statistics.traffic' },
] as const;

export type StatisticsTab = (typeof tabs)[number]['key'];

/**
 * Onglets des cinq pages de statistiques (une page par sujet). Sur téléphone la rangée défile en travers au lieu de
 * passer sur deux lignes ; l'onglet courant est annoncé aux lecteurs d'écran (aria-current).
 */
export default function StatisticsTabs({ current }: { current: StatisticsTab }) {
    return (
        <nav aria-label="Rubriques des statistiques" className="scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-2 whitespace-nowrap sm:flex-wrap">
                {tabs.map((tab) => (
                    <li key={tab.key}>
                        <Link
                            href={route(tab.href)}
                            aria-current={tab.key === current ? 'page' : undefined}
                            className={`inline-flex min-h-10 items-center rounded-lg border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                tab.key === current
                                    ? 'border-ink-900 bg-ink-900 text-white'
                                    : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
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
