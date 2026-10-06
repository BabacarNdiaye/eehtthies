import NotificationBell from '@/Components/NotificationBell';
import { Crumbs } from '@/lib/adminNav';
import { Link } from '@inertiajs/react';
import { ChevronRight, Search } from 'lucide-react';

interface Props {
    crumbs: Crumbs;
    onSearch: () => void;
}

/** Barre haute d'ordinateur (≥ lg) : fil d'Ariane à gauche ; recherche (Ctrl/⌘ K), cloche et site public à droite. */
export default function DesktopTopBar({ crumbs, onSearch }: Props) {
    const shortcut = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';
    const trail: { label: string; href?: string }[] = [
        ...(crumbs.group ? [{ label: crumbs.group }] : []),
        ...(crumbs.item ? [{ label: crumbs.item.label, href: crumbs.isSubPage ? route(crumbs.item.href) : undefined }] : []),
        ...(crumbs.leaf ? [{ label: crumbs.leaf }] : []),
    ];

    if (trail.length === 0) trail.push({ label: 'Administration' });

    return (
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-4 border-b border-ink-100/80 bg-white/80 px-6 backdrop-blur-xl lg:flex">
            <nav aria-label="Fil d'Ariane" className="min-w-0">
                <ol className="flex items-center gap-1.5 text-sm text-ink-500">
                    {trail.map((crumb, index) => {
                        const last = index === trail.length - 1;

                        return (
                            <li key={index} className="flex min-w-0 items-center gap-1.5">
                                {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden="true" />}
                                {crumb.href && !last ? (
                                    <Link href={crumb.href} className="truncate hover:text-ink-900 hover:underline">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span aria-current={last ? 'page' : undefined} className={`truncate ${last ? 'font-medium text-ink-900' : ''}`}>
                                        {crumb.label}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>

            <div className="flex shrink-0 items-center gap-3">
                <button
                    type="button"
                    onClick={onSearch}
                    aria-haspopup="dialog"
                    className="flex h-10 w-72 items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/80 px-3 text-sm text-ink-500 outline-none transition-colors hover:border-ink-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate text-left">Rechercher une page…</span>
                    <kbd className="rounded border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-500">
                        {shortcut}
                    </kbd>
                </button>
                <NotificationBell href={route('connect.index')} />
                <Link href={route('home')} className="rounded-lg px-2 py-1 text-sm font-medium text-ink-600 outline-none transition-colors duration-150 hover:text-gold-700 focus-visible:ring-2 focus-visible:ring-gold-500">
                    Voir le site public →
                </Link>
            </div>
        </header>
    );
}
