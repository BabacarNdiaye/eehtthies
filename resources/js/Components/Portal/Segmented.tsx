import { haptic } from '@/lib/portal';
import { LucideIcon } from 'lucide-react';

export interface SegmentedTab<T extends string> {
    key: T;
    label: string;
    icon?: LucideIcon;
    badge?: string | number | null;
}

/**
 * Onglets en pastilles (contrôle segmenté) : sur téléphone ils restent accrochés sous l'en-tête compact pendant
 * le défilement de la liste. Navigation au clavier : flèches gauche/droite.
 */
export default function Segmented<T extends string>({
    tabs,
    value,
    onChange,
    label,
}: {
    tabs: SegmentedTab<T>[];
    value: T;
    onChange: (key: T) => void;
    label: string;
}) {
    const select = (key: T) => {
        if (key !== value) {
            haptic();
            onChange(key);
        }
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        const index = tabs.findIndex((tab) => tab.key === value);

        if (event.key === 'ArrowRight') select(tabs[(index + 1) % tabs.length].key);
        if (event.key === 'ArrowLeft') select(tabs[(index - 1 + tabs.length) % tabs.length].key);
    };

    return (
        <div
            role="tablist"
            aria-label={label}
            onKeyDown={onKeyDown}
            className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-20 -mx-4 mb-5 bg-ink-50/90 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
        >
            <div className="flex gap-1 rounded-full bg-white p-1 shadow-soft ring-1 ring-ink-100">
                {tabs.map((tab) => {
                    const active = tab.key === value;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            id={`tab-${tab.key}`}
                            aria-selected={active}
                            aria-controls={`panel-${tab.key}`}
                            tabIndex={active ? 0 : -1}
                            onClick={() => select(tab.key)}
                            className={`relative flex min-h-[2.75rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-leaf-500 sm:flex-row sm:gap-2 sm:text-sm ${
                                active ? 'bg-leaf-500 text-ink-900 shadow' : 'text-ink-500 active:bg-ink-50'
                            }`}
                        >
                            {Icon && <Icon className="h-[18px] w-[18px]" />}
                            <span className="leading-none">{tab.label}</span>
                            {tab.badge ? (
                                <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                                    {tab.badge}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
