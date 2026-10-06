import BottomBar, { BarTab } from '@/Components/Portal/BottomBar';
import MobileFooter from '@/Components/Public/MobileFooter';
import PublicMenuSheet from '@/Components/Public/PublicMenuSheet';
import SiteLogo from '@/Components/SiteLogo';
import { mainLinks } from '@/lib/publicNav';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    Clock,
    Facebook,
    FilePenLine,
    GraduationCap,
    Home,
    Instagram,
    LayoutGrid,
    Linkedin,
    Mail,
    MapPin,
    MessageCircle,
    Newspaper,
    Phone,
    Youtube,
} from 'lucide-react';
import { PropsWithChildren, useCallback, useEffect, useState } from 'react';

/**
 * Coque des pages publiques. Sous `lg` (téléphone et tablette) : en-tête d'une ligne, barre du bas flottante
 * (Accueil · Formations · Candidater · Actualités · Menu), feuille Menu qui regroupe toutes les rubriques et pied de
 * page compact. À partir de `lg` : l'en-tête, le menu et le pied de page d'ordinateur.
 * `hideBar` retire la barre du bas (page de saisie en étapes : candidature).
 */
export default function PublicLayout({ children, hideBar = false }: PropsWithChildren<{ hideBar?: boolean }>) {
    const { props } = usePage<PageProps<{ formation?: { slug?: string } }>>();
    const { auth, siteSettings, flash } = props;
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const current = (route().current() as string | undefined) ?? '';

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // <body data-site-bar> : le CSS réserve la place de la barre du bas (variable --portal-bar-h) aux éléments
    // flottants — bouton EEHT Connect, bannière d'installation. Sans barre (page de saisie en étapes), c'est
    // <body data-site-form> : la place de la barre de l'assistant, et le bouton EEHT Connect est masqué.
    useEffect(() => {
        const attribute = hideBar ? 'siteForm' : 'siteBar';

        document.body.dataset[attribute] = '';

        return () => {
            delete document.body.dataset[attribute];
        };
    }, [hideBar]);

    // Sur une fiche formation, « Candidater » présélectionne la formation consultée.
    const formationSlug = current === 'formations.show' ? props.formation?.slug : undefined;

    const tabs: BarTab[] = [
        { key: 'home', label: 'Accueil', icon: Home, href: route('home'), active: current === 'home' },
        { key: 'formations', label: 'Formations', icon: GraduationCap, href: route('formations.index'), active: current.startsWith('formations.') },
        { key: 'news', label: 'Actualités', icon: Newspaper, href: route('news.index'), active: current.startsWith('news.') },
        { key: 'menu', label: 'Menu', icon: LayoutGrid, onClick: () => setMenuOpen(true), active: menuOpen },
    ];
    const center: BarTab = {
        key: 'apply',
        label: 'Candidater',
        icon: FilePenLine,
        href: route('candidature.create', formationSlug ? { formation: formationSlug } : undefined),
    };
    const phoneHref = siteSettings.site_phone ? `tel:${siteSettings.site_phone.replace(/[^\d+]/g, '')}` : null;

    return (
        <div className="flex min-h-screen flex-col bg-white text-ink-900">
            <header
                className={`sticky top-0 z-40 border-b border-ink-100/60 bg-white shadow-sm transition-all lg:border-b-0 lg:backdrop-blur ${
                    scrolled
                        ? 'lg:bg-white/95 lg:shadow-sm'
                        : 'lg:bg-white/70 lg:shadow-none'
                }`}
            >
                <div className="hidden border-b border-ink-100/60 bg-ink-900 text-ink-100 lg:block">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6 lg:px-8">
                        <div className="flex items-center gap-4">
                            {siteSettings.site_phone && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Phone className="h-3 w-3 text-gold-400" />
                                    {siteSettings.site_phone}
                                </span>
                            )}
                            {siteSettings.site_email && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Mail className="h-3 w-3 text-gold-400" />
                                    {siteSettings.site_email}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {siteSettings.facebook_url && (
                                <a href={siteSettings.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook" className="text-ink-200 hover:text-gold-400">
                                    <Facebook className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {siteSettings.instagram_url && (
                                <a href={siteSettings.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-ink-200 hover:text-gold-400">
                                    <Instagram className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {siteSettings.whatsapp_url && (
                                <a href={siteSettings.whatsapp_url} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="text-ink-200 hover:text-gold-400">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {siteSettings.linkedin_url && (
                                <a href={siteSettings.linkedin_url} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-ink-200 hover:text-gold-400">
                                    <Linkedin className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {siteSettings.youtube_url && (
                                <a href={siteSettings.youtube_url} target="_blank" rel="noreferrer" aria-label="YouTube" className="text-ink-200 hover:text-gold-400">
                                    <Youtube className="h-3.5 w-3.5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <nav aria-label="Navigation du site" className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8 lg:py-4">
                    <div className="flex items-center gap-1.5">
                        {current !== 'home' && (
                            <button
                                onClick={() => window.history.back()}
                                aria-label="Retour"
                                className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 lg:hidden"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        )}
                        <Link
                            href={route('home')}
                            className="flex items-center gap-2.5"
                        >
                            <SiteLogo size={44} tone="dark" />
                            <span className="flex flex-col leading-tight">
                                <span className="font-serif text-lg font-bold text-ink-900">
                                    EEHT
                                </span>
                                <span className="text-[11px] uppercase tracking-widest text-ink-500">
                                    de Thiès
                                </span>
                            </span>
                        </Link>
                    </div>

                    <div className="hidden items-center gap-8 lg:flex">
                        {mainLinks.map((link) => {
                            const isActive = link.match(current);
                            return (
                                <Link
                                    key={link.key}
                                    href={route(link.route)}
                                    className={`group relative py-1 text-sm font-medium transition-colors duration-150 ${
                                        isActive ? 'text-gold-700' : 'text-ink-700 hover:text-gold-700'
                                    }`}
                                >
                                    {link.label}
                                    <span
                                        className={`absolute -bottom-0.5 left-0 h-0.5 w-full origin-center bg-gold-500 transition-transform duration-300 ease-fluid ${
                                            isActive
                                                ? 'scale-x-100'
                                                : 'scale-x-0 group-hover:scale-x-100'
                                        }`}
                                    />
                                </Link>
                            );
                        })}
                    </div>

                    <div className="hidden items-center gap-3 lg:flex">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                            >
                                Mon espace
                            </Link>
                        ) : (
                            <Link
                                href={route('login')}
                                className="text-sm font-semibold text-ink-700 hover:text-gold-700"
                            >
                                Connexion
                            </Link>
                        )}
                        <Link
                            href={route('candidature.create')}
                            className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-ink-900 shadow-soft transition hover:bg-gold-400"
                        >
                            Candidater
                        </Link>
                    </div>

                    {phoneHref && (
                        <a
                            href={phoneHref}
                            aria-label="Appeler l'école"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-gold-400 lg:hidden"
                        >
                            <Phone className="h-4 w-4" />
                        </a>
                    )}
                </nav>
            </header>

            {flash?.success && (
                <div className="bg-emerald-700 px-4 py-2 text-center text-sm text-white">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
                    {flash.error}
                </div>
            )}

            <main className="flex-1">{children}</main>

            <MobileFooter />

            {!hideBar && (
                <>
                    <BottomBar tabs={tabs} center={center} />
                    <PublicMenuSheet open={menuOpen} onClose={closeMenu} />
                </>
            )}

            <footer className="hidden bg-ink-950 text-ink-200 lg:block">
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-5 lg:px-8">
                    <div>
                        <div className="mb-4 flex items-center gap-2.5">
                            <SiteLogo size={40} tone="gold" />
                            <span className="font-serif text-lg font-bold text-white">
                                EEHT de Thiès
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-ink-300">
                            Elite École Hôtelière et Touristique de Thiès —
                            former les talents de demain dans l'hôtellerie, la
                            restauration et le tourisme.
                        </p>
                    </div>

                    <div>
                        <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-gold-400">
                            Navigation
                        </h3>
                        <ul className="space-y-2.5 text-sm text-ink-300">
                            {mainLinks.map((link) => (
                                <li key={link.key}>
                                    <Link
                                        href={route(link.route)}
                                        className="hover:text-white"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-gold-400">
                            Ressources
                        </h3>
                        <ul className="space-y-2.5 text-sm text-ink-300">
                            <li>
                                <Link href={route('pages.faq')} className="hover:text-white">
                                    FAQ
                                </Link>
                            </li>
                            <li>
                                <Link href={route('pages.testimonials')} className="hover:text-white">
                                    Témoignages
                                </Link>
                            </li>
                            <li>
                                <Link href={route('pages.partners')} className="hover:text-white">
                                    Partenaires
                                </Link>
                            </li>
                            <li>
                                <Link href={route('candidature.track.form')} className="hover:text-white">
                                    Suivre ma candidature
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-gold-400">
                            Carrières
                        </h3>
                        <ul className="space-y-2.5 text-sm text-ink-300">
                            <li>
                                <Link href={route('careers.internships.index')} className="hover:text-white">
                                    Offres de stage
                                </Link>
                            </li>
                            <li>
                                <Link href={route('careers.jobs.index')} className="hover:text-white">
                                    Offres d'emploi
                                </Link>
                            </li>
                            <li>
                                <Link href={route('community.alumni.index')} className="hover:text-white">
                                    Anciens élèves
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-gold-400">
                            Contact
                        </h3>
                        <ul className="space-y-3 text-sm text-ink-300">
                            {siteSettings.site_address && (
                                <li className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                                    {siteSettings.site_address}
                                </li>
                            )}
                            {siteSettings.site_phone && (
                                <li className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 shrink-0 text-gold-400" />
                                    {siteSettings.site_phone}
                                </li>
                            )}
                            {siteSettings.site_email && (
                                <li className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 shrink-0 text-gold-400" />
                                    {siteSettings.site_email}
                                </li>
                            )}
                            {siteSettings.opening_hours && (
                                <li className="flex items-start gap-2 whitespace-pre-line">
                                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                                    {siteSettings.opening_hours}
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/10 px-4 py-6 text-center text-xs text-ink-300">
                    <p>
                        © {new Date().getFullYear()} {siteSettings.site_name}. Tous droits réservés.
                    </p>
                    <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                        <Link href={route('pages.legal-notice')} className="hover:text-white">
                            Mentions légales
                        </Link>
                        <Link href={route('pages.privacy-policy')} className="hover:text-white">
                            Politique de confidentialité
                        </Link>
                    </p>
                </div>
            </footer>
        </div>
    );
}
