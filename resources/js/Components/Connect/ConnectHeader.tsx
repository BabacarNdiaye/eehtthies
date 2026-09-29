import { Link, usePage } from '@inertiajs/react';
import { Bell, ChevronDown, KeyRound, LayoutDashboard, LogOut, Menu, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageProps } from '@/types';
import SiteLogo from '@/Components/SiteLogo';
import Avatar from './Avatar';
import { ConnectLinks, Profile } from './types';

const navigation = [
    { name: 'Accueil', href: 'home' },
    { name: 'Formations', href: 'formations.index' },
    { name: 'Actualités', href: 'news.index' },
    { name: 'Événements', href: 'events.index' },
    { name: 'Galerie', href: 'gallery.index' },
];

export default function ConnectHeader({
    me,
    links,
    unread,
    search,
    onSearch,
    onOpenSidebar,
    onBell,
}: {
    me: Profile;
    links: ConnectLinks;
    unread: number;
    search: string;
    onSearch: (value: string) => void;
    onOpenSidebar: () => void;
    onBell: () => void;
}) {
    const { siteSettings } = usePage<PageProps>().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <header className="relative z-30 flex h-16 shrink-0 items-stretch border-b border-ink-100 bg-white">
            <div className="flex shrink-0 items-center gap-3 bg-ink-900 px-4 text-white lg:w-[244px] lg:px-5 xl:w-auto xl:min-w-[244px] xl:pr-10">
                <button
                    onClick={onOpenSidebar}
                    className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 lg:hidden"
                    aria-label="Ouvrir le menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <Link href={route('home')} className="flex items-center gap-3">
                    <SiteLogo size={38} tone="gold" />
                    <span className="font-serif text-2xl font-bold tracking-wide">{(siteSettings.site_short_name || 'EEHT').split(' ')[0]}</span>
                    <span className="hidden h-8 w-px bg-gold-500/60 xl:block" />
                    <span className="hidden flex-col whitespace-nowrap leading-tight xl:flex">
                        <span className="text-[10px] text-white/90">Élite École Hôtelière</span>
                        <span className="text-[10px] text-white/90">et Touristique</span>
                        <span className="text-[10px] text-gold-400">Thiès</span>
                    </span>
                </Link>
            </div>

            <nav className="hidden flex-1 items-stretch justify-center gap-7 px-6 lg:flex">
                {navigation.map((item) => (
                    <Link
                        key={item.href}
                        href={route(item.href)}
                        className="flex items-center text-[13px] font-medium text-ink-800 transition-colors hover:text-gold-600"
                    >
                        {item.name}
                    </Link>
                ))}
                <span className="relative flex items-center text-[13px] font-semibold text-ink-900">
                    EEHT Connect
                    <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-gold-500" />
                </span>
            </nav>

            <div className="ml-auto flex items-center gap-2 px-3 sm:gap-4 sm:px-5">
                <label className="relative hidden md:block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Rechercher dans EEHT Connect…"
                        className="w-56 rounded-full border border-ink-200 bg-white py-2 pl-9 pr-4 text-xs text-ink-800 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 xl:w-64"
                    />
                </label>

                <button
                    onClick={onBell}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-50"
                    aria-label={`${unread} notification(s) non lue(s)`}
                >
                    <Bell className="h-5 w-5" />
                    {unread > 0 && (
                        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </button>

                <span className="hidden h-8 w-px bg-ink-100 sm:block" />

                <div ref={menuRef} className="relative">
                    <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 hover:bg-ink-50">
                        <Avatar name={me.name} src={me.avatar} size="sm" />
                        <span className="hidden text-left leading-tight sm:block">
                            <span className="block text-sm font-semibold text-ink-900">{me.name}</span>
                            <span className="block text-xs text-ink-500">{me.role}</span>
                        </span>
                        <ChevronDown className="hidden h-4 w-4 text-ink-500 sm:block" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-elevated">
                            <a href={links.home} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                                <LayoutDashboard className="h-4 w-4" /> Mon espace
                            </a>
                            {links.password && (
                                <a href={links.password} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                                    <KeyRound className="h-4 w-4" /> Mot de passe
                                </a>
                            )}
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                            >
                                <LogOut className="h-4 w-4" /> Déconnexion
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
