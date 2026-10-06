import { haptic } from '@/lib/portal';
import { contactActions, mainLinks, moreLinks } from '@/lib/publicNav';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

interface Tile {
    key: string;
    label: string;
    icon: LucideIcon;
    href: string;
    /** Lien hors du site ou du navigateur (tel:, mailto:, WhatsApp, cartes) : balise <a> plutôt que navigation Inertia. */
    plain: boolean;
    external: boolean;
}

const tileClass = 'flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500';

/**
 * Raccourcis du téléphone, sous le hero : les contacts renseignés par l'école (appeler, WhatsApp, e-mail,
 * itinéraire), complétés au besoin par le suivi de candidature, les événements, la galerie et le contact, pour
 * toujours en afficher quatre. Complète la barre du bas, qui porte déjà Formations et Candidater.
 */
export default function QuickActions() {
    const { siteSettings } = usePage<PageProps>().props;
    const fillers = [
        { link: moreLinks.find((l) => l.key === 'track'), label: 'Mon dossier' },
        { link: mainLinks.find((l) => l.key === 'events'), label: 'Événements' },
        { link: mainLinks.find((l) => l.key === 'gallery'), label: 'Galerie' },
        { link: mainLinks.find((l) => l.key === 'contact'), label: 'Contact' },
    ];

    const tiles: Tile[] = [
        ...contactActions(siteSettings).map((action) => ({ ...action, plain: true })),
        ...fillers.flatMap(({ link, label }) =>
            link ? [{ key: link.key, label, icon: link.icon, href: route(link.route), plain: false, external: false }] : [],
        ),
    ].slice(0, 4);

    return (
        <section aria-label="Raccourcis" className="relative z-10 -mt-10 px-4 sm:px-6 lg:hidden">
            <ul className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-3xl bg-white p-2.5 shadow-elevated ring-1 ring-ink-100">
                {tiles.map((tile) => (
                    <li key={tile.key}>
                        {tile.plain ? (
                            <a href={tile.href} {...(tile.external ? { target: '_blank', rel: 'noreferrer' } : {})} onClick={() => haptic()} className={tileClass}>
                                <TileBody tile={tile} />
                            </a>
                        ) : (
                            <Link href={tile.href} onClick={() => haptic()} className={tileClass}>
                                <TileBody tile={tile} />
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}

function TileBody({ tile }: { tile: Tile }) {
    return (
        <>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-700">
                <tile.icon className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-ink-700">{tile.label}</span>
        </>
    );
}
