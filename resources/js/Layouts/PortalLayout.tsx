import NotificationBell from '@/Components/NotificationBell';
import BottomBar, { BarTab } from '@/Components/Portal/BottomBar';
import MenuSheet, { MenuItem } from '@/Components/Portal/MenuSheet';
import { PortalContext } from '@/Components/Portal/PortalContext';
import PullIndicator from '@/Components/Portal/PullIndicator';
import StudentCardOverlay from '@/Components/Portal/StudentCardOverlay';
import SiteLogo from '@/Components/SiteLogo';
import useAutoPushSubscribe from '@/hooks/useAutoPushSubscribe';
import useMediaQuery from '@/hooks/useMediaQuery';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import useUnreadCount from '@/hooks/useUnreadCount';
import { haptic, navIcon } from '@/lib/portal';
import { PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, Calendar, ChevronLeft, ClipboardCheck, Home, KeyRound, LayoutGrid, LogOut, LucideIcon, MessageCircle, QrCode } from 'lucide-react';
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

export interface PortalNavItem {
    label: string;
    href: string;
    active: (current: string) => boolean;
}

interface RoleConfig {
    label: string;
    home: string;
    agenda?: string;
    /** Action surélevée au centre de la barre du bas : un lien, ou l'ouverture de la carte d'étudiant plein écran. */
    center?: { label: string; icon: LucideIcon; href?: () => string; action?: 'card' };
}

// Onglets de la barre du bas par espace (le préfixe de route vient du premier élément de `nav`).
const ROLES: Record<string, RoleConfig> = {
    student: {
        label: 'Élève',
        home: 'student.dashboard',
        agenda: 'student.timetable',
        center: { label: 'Ma carte', icon: QrCode, action: 'card' },
    },
    teacher: {
        label: 'Enseignant',
        home: 'teacher.dashboard',
        agenda: 'teacher.timetable',
        center: { label: 'Appel', icon: ClipboardCheck, href: () => route('teacher.attendance.index') },
    },
    parent: { label: 'Parent', home: 'parent.dashboard' },
};

/**
 * Coque des espaces élève, enseignant et parent.
 *
 * Ordinateur (≥ lg) : barre latérale sombre + en-tête, comme avant.
 * Téléphone et tablette : application — en-tête compact sur les pages intérieures (l'accueil a son grand
 * en-tête), barre de navigation flottante en bas et feuille « Menu » en grille d'icônes. Les pages gardent les
 * mêmes props (`title`, `nav`) : seule la coque change.
 */
export default function PortalLayout({ title, nav, children }: PropsWithChildren<{ title: string; nav: PortalNavItem[] }>) {
    const { props, component } = usePage<PageProps>();
    const { auth, flash, portalProfile } = props;
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const [menuOpen, setMenuOpen] = useState(false);
    const [cardOpen, setCardOpen] = useState(false);
    // Une seule source de non-lus : la cloche de l'en-tête d'ordinateur (qui joue aussi un carillon) OU ce compteur.
    const unread = useUnreadCount(!isDesktop);
    useAutoPushSubscribe();

    // « Tirer pour actualiser » dans l'application installée (désactivé quand une fenêtre modale est ouverte).
    const refresh = useCallback(() => new Promise<void>((resolve) => router.reload({ onFinish: () => resolve() })), []);
    const { pull, refreshing } = usePullToRefresh(refresh, !menuOpen && !cardOpen);

    const currentRoute = (route().current() ?? component) as string;
    const rolePrefix = nav[0]?.href.split('.')[0] ?? 'student';
    const config = ROLES[rolePrefix] ?? ROLES.student;
    const isHome = currentRoute === config.home;
    const pageTitle = nav.find((item) => item.active(currentRoute))?.label ?? title;
    const passwordHref = route(`${rolePrefix}.password`);
    const messagesHref = route('connect.index');

    // <body data-portal> : le CSS réserve alors la place de la barre du bas (variable --portal-bar-h).
    useEffect(() => {
        document.body.dataset.portal = '';

        return () => {
            delete document.body.dataset.portal;
        };
    }, []);

    useEffect(() => setMenuOpen(false), [currentRoute]);

    const openMenu = useCallback(() => setMenuOpen(true), []);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const hasCard = config.center?.action === 'card';
    const openCard = useCallback(() => setCardOpen(true), []);

    // Fermer la carte retire aussi ?card=1 de l'adresse (sans toucher à l'état d'historique d'Inertia).
    const closeCard = useCallback(() => {
        setCardOpen(false);

        const url = new URL(window.location.href);

        if (url.searchParams.has('card')) {
            url.searchParams.delete('card');
            window.history.replaceState(window.history.state, '', url);
        }
    }, []);

    // Lien direct ?card=1 (raccourci, signet) : la carte s'ouvre dès l'arrivée.
    useEffect(() => {
        if (hasCard && new URLSearchParams(window.location.search).has('card')) setCardOpen(true);
    }, [hasCard]);

    const context = useMemo(() => ({ unread, openMenu, openCard }), [unread, openMenu, openCard]);

    const profile = {
        name: portalProfile?.name ?? auth.user?.name ?? '',
        subtitle: portalProfile?.subtitle ?? config.label,
        photo: portalProfile?.photo ?? (auth.user?.avatar ? `/storage/${auth.user.avatar}` : null),
    };

    const tabs: BarTab[] = [
        { key: 'home', label: 'Accueil', icon: Home, href: route(config.home), active: nav[0]?.active(currentRoute) ?? isHome },
        ...(config.agenda
            ? [{ key: 'agenda', label: 'Agenda', icon: Calendar, href: route(config.agenda), active: currentRoute.startsWith(config.agenda) }]
            : []),
        { key: 'messages', label: 'Messages', icon: MessageCircle, href: messagesHref, badge: unread },
        { key: 'menu', label: 'Menu', icon: LayoutGrid, onClick: openMenu, active: menuOpen },
    ];

    const center: BarTab | undefined = config.center
        ? {
              key: 'center',
              label: config.center.label,
              icon: config.center.icon,
              ...(config.center.action === 'card' ? { onClick: openCard } : { href: config.center.href?.() }),
          }
        : undefined;

    const menuItems: MenuItem[] = nav.map((item) => ({
        label: item.label,
        href: item.href,
        icon: navIcon(item.href),
        active: item.active(currentRoute),
    }));

    const Sidebar = (
        <>
            <div className="flex h-16 items-center gap-2.5 px-5">
                <SiteLogo size={36} tone="gold" />
                <div className="flex flex-col leading-tight">
                    <span className="font-serif text-sm font-bold text-white">{title}</span>
                    <span className="text-[10px] uppercase tracking-widest text-ink-400">EEHT de Thiès</span>
                </div>
            </div>
            <nav aria-label="Rubriques de l'espace" className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {nav.map((item) => {
                    const Icon = navIcon(item.href);
                    const isActive = item.active(currentRoute);

                    return (
                        <Link
                            key={item.href}
                            href={route(item.href)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                                isActive ? 'bg-gold-500 text-ink-900' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon className="h-4.5 w-4.5 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-sm font-semibold text-white">
                        {profile.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{profile.name}</p>
                        <p className="truncate text-xs text-ink-400">{auth.roles?.[0]}</p>
                    </div>
                </div>
                <Link
                    href={passwordHref}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        currentRoute === `${rolePrefix}.password` ? 'bg-white/5 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`}
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
        <PortalContext.Provider value={context}>
            <div className="min-h-screen bg-ink-50">
                <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink-900 lg:flex">{Sidebar}</aside>

                <div className="flex flex-1 flex-col lg:pl-64">
                    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-ink-100 bg-white px-6 lg:flex">
                        <div className="text-sm text-ink-500">{title} — EEHT de Thiès</div>
                        <div className="flex items-center gap-3">
                            {isDesktop && <NotificationBell href={messagesHref} />}
                            <Link href={route('home')} className="text-sm font-medium text-ink-600 transition-colors duration-150 hover:text-gold-600">
                                Voir le site public →
                            </Link>
                        </div>
                    </header>

                    {!isHome && (
                        <header
                            className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 px-2 backdrop-blur-xl lg:hidden"
                            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                        >
                            <div className="flex h-14 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        haptic();
                                        window.history.back();
                                    }}
                                    aria-label="Retour"
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors active:bg-ink-100"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                                <h1 className="min-w-0 flex-1 truncate px-1 font-serif text-base font-bold text-ink-900">{pageTitle}</h1>
                                <Link
                                    href={messagesHref}
                                    aria-label={unread > 0 ? `Messages (${unread} non lus)` : 'Messages'}
                                    className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors active:bg-ink-100"
                                >
                                    <Bell className="h-5 w-5" />
                                    {unread > 0 && (
                                        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                                            {unread > 9 ? '9+' : unread}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        </header>
                    )}

                    {flash?.success && (
                        <div className="mx-4 mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 sm:mx-6">{flash.success}</div>
                    )}
                    {flash?.error && (
                        <div className="mx-4 mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-6">{flash.error}</div>
                    )}

                    <main key={currentRoute} className="animate-fade-in-up flex-1 px-4 py-6 pb-[calc(var(--portal-bar-h)+1.5rem)] sm:px-6 lg:py-8 lg:pb-8">
                        {children}
                    </main>
                </div>

                <BottomBar tabs={tabs} center={center} />
                <MenuSheet open={menuOpen} onClose={closeMenu} profile={profile} items={menuItems} passwordHref={passwordHref} />
                {hasCard && <StudentCardOverlay open={cardOpen} onClose={closeCard} />}
                <PullIndicator pull={pull} refreshing={refreshing} />
            </div>
        </PortalContext.Provider>
    );
}
