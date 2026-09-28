import { Link } from '@inertiajs/react';

type TabKey = 'accounts' | 'journal-entries' | 'ledger' | 'trial-balance' | 'balance-sheet' | 'income-statement';

const tabs: { key: TabKey; label: string; route: string }[] = [
    { key: 'journal-entries', label: 'Écritures', route: 'admin.accounting.journal-entries.index' },
    { key: 'ledger', label: 'Grand livre', route: 'admin.accounting.ledger' },
    { key: 'trial-balance', label: 'Balance générale', route: 'admin.accounting.trial-balance' },
    { key: 'balance-sheet', label: 'Bilan', route: 'admin.accounting.balance-sheet' },
    { key: 'income-statement', label: 'Compte de résultat', route: 'admin.accounting.income-statement' },
    { key: 'accounts', label: 'Plan comptable', route: 'admin.accounting.accounts.index' },
];

export default function AccountingTabs({ current }: { current: TabKey }) {
    return (
        <div className="mb-6 flex flex-wrap gap-1 border-b border-ink-100">
            {tabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={route(tab.route)}
                    className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                        current === tab.key
                            ? 'border-b-2 border-gold-500 text-ink-900'
                            : 'text-ink-400 hover:text-ink-700'
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}
