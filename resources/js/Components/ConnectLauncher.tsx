import { Page } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { MessageCircle, Phone, PhoneOff, Video, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { PageProps } from '@/types';
import { closeCallNotification, useRingtone } from './Connect/CallScreen';

/** Délai après lequel la pastille dépliée se replie d'elle-même (sans survol ni navigation au clavier). */
const AUTO_COLLAPSE_MS = 8000;

/** Le focus vient du clavier (et non d'un clic) : seul celui-là retient la pastille dépliée. */
function isKeyboardFocus(target: EventTarget): boolean {
    try {
        return (target as Element).matches(':focus-visible');
    } catch {
        // Navigateur sans :focus-visible : mieux vaut retenir la pastille que la replier sous les doigts.
        return true;
    }
}

/**
 * Accès flottant à « EEHT Connect », en bas à droite de toutes les pages dès que l'utilisateur est connecté
 * (ordinateur et mobile), avec le nombre de messages et d'annonces non lus. Replié par défaut en une petite icône
 * ronde qui ne cache presque rien ; un clic (ou Entrée) déplie la pastille « EEHT Connect » qui mène à la
 * messagerie. Elle se replie d'elle-même au bout de quelques secondes, avec Échap, par un clic ailleurs ou en
 * changeant de page. Masqué sur EEHT Connect lui-même et sur les pages de connexion ; remplacé par l'appel
 * entrant quand le téléphone sonne.
 *
 * Rendu à côté de l'application Inertia (comme PwaInstallBanner) : il suit
 * donc la page courante via les événements de navigation du routeur.
 */
export default function ConnectLauncher({ initialPage }: { initialPage: Page<PageProps> }) {
    const [page, setPage] = useState<Page<PageProps>>(initialPage);
    const [unread, setUnread] = useState(0);
    const [incoming, setIncoming] = useState<{ id: number; conversation_id: number; type: 'audio' | 'video'; other: { name: string } | null } | null>(null);
    const [open, setOpen] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [keyboardFocus, setKeyboardFocus] = useState(false);
    const rootRef = useRef<HTMLElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const panelId = useId();

    useEffect(
        () =>
            router.on('navigate', (event) => {
                setPage(event.detail.page as Page<PageProps>);
                setOpen(false);
            }),
        [],
    );

    const loggedIn = !!page.props.auth?.user;
    // Séance et vue projetée du conseil de classe : plein écran, le bouton couvrirait la barre « Suivant ».
    const hidden = !loggedIn || page.component.startsWith('Connect/') || page.component.startsWith('Auth/') || page.component.startsWith('Council/');

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
    const ringing = !!incoming && !hidden;
    useRingtone(ringing, 'incoming');

    // Replié dès que l'icône disparaît (page de Connect, déconnexion, appel entrant) : à son retour on repart de
    // l'icône seule, sans survol ni focus fantômes (un élément retiré du document n'envoie pas de « sortie »).
    useEffect(() => {
        if (!hidden && !ringing) return;
        setOpen(false);
        setHovering(false);
        setKeyboardFocus(false);
    }, [hidden, ringing]);

    // Déplié : Échap et un clic ailleurs replient ; sans survol ni navigation au clavier, la pastille se replie
    // d'elle-même. Si le focus était dans la pastille, il revient sur l'icône plutôt que de se perdre avec elle.
    const engaged = hovering || keyboardFocus;
    useEffect(() => {
        if (!open) return;

        const collapse = () => {
            if (rootRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
            setOpen(false);
        };
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') collapse();
        };
        const timer = engaged ? undefined : window.setTimeout(collapse, AUTO_COLLAPSE_MS);

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, engaged]);

    if (hidden) return null;

    if (incoming) {
        return (
            <div
                className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-ink-900 p-4 text-white shadow-elevated lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
                style={{ marginBottom: 'var(--portal-bar-h, 0px)' }}
            >
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

    const unreadLabel = `${unread} non lu${unread > 1 ? 's' : ''}`;
    const toggleLabel = open ? 'Replier EEHT Connect' : unread > 0 ? `EEHT Connect, ${unreadLabel}` : 'EEHT Connect';

    return (
        <aside
            ref={rootRef}
            aria-label="Messagerie EEHT Connect"
            className="connect-fab fixed bottom-24 right-3 z-40 flex flex-row-reverse items-center gap-2 print:hidden lg:bottom-5 lg:right-5"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
            // Le survol ne retient la pastille qu'à la souris : au doigt, « survol » reste collé jusqu'au toucher suivant.
            onPointerEnter={(event) => event.pointerType === 'mouse' && setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            onFocus={(event) => setKeyboardFocus(isKeyboardFocus(event.target))}
            onBlur={() => setKeyboardFocus(false)}
        >
            <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                aria-label={toggleLabel}
                className={`relative flex h-11 w-11 items-center justify-center rounded-full bg-ink-900 text-white shadow-elevated outline-none ring-2 ring-white/80 transition duration-200 hover:scale-105 hover:bg-ink-800 focus-visible:ring-gold-500 focus-visible:ring-offset-2 motion-reduce:transition-none lg:h-10 lg:w-10 ${
                    open || unread > 0 ? '' : 'opacity-80 hover:opacity-100 focus-visible:opacity-100'
                }`}
            >
                {open ? <X className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
                {!open && unread > 0 && (
                    <span
                        aria-hidden="true"
                        className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                    >
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <a
                    id={panelId}
                    href={route('connect.index')}
                    onClick={(event) => {
                        // Ctrl/⌘-clic, clic du milieu : le navigateur ouvre un nouvel onglet comme pour tout lien.
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                        event.preventDefault();
                        setOpen(false);
                        router.visit(route('connect.index'));
                    }}
                    className="flex min-h-11 animate-slide-in-right items-center gap-2.5 rounded-full bg-ink-900 py-2 pl-3.5 pr-5 text-white shadow-elevated outline-none ring-2 ring-white/80 transition-colors hover:bg-ink-800 focus-visible:ring-gold-500 focus-visible:ring-offset-2 motion-reduce:animate-none lg:min-h-10"
                >
                    <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="leading-tight">
                        <span className="block whitespace-nowrap text-sm font-semibold">EEHT Connect</span>
                        {unread > 0 && <span className="block whitespace-nowrap text-xs text-white/80">{unreadLabel}</span>}
                    </span>
                </a>
            )}
        </aside>
    );
}
