import AdminMenuSheet from '@/Components/Admin/Shell/AdminMenuSheet';
import CommandPalette from '@/Components/Admin/Shell/CommandPalette';
import DesktopTopBar from '@/Components/Admin/Shell/DesktopTopBar';
import FlashBanner from '@/Components/Admin/Shell/FlashBanner';
import MobileTopBar from '@/Components/Admin/Shell/MobileTopBar';
import Sidebar from '@/Components/Admin/Shell/Sidebar';
import BottomBar, { BarTab } from '@/Components/Portal/BottomBar';
import PullIndicator from '@/Components/Portal/PullIndicator';
import useAutoPushSubscribe from '@/hooks/useAutoPushSubscribe';
import useMediaQuery from '@/hooks/useMediaQuery';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import useUnreadCount from '@/hooks/useUnreadCount';
import { recallListUrl, rememberListUrl, rememberRecent } from '@/lib/adminMemory';
import { crumbsFor, locate, shortcutTab, visibleGroups } from '@/lib/adminNav';
import { PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Home, LayoutGrid, MessageCircle, Search } from 'lucide-react';
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

/** Vrai quand la frappe part dans un champ : le raccourci « / » ne doit alors pas ouvrir la palette. */
function isTyping(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;

    return !!element && (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable);
}

/**
 * Coque de l'administration.
 *
 * Ordinateur (≥ lg) : barre latérale sombre, barre haute avec fil d'Ariane et recherche (Ctrl/⌘ K).
 * Téléphone et tablette : application — barre haute compacte, barre de navigation flottante en bas (Accueil, la
 * rubrique principale du rôle, Rechercher, Messages, Menu) et feuille Menu. Les pages gardent le même usage
 * (`<AdminLayout>{…}</AdminLayout>`) : seule la coque change.
 */
export default function AdminLayout({ children }: PropsWithChildren) {
    const { props, component, url } = usePage<PageProps>();
    const { auth, flash } = props;
    const current = (route().current() ?? component) as string;
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    // Une seule source de non-lus : la cloche de la barre d'ordinateur (qui joue aussi un carillon) OU ce compteur.
    const unread = useUnreadCount(!isDesktop);
    const [menuOpen, setMenuOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    useAutoPushSubscribe();

    const permissions = auth.permissions;
    const groups = useMemo(() => visibleGroups(permissions), [permissions]);
    const crumbs = crumbsFor(groups, current);
    // Une fiche ou un formulaire ramène à la liste de sa rubrique, avec les filtres et la page qu'elle avait.
    const backHref = crumbs.isSubPage && crumbs.item ? (recallListUrl(crumbs.item.href) ?? route(crumbs.item.href)) : null;

    // <body data-admin> : le CSS réserve alors la place de la barre du bas (--portal-bar-h) sur téléphone.
    useEffect(() => {
        document.body.dataset.admin = '';

        return () => {
            delete document.body.dataset.admin;
        };
    }, []);

    // Rubriques récentes de la palette, et adresse de chaque liste (l'adresse change aussi quand on filtre, sans
    // que la page soit remontée : d'où la dépendance sur `url`).
    useEffect(() => {
        const located = locate(groups, current);

        if (!located) return;

        if (located.item.href !== 'admin.dashboard') rememberRecent(located.item.href);
        if (!crumbs.isSubPage) rememberListUrl(located.item.href, url);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    const openMenu = useCallback(() => setMenuOpen(true), []);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const openPalette = useCallback(() => {
        setMenuOpen(false);
        setPaletteOpen(true);
    }, []);
    const closePalette = useCallback(() => setPaletteOpen(false), []);

    // Ctrl/⌘ K ouvre ou ferme la palette depuis n'importe où ; « / » l'ouvre hors d'un champ de saisie.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setMenuOpen(false);
                setPaletteOpen((open) => !open);
            } else if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(event.target)) {
                event.preventDefault();
                setPaletteOpen(true);
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, []);

    // « Tirer pour actualiser » dans l'application installée (désactivé quand une fenêtre modale est ouverte).
    const refresh = useCallback(() => new Promise<void>((resolve) => router.reload({ onFinish: () => resolve() })), []);
    const { pull, refreshing } = usePullToRefresh(refresh, !menuOpen && !paletteOpen);

    const shortcut = shortcutTab(groups);
    const tabs: BarTab[] = [
        { key: 'home', label: 'Accueil', icon: Home, href: route('admin.dashboard'), active: current === 'admin.dashboard' },
        ...(shortcut
            ? [{ key: 'shortcut', label: shortcut.label, icon: shortcut.item.icon, href: route(shortcut.item.href), active: shortcut.item.active(current) }]
            : []),
        { key: 'messages', label: 'Messages', icon: MessageCircle, href: route('connect.index'), badge: unread },
        { key: 'menu', label: 'Menu', icon: LayoutGrid, onClick: openMenu, active: menuOpen },
    ];
    const center: BarTab = { key: 'search', label: 'Rechercher', icon: Search, onClick: openPalette };

    const profile = {
        name: auth.user?.name ?? '',
        subtitle: auth.roles?.[0] ?? null,
        photo: auth.user?.avatar ? `/storage/${auth.user.avatar}` : null,
    };

    return (
        <div className="min-h-screen bg-ink-50">
            <a
                href="#contenu"
                className="sr-only rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-elevated focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70]"
            >
                Aller au contenu
            </a>

            {isDesktop && <Sidebar groups={groups} current={current} name={profile.name} role={auth.roles?.[0]} />}

            <div className="flex flex-1 flex-col lg:pl-64">
                {isDesktop ? (
                    <DesktopTopBar crumbs={crumbs} onSearch={openPalette} />
                ) : (
                    <MobileTopBar caption={crumbs.group} backHref={backHref} unread={unread} />
                )}

                {flash?.success && <FlashBanner message={flash.success} tone="success" />}
                {flash?.error && <FlashBanner message={flash.error} tone="error" />}

                <main
                    id="contenu"
                    tabIndex={-1}
                    className="flex-1 px-4 py-6 pb-[calc(var(--portal-bar-h)+1.5rem)] outline-none sm:px-6 lg:py-8 lg:pb-24"
                >
                    <div key={current} className="animate-fade-in-up">
                        {children}
                    </div>
                </main>
            </div>

            {!isDesktop && (
                <>
                    <BottomBar tabs={tabs} center={center} />
                    <AdminMenuSheet open={menuOpen} onClose={closeMenu} onSearch={openPalette} groups={groups} current={current} profile={profile} />
                </>
            )}
            <CommandPalette open={paletteOpen} onClose={closePalette} groups={groups} permissions={permissions ?? []} />
            <PullIndicator pull={pull} refreshing={refreshing} />
        </div>
    );
}
