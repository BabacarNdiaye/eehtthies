import { haptic } from '@/lib/portal';
import { Link } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface BarTab {
    key: string;
    label: string;
    icon: LucideIcon;
    href?: string;
    active?: boolean;
    badge?: number;
    onClick?: () => void;
}

const slotClass =
    'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-leaf-400';

function TabBody({ tab }: { tab: BarTab }) {
    const Icon = tab.icon;

    return (
        <>
            <span
                className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200 ${
                    tab.active ? 'bg-leaf-500 text-ink-900 shadow-lg shadow-leaf-500/30' : 'text-ink-200'
                }`}
            >
                <Icon className="h-[22px] w-[22px]" strokeWidth={tab.active ? 2.4 : 2} />
                {tab.badge ? (
                    <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-ink-900">
                        {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                ) : null}
            </span>
            <span className={`text-[10.5px] leading-none ${tab.active ? 'font-bold text-white' : 'font-medium text-ink-300'}`}>
                {tab.label}
            </span>
        </>
    );
}

function Slot({ tab }: { tab: BarTab }) {
    if (tab.href) {
        return (
            <Link href={tab.href} onClick={() => haptic()} aria-current={tab.active ? 'page' : undefined} className={slotClass}>
                <TabBody tab={tab} />
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={() => {
                haptic();
                tab.onClick?.();
            }}
            aria-haspopup={tab.key === 'menu' ? 'dialog' : undefined}
            className={slotClass}
        >
            <TabBody tab={tab} />
        </button>
    );
}

/** Action centrale surélevée (« Ma carte », « Appel »). */
function CenterAction({ tab }: { tab: BarTab }) {
    const Icon = tab.icon;
    const body = (
        <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-leaf-400 to-leaf-600 text-ink-900 shadow-lg shadow-leaf-500/40 ring-4 ring-ink-900">
                <Icon className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <span className="text-[10.5px] font-bold leading-none text-white">{tab.label}</span>
        </>
    );
    const className = '-mt-7 flex flex-1 flex-col items-center gap-1 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-leaf-400 rounded-2xl';

    return tab.href ? (
        <Link href={tab.href} onClick={() => haptic(12)} className={className}>
            {body}
        </Link>
    ) : (
        <button
            type="button"
            onClick={() => {
                haptic(12);
                tab.onClick?.();
            }}
            className={className}
        >
            {body}
        </button>
    );
}

/**
 * Barre de navigation flottante du bas (téléphone et tablette). `center` s'insère au milieu des onglets, surélevé.
 */
export default function BottomBar({ tabs, center }: { tabs: BarTab[]; center?: BarTab }) {
    const half = Math.ceil(tabs.length / 2);
    const left = center ? tabs.slice(0, half) : tabs;
    const right = center ? tabs.slice(half) : [];

    return (
        <nav
            aria-label="Navigation principale"
            className="fixed inset-x-3 z-40 lg:hidden"
            style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
            <div className="flex items-end rounded-[1.75rem] bg-ink-900/95 px-2 py-1.5 shadow-elevated ring-1 ring-white/10 backdrop-blur-xl">
                {left.map((tab) => (
                    <Slot key={tab.key} tab={tab} />
                ))}
                {center && <CenterAction tab={center} />}
                {right.map((tab) => (
                    <Slot key={tab.key} tab={tab} />
                ))}
            </div>
        </nav>
    );
}
