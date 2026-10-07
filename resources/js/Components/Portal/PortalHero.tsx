import Avatar from '@/Components/Connect/Avatar';
import { usePortal } from '@/Components/Portal/PortalContext';
import SiteLogo from '@/Components/SiteLogo';
import { greeting } from '@/lib/portal';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, LucideIcon, Search } from 'lucide-react';
import { PropsWithChildren } from 'react';

export interface HeroTile {
    label: string;
    icon: LucideIcon;
    /** Lien Inertia, ou action (p. ex. ouvrir la carte). */
    href?: string;
    onClick?: () => void;
    /** `green` : tuile d'accent ; `dark` : tuile sombre. */
    tone: 'green' | 'dark';
}

interface Props {
    name: string;
    /** Deux grandes tuiles d'action rapide, affichées sous l'en-tête sur téléphone. */
    tiles?: HeroTile[];
    lines: (string | null | undefined)[];
    avatar?: string | null;
    badge?: string | null;
}

/**
 * Grand en-tête de l'accueil des espaces : dégradé aux couleurs de l'école, photo, salutation et identité.
 * Sur téléphone il remplace l'en-tête compact (logo + cloche en haut) ; sur ordinateur c'est une bannière
 * arrondie dans la page.
 */
export default function PortalHero({ name, lines, avatar, badge, tiles, children }: PropsWithChildren<Props>) {
    const { unread } = usePortal();
    const { siteSettings } = usePage<PageProps>().props;

    return (
        <>
            {/* Sans contenu additionnel (sélecteur d'enfant du parent), le téléphone affiche l'accueil façon application. */}
            {!children && <MobileHome name={name} avatar={avatar} tiles={tiles} unread={unread} />}
        <section
            className={`relative -mx-4 -mt-6 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-ink-900 via-ink-800 to-brand-800 px-5 pb-16 text-white sm:-mx-6 lg:mx-0 lg:mt-0 lg:rounded-3xl lg:pb-14 ${children ? '' : 'hidden lg:block'}`}
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
        >
            <span className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
            <span className="pointer-events-none absolute right-12 top-28 h-24 w-24 rounded-full bg-gold-400/15 blur-xl" />
            <span className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-white/5" />

            <div className="relative flex items-center justify-between lg:hidden">
                <div className="flex items-center gap-2.5">
                    <SiteLogo size={34} tone="gold" />
                    <span className="font-serif text-sm font-bold tracking-wide">{siteSettings?.site_short_name ?? 'EEHT'}</span>
                </div>
                <Link
                    href={route('connect.index')}
                    aria-label={unread > 0 ? `Messages (${unread} non lus)` : 'Messages'}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                    <Bell className="h-5 w-5" />
                    {unread > 0 && (
                        // Le nom du lien donne déjà le nombre : le badge n'est que visuel (« 9+ » ne figurerait pas dans le nom).
                        <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-ink-900">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Link>
            </div>

            <div className="relative mt-5 flex items-center gap-4 lg:mt-0">
                <Avatar name={name} src={avatar} size="lg" />
                <div className="min-w-0">
                    <p className="text-xs font-medium text-gold-300">{greeting()}</p>
                    <h1 className="truncate font-serif text-2xl font-bold leading-tight">{name}</h1>
                    {lines.filter(Boolean).map((line) => (
                        <p key={line} className="truncate text-sm text-white/70">
                            {line}
                        </p>
                    ))}
                    {badge && (
                        <span className="mt-1.5 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide backdrop-blur">
                            {badge}
                        </span>
                    )}
                </div>
            </div>

            {children}
        </section>
        </>
    );
}

const tileTone = {
    green: 'bg-leaf-500 text-ink-900 shadow-lg shadow-leaf-500/30',
    dark: 'bg-ink-900 text-white shadow-lg shadow-ink-900/30',
};

/** Accueil façon application (téléphone) : salutation, recherche, deux grandes tuiles d'action. */
function MobileHome({ name, avatar, tiles, unread }: { name: string; avatar?: string | null; tiles?: HeroTile[]; unread: number }) {
    const firstName = name.split(' ')[0];

    return (
        <section className="-mx-4 -mt-6 px-4 pb-2 sm:-mx-6 sm:px-6 lg:hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
            <div className="flex items-center justify-between">
                <SiteLogo size={34} tone="gold" />
                <div className="flex items-center gap-2">
                    <Link
                        href={route('connect.index')}
                        aria-label={unread > 0 ? `Messages (${unread} non lus)` : 'Messages'}
                        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-900 shadow-soft ring-1 ring-ink-100 transition-transform active:scale-95"
                    >
                        <Bell className="h-5 w-5" />
                        {unread > 0 && (
                            <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-ink-50">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            <div className="mt-5 flex items-center gap-4">
                <span className="shrink-0 rounded-full p-1 ring-2 ring-leaf-500">
                    <Avatar name={name} src={avatar} size="lg" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-500">{greeting()}</p>
                    <h1 className="font-serif text-2xl font-bold leading-tight text-ink-900">
                        Bonjour {firstName} ! <span className="block text-base font-semibold text-ink-500">Que souhaitez-vous faire ?</span>
                    </h1>
                </div>
            </div>

            <Link
                href={route('connect.index')}
                className="mt-4 flex h-12 items-center justify-between rounded-2xl bg-white px-4 text-sm text-ink-400 shadow-soft ring-1 ring-ink-100"
            >
                Rechercher une personne, un message…
                <Search className="h-5 w-5 text-ink-500" />
            </Link>

            {tiles && tiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                    {tiles.map((tile) => {
                        const Icon = tile.icon;
                        const className = `flex h-28 flex-col items-center justify-center gap-2 rounded-3xl text-center text-sm font-bold transition-transform active:scale-[0.97] ${tileTone[tile.tone]}`;
                        const body = (
                            <>
                                <Icon className="h-8 w-8" strokeWidth={2} />
                                {tile.label}
                            </>
                        );

                        return tile.href ? (
                            <Link key={tile.label} href={tile.href} className={className}>
                                {body}
                            </Link>
                        ) : (
                            <button key={tile.label} type="button" onClick={tile.onClick} className={className}>
                                {body}
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
