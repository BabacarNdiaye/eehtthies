import { Link } from '@inertiajs/react';

const tabs = [
    { key: 'invoices', label: 'Factures', href: 'admin.invoices.index' },
    { key: 'monthly', label: 'Mensualités', href: 'admin.invoices.monthly' },
    { key: 'overdue', label: 'Impayés', href: 'admin.invoices.overdue' },
    { key: 'plans', label: 'Échéanciers', href: 'admin.payment-plans.index' },
    { key: 'online', label: 'Paiements en ligne', href: 'admin.online-payments.index' },
] as const;

export type FinanceTab = (typeof tabs)[number]['key'];

/**
 * Onglets du suivi des élèves (une seule rubrique « Factures & suivi » dans le menu). Sur téléphone la rangée défile en
 * travers ; l'onglet courant est annoncé aux lecteurs d'écran (aria-current).
 */
export default function FinanceTabs({ current }: { current: FinanceTab }) {
    return (
        <nav aria-label="Suivi des factures" className="scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
