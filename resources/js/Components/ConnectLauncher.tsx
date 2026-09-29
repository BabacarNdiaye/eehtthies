import { Page } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageProps } from '@/types';

/**
 * Bouton flottant « EEHT Connect », en bas à droite de toutes les pages dès
 * que l'utilisateur est connecté (ordinateur et mobile), avec le nombre de
 * messages et d'annonces non lus. Masqué sur EEHT Connect lui-même et sur les
 * pages de connexion.
 *
 * Rendu à côté de l'application Inertia (comme PwaInstallBanner) : il suit
 * donc la page courante via les événements de navigation du routeur.
 */
export default function ConnectLauncher({ initialPage }: { initialPage: Page<PageProps> }) {
    const [page, setPage] = useState<Page<PageProps>>(initialPage);
    const [unread, setUnread] = useState(0);

    useEffect(() => router.on('navigate', (event) => setPage(event.detail.page as Page<PageProps>)), []);

    const loggedIn = !!page.props.auth?.user;
    const hidden = !loggedIn || page.component.startsWith('Connect/') || page.component.startsWith('Auth/');

    useEffect(() => {
        if (!loggedIn) return;
        let cancelled = false;
        const fetchCount = async () => {
            try {
                const res = await window.axios.get(route('connect.unread-count'));
                if (!cancelled) setUnread(res.data.count as number);
            } catch {
                // Réessai au prochain passage.
            }
        };
        fetchCount();
        const id = setInterval(fetchCount, 30000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [loggedIn]);

    if (hidden) return null;

    return (
        <a
            href={route('connect.index')}
            onClick={(e) => {
                e.preventDefault();
                router.visit(route('connect.index'));
            }}
            aria-label={unread > 0 ? `Ouvrir EEHT Connect (${unread} non lu${unread > 1 ? 's' : ''})` : 'Ouvrir EEHT Connect'}
            className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-ink-900 p-4 text-white shadow-elevated ring-4 ring-white/70 transition hover:scale-105 hover:bg-ink-800 lg:bottom-6 lg:right-6 lg:px-5 lg:py-3.5"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
            <span className="relative">
                <MessageCircle className="h-6 w-6 lg:h-5 lg:w-5" />
                {unread > 0 && (
                    <span className="absolute -right-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-ink-900">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </span>
            <span className="hidden text-sm font-semibold lg:inline">EEHT Connect</span>
        </a>
    );
}
