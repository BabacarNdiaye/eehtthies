import { SiteSettings } from '@/types';
import {
    Award,
    Briefcase,
    BriefcaseBusiness,
    CalendarDays,
    Camera,
    ClipboardCheck,
    GraduationCap,
    Handshake,
    HelpCircle,
    Home,
    Info,
    LucideIcon,
    Mail,
    MapPin,
    MessageCircle,
    Newspaper,
    Phone,
    Quote,
    Users,
} from 'lucide-react';

/** Une rubrique du site public : nom de route Ziggy, icône, et règle qui dit si la page courante lui appartient. */
export interface PublicLink {
    key: string;
    label: string;
    route: string;
    icon: LucideIcon;
    match: (current: string) => boolean;
}

const is = (name: string) => (current: string) => current === name;
const under = (prefix: string) => (current: string) => current.startsWith(prefix);

/** Rubriques principales : menu d'ordinateur et début de la feuille Menu du téléphone. */
export const mainLinks: PublicLink[] = [
    { key: 'home', label: 'Accueil', route: 'home', icon: Home, match: is('home') },
    { key: 'about', label: 'À propos', route: 'pages.about', icon: Info, match: is('pages.about') },
    { key: 'formations', label: 'Formations', route: 'formations.index', icon: GraduationCap, match: under('formations.') },
    { key: 'news', label: 'Actualités', route: 'news.index', icon: Newspaper, match: under('news.') },
    { key: 'events', label: 'Événements', route: 'events.index', icon: CalendarDays, match: under('events.') },
    { key: 'gallery', label: 'Galerie', route: 'gallery.index', icon: Camera, match: under('gallery.') },
    { key: 'contact', label: 'Contact', route: 'pages.contact', icon: Mail, match: is('pages.contact') },
];

/** Autres rubriques : dans le pied de page sur ordinateur, dans la feuille Menu sur téléphone (où il n'y a pas de place pour le pied de page). */
export const moreLinks: PublicLink[] = [
    { key: 'teachers', label: 'Enseignants', route: 'pages.teachers', icon: Users, match: is('pages.teachers') },
    { key: 'testimonials', label: 'Témoignages', route: 'pages.testimonials', icon: Quote, match: is('pages.testimonials') },
    { key: 'faq', label: 'FAQ', route: 'pages.faq', icon: HelpCircle, match: is('pages.faq') },
    { key: 'partners', label: 'Partenaires', route: 'pages.partners', icon: Handshake, match: is('pages.partners') },
    { key: 'internships', label: 'Offres de stage', route: 'careers.internships.index', icon: Briefcase, match: is('careers.internships.index') },
    { key: 'jobs', label: "Offres d'emploi", route: 'careers.jobs.index', icon: BriefcaseBusiness, match: is('careers.jobs.index') },
    { key: 'alumni', label: 'Anciens élèves', route: 'community.alumni.index', icon: Award, match: is('community.alumni.index') },
    { key: 'track', label: 'Suivre ma candidature', route: 'candidature.track.form', icon: ClipboardCheck, match: under('candidature.track') },
];

export const legalLinks = [
    { label: 'Mentions légales', route: 'pages.legal-notice' },
    { label: 'Politique de confidentialité', route: 'pages.privacy-policy' },
];

export interface ContactAction {
    key: 'call' | 'whatsapp' | 'email' | 'directions';
    label: string;
    href: string;
    icon: LucideIcon;
    /** S'ouvre hors du site (WhatsApp, cartes) : nouvel onglet. */
    external: boolean;
}

/** Actions de contact rapide, seulement pour ce que l'administration a renseigné (Paramètres › informations de l'école). */
export function contactActions(settings: SiteSettings): ContactAction[] {
    const actions: ContactAction[] = [];

    if (settings.site_phone) {
        actions.push({ key: 'call', label: 'Appeler', href: `tel:${settings.site_phone.replace(/[^\d+]/g, '')}`, icon: Phone, external: false });
    }

    if (settings.whatsapp_url) {
        actions.push({ key: 'whatsapp', label: 'WhatsApp', href: settings.whatsapp_url, icon: MessageCircle, external: true });
    }

    if (settings.site_email) {
        actions.push({ key: 'email', label: 'E-mail', href: `mailto:${settings.site_email}`, icon: Mail, external: false });
    }

    if (settings.site_address) {
        actions.push({
            key: 'directions',
            label: 'Itinéraire',
            href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.site_address)}`,
            icon: MapPin,
            external: true,
        });
    }

    return actions;
}
