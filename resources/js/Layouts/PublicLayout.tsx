import { Link, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    Clock,
    Facebook,
    Home,
    Instagram,
    Linkedin,
    Mail,
    MapPin,
    Menu,
    MessageCircle,
    Phone,
    User,
    X,
    Youtube,
} from 'lucide-react';
import { PropsWithChildren, useEffect, useState } from 'react';
import { PageProps } from '@/types';
import SiteLogo from '@/Components/SiteLogo';

const navigation = [
    { name: 'Accueil', href: 'home', active: (c: string) => c === 'home' },
    { name: "À propos", href: 'pages.about', active: (c: string) => c === 'pages.about' },
    { name: 'Formations', href: 'formations.index', active: (c: string) => c.startsWith('formations.') },
    { name: 'Actualités', href: 'news.index', active: (c: string) => c.startsWith('news.') },
    { name: 'Événements', href: 'events.index', active: (c: string) => c.startsWith('events.') },
    { name: 'Galerie', href: 'gallery.index', active: (c: string) => c.startsWith('gallery.') },
    { name: 'Contact', href: 'pages.contact', active: (c: string) => c === 'pages.contact' },
];

export default function PublicLayout({ children }: PropsWithChildren) {
    const { props } = usePage<PageProps>();
    const { auth, siteSettings, flash } = props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-white text-ink-900">
            <header
                className={`sticky top-0 z-50 border-b border-ink-100/60 bg-white shadow-sm transition-all lg:border-b-0 lg:backdrop-blur ${
                    scrolled
                        ? 'lg:bg-white/95 lg:shadow-sm'
                        : 'lg:bg-white/70 lg:shadow-none'
                }`}
            >
                <div className="border-b border-ink-100/60 bg-ink-900 text-ink-100">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6 lg:px-8">
                        <div className="hidden items-center gap-4 sm:flex">
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
                                <a href={siteSettings.facebook_url} target="_blank" rel="noreferrer" className="text-ink-200 hover:text-gold-400">
                                    <Facebook className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {siteSettings.instagram_url && (
                                <a href={siteSettings.instagram_url} target="_blank" rel="noreferrer" className="text-ink-200 hover:text-gold-400">
                                    <Instagram className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {siteSettings.whatsapp_url && (
                                <a href={siteSettings.whatsapp_url} target="_blank" rel="noreferrer" className="text-ink-200 hover:text-gold-400">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {siteSettings.linkedin_url && (
                                <a href={siteSettings.linkedin_url} target="_blank" rel="noreferrer" className="text-ink-200 hover:text-gold-400">
                                    <Linkedin className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {siteSettings.youtube_url && (
                                <a href={siteSettings.youtube_url} target="_blank" rel="noreferrer" className="text-ink-200 hover:text-gold-400">
                                    <Youtube className="h-3.5 w-3.5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-1.5">
                        {!route().current('home') && (
                            <button
                                onClick={() => window.history.back()}
                                aria-label="Retour"
                                className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 lg:hidden"
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
                        {navigation.map((item) => {
                            const isActive = item.active(route().current() as string);
                            return (
                                <Link
                                    key={item.href}
                                    href={route(item.href)}
                                    className={`group relative py-1 text-sm font-medium transition-colors duration-150 ${
                                        isActive ? 'text-gold-600' : 'text-ink-700 hover:text-gold-600'
                                    }`}
                                >
                                    {item.name}
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
                                className="text-sm font-semibold text-ink-700 hover:text-gold-600"
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

                    <button
                        className="lg:hidden"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Ouvrir le menu"
                    >
                        <Menu className="h-6 w-6 text-ink-900" />
                    </button>
                </nav>

                {mobileOpen && (
                    <div className="fixed inset-0 z-50 bg-ink-950/60 lg:hidden">
                        <div className="absolute inset-y-0 right-0 w-full max-w-xs bg-white p-6 shadow-xl">
                            <div className="mb-8 flex items-center justify-between">
                                <span className="font-serif text-lg font-bold">
                                    Menu
                                </span>
                                <button onClick={() => setMobileOpen(false)}>
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-4">
                                {navigation.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={route(item.href)}
                                        onClick={() => setMobileOpen(false)}
                                        className={`text-base font-medium ${
                                            item.active(route().current() as string)
                                                ? 'text-gold-600'
                                                : 'text-ink-800'
                                        }`}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                                <hr className="my-2 border-ink-100" />
                                {auth.user ? (
                                    <Link
                                        href={route('dashboard')}
                                        className="text-base font-semibold text-ink-900"
                                    >
                                        Mon espace
                                    </Link>
                                ) : (
                                    <Link
                                        href={route('login')}
                                        className="text-base font-semibold text-ink-900"
                                    >
                                        Connexion
                                    </Link>
                                )}
                                <Link
                                    href={route('candidature.create')}
                                    className="rounded-full bg-gold-500 px-5 py-3 text-center text-sm font-semibold text-ink-900"
                                >
                                    Candidater maintenant
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {flash?.success && (
                <div className="bg-emerald-600 px-4 py-2 text-center text-sm text-white">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
                    {flash.error}
                </div>
            )}

            <main className="flex-1 pb-16 lg:pb-0">{children}</main>

            <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-ink-100 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)] lg:hidden">
                <Link
                    href={route('home')}
                    className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                        route().current('home') ? 'text-gold-600' : 'text-ink-500'
                    }`}
                >
                    <Home className="h-5 w-5" />
                    Accueil
                </Link>
                <button
                    onClick={() => window.history.back()}
                    className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-ink-500"
                >
                    <ChevronLeft className="h-5 w-5" />
                    Retour
                </button>
                <Link
                    href={auth.user ? route('dashboard') : route('login')}
                    className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                        route().current('dashboard') || route().current('login')
                            ? 'text-gold-600'
                            : 'text-ink-500'
                    }`}
                >
                    <User className="h-5 w-5" />
                    Mon compte
                </Link>
            </nav>

            <footer className="hidden bg-ink-950 text-ink-200 lg:block">
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-5 lg:px-8">
                    <div>
                        <div className="mb-4 flex items-center gap-2.5">
                            <SiteLogo size={40} tone="gold" />
                            <span className="font-serif text-lg font-bold text-white">
                                EEHT de Thiès
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-ink-400">
                            Elite École Hôtelière et Touristique de Thiès —
                            former les talents de demain dans l'hôtellerie, la
                            restauration et le tourisme.
                        </p>
                    </div>

                    <div>
                        <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-gold-400">
                            Navigation
                        </h3>
                        <ul className="space-y-2.5 text-sm text-ink-400">
                            {navigation.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={route(item.href)}
                                        className="hover:text-white"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-gold-400">
                            Ressources
                        </h3>
                        <ul className="space-y-2.5 text-sm text-ink-400">
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
                        <ul className="space-y-2.5 text-sm text-ink-400">
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
                        <ul className="space-y-3 text-sm text-ink-400">
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
                <div className="border-t border-white/10 px-4 py-6 text-center text-xs text-ink-500">
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
