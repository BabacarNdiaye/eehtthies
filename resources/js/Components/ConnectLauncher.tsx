import { Page } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { MessageCircle, Phone, PhoneOff, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageProps } from '@/types';
import { closeCallNotification, useRingtone } from './Connect/CallScreen';

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
    const [incoming, setIncoming] = useState<{ id: number; conversation_id: number; type: 'audio' | 'video'; other: { name: string } | null } | null>(null);

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

    // Appel entrant pendant que l'utilisateur est ailleurs sur le site.
    useEffect(() => {
        if (hidden) {
            setIncoming(null);
            return;
        }
        const check = async () => {
            try {
                const res = await window.axios.get(route('connect.calls.incoming'));
                setIncoming(res.data.call);
            } catch {
                // Réessai au prochain passage.
            }
        };
        check();
        const id = setInterval(check, 4000);
        return () => clearInterval(id);
    }, [hidden]);

    // Sonnerie et vibration tant que l'appel entrant est affiché.
    useRingtone(!!incoming && !hidden, 'incoming');

    if (hidden) return null;

    if (incoming) {
        return (
            <div className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-ink-900 p-4 text-white shadow-elevated lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
                <span className="flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-full bg-emerald-500">
                    {incoming.type === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-sm font-semibold">{incoming.other?.name ?? 'Quelqu’un'}</span>
                    <span className="text-xs text-white/70">{incoming.type === 'video' ? 'Appel vidéo entrant' : 'Appel vocal entrant'}</span>
                </span>
                <button
                    onClick={() => {
                        window.axios.post(route('connect.calls.decline', incoming.id)).catch(() => undefined);
                        closeCallNotification(incoming.id);
                        setIncoming(null);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 hover:bg-red-700"
                    aria-label="Refuser l'appel"
                >
                    <PhoneOff className="h-4 w-4" />
                </button>
                <button
                    onClick={() => router.visit(`/connect?conversation=${incoming.conversation_id}&call=${incoming.id}&answer=1`)}
                    className="flex h-10 items-center gap-1.5 rounded-full bg-emerald-500 px-4 text-sm font-semibold hover:bg-emerald-600"
                >
                    <Phone className="h-4 w-4" /> Répondre
                </button>
            </div>
        );
    }

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
