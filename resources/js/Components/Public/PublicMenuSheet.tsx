import BottomSheet from '@/Components/BottomSheet';
import SiteLogo from '@/Components/SiteLogo';
import { haptic } from '@/lib/portal';
import { contactActions, legalLinks, mainLinks, moreLinks, PublicLink } from '@/lib/publicNav';
import { promptInstall, useCanInstall } from '@/lib/pwa';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Clock, Download, Facebook, Instagram, Linkedin, LogIn, MapPin, UserRound, Youtube } from 'lucide-react';

interface Props {
    open: boolean;
    /** Doit être stable (useCallback). */
    onClose: () => void;
}

const tileLink = 'flex flex-col items-center gap-2 rounded-2xl text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500';
const tileIcon = 'flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors';
const sectionTitle = 'mx-5 mt-5 text-[11px] font-bold uppercase tracking-wider text-ink-500';

function Tile({ link, current, onNavigate }: { link: PublicLink; current: string; onNavigate: () => void }) {
    const active = link.match(current);

    return (
        <li>
            <Link href={route(link.route)} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={tileLink}>
                <span className={`${tileIcon} ${active ? 'border-gold-300 bg-gold-100 text-ink-900' : 'border-leaf-200 bg-leaf-50 text-leaf-800'}`}>
                    <link.icon className="h-6 w-6" />
                </span>
                <span className={`text-xs leading-tight ${active ? 'font-bold text-ink-900' : 'font-medium text-ink-700'}`}>{link.label}</span>
            </Link>
        </li>
    );
}

/**
 * Feuille « Menu » du site public sur téléphone : appel à l'action, contacts rapides (appeler, WhatsApp, e-mail,
 * itinéraire), toutes les rubriques en tuiles — celles que le pied de page d'ordinateur affiche et que le téléphone
 * n'avait aucun moyen d'atteindre —, accès à l'espace membre, adresse, horaires, réseaux et pages légales.
 */
export default function PublicMenuSheet({ open, onClose }: Props) {
    const { auth, siteSettings } = usePage<PageProps>().props;
    const canInstall = useCanInstall();
    const current = (route().current() as string | undefined) ?? '';
    const actions = contactActions(siteSettings);
    const socials = [
        { label: 'Facebook', href: siteSettings.facebook_url, icon: Facebook },
        { label: 'Instagram', href: siteSettings.instagram_url, icon: Instagram },
        { label: 'LinkedIn', href: siteSettings.linkedin_url, icon: Linkedin },
        { label: 'YouTube', href: siteSettings.youtube_url, icon: Youtube },
    ].filter((social) => social.href);

    const navigate = () => {
        haptic();
        onClose();
    };

    return (
        <BottomSheet open={open} onClose={onClose} label="Menu du site">
            <div className="mx-5 flex items-center gap-3.5 border-b border-ink-100 pb-4">
                <SiteLogo size={44} tone="dark" />
                <div className="min-w-0">
                    <p className="truncate font-serif text-lg font-bold text-ink-900">{siteSettings.site_name}</p>
                    <p className="truncate text-sm text-ink-500">{siteSettings.site_tagline || 'Hôtellerie · Restauration · Tourisme'}</p>
                </div>
            </div>

            <div className="flex gap-2 px-5 pt-4">
                <Link
                    href={route('candidature.create')}
                    onClick={navigate}
                    className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-gold-500 text-sm font-semibold text-ink-900 shadow-soft outline-none active:bg-gold-400 focus-visible:ring-2 focus-visible:ring-ink-900"
                >
                    Candidater maintenant
                </Link>
                <Link
                    href={auth.user ? route('dashboard') : route('login')}
                    onClick={navigate}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-ink-200 px-4 text-sm font-semibold text-ink-800 outline-none active:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    {auth.user ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                    {auth.user ? 'Mon espace' : 'Connexion'}
                </Link>
            </div>

            {actions.length > 0 && (
                <ul className="mx-5 mt-3 flex gap-2">
                    {actions.map((action) => (
                        <li key={action.key} className="flex-1">
                            <a
                                href={action.href}
                                {...(action.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                                onClick={() => haptic()}
                                className="flex flex-col items-center gap-1 rounded-2xl border border-ink-100 bg-ink-50 py-2.5 text-xs font-semibold text-ink-700 outline-none active:bg-ink-100 focus-visible:ring-2 focus-visible:ring-gold-500"
                            >
                                <action.icon className="h-5 w-5 text-gold-700" />
                                {action.label}
                            </a>
                        </li>
                    ))}
                </ul>
            )}

            <h2 className={sectionTitle}>Découvrir</h2>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-5 px-5 pt-3">
                {mainLinks.map((link) => (
                    <Tile key={link.key} link={link} current={current} onNavigate={navigate} />
                ))}
            </ul>

            <h2 className={sectionTitle}>Pour aller plus loin</h2>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-5 px-5 pt-3">
                {moreLinks.map((link) => (
                    <Tile key={link.key} link={link} current={current} onNavigate={navigate} />
                ))}
                {canInstall && (
                    <li>
                        <button
                            type="button"
                            onClick={async () => {
                                await promptInstall();
                                onClose();
                            }}
                            className={`${tileLink} w-full`}
                        >
                            <span className={`${tileIcon} border-ink-100 bg-ink-50 text-ink-700`}>
                                <Download className="h-6 w-6" />
                            </span>
                            <span className="text-xs font-medium leading-tight text-ink-700">Installer l'application</span>
                        </button>
                    </li>
                )}
            </ul>

            <div className="mx-5 mt-6 space-y-3 border-t border-ink-100 pt-4 text-sm text-ink-600">
                {siteSettings.site_address && (
                    <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
                        {siteSettings.site_address}
                    </p>
                )}
                {siteSettings.opening_hours && (
                    <p className="flex items-start gap-2 whitespace-pre-line">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" />
                        {siteSettings.opening_hours}
                    </p>
                )}
                {socials.length > 0 && (
                    <div className="flex gap-2 pt-1">
                        {socials.map((social) => (
                            <a
                                key={social.label}
                                href={social.href as string}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={social.label}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-700 outline-none active:bg-ink-200 focus-visible:ring-2 focus-visible:ring-gold-500"
                            >
                                <social.icon className="h-4 w-4" />
                            </a>
                        ))}
                    </div>
                )}
                <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
                    {legalLinks.map((legal) => (
                        <Link key={legal.route} href={route(legal.route)} onClick={navigate} className="underline underline-offset-2">
                            {legal.label}
                        </Link>
                    ))}
                </p>
            </div>
        </BottomSheet>
    );
}
