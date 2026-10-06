import Avatar from '@/Components/Connect/Avatar';
import { usePortal } from '@/Components/Portal/PortalContext';
import SiteLogo from '@/Components/SiteLogo';
import { greeting } from '@/lib/portal';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { PropsWithChildren } from 'react';

interface Props {
    name: string;
    lines: (string | null | undefined)[];
    avatar?: string | null;
    badge?: string | null;
}

/**
 * Grand en-tête de l'accueil des espaces : dégradé aux couleurs de l'école, photo, salutation et identité.
 * Sur téléphone il remplace l'en-tête compact (logo + cloche en haut) ; sur ordinateur c'est une bannière
 * arrondie dans la page.
 */
export default function PortalHero({ name, lines, avatar, badge, children }: PropsWithChildren<Props>) {
    const { unread } = usePortal();
    const { siteSettings } = usePage<PageProps>().props;

    return (
        <section
            className="relative -mx-4 -mt-6 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-ink-900 via-ink-800 to-brand-800 px-5 pb-16 text-white sm:-mx-6 lg:mx-0 lg:mt-0 lg:rounded-3xl lg:pb-14"
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
    );
}
