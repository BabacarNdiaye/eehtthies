import {
    BedDouble,
    BookOpen,
    Briefcase,
    Calculator,
    Calendar,
    CalendarOff,
    ChefHat,
    ClipboardCheck,
    ConciergeBell,
    Croissant,
    Dumbbell,
    Globe,
    GraduationCap,
    Home,
    Languages,
    Laptop,
    Library,
    LucideIcon,
    Map,
    Medal,
    MessageCircle,
    NotebookText,
    Palette,
    PenSquare,
    Plane,
    Receipt,
    ShieldCheck,
    Users,
    UtensilsCrossed,
    Wine,
} from 'lucide-react';

/** Cours de l'emploi du temps, tel que l'envoie le serveur (relations Eloquent en snake_case). */
export interface PortalEntry {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject?: { id: number; name: string } | null;
    teacher?: { id: number; first_name: string; last_name: string } | null;
    room?: { id: number; name: string } | null;
    school_class?: { id: number; name: string } | null;
}

/** Cours en cours ou prochain cours (calculé par App\Support\ClassSchedule). */
export interface NextClass {
    state: 'ongoing' | 'upcoming';
    entry: PortalEntry;
    starts_at: string;
    ends_at: string;
    day_label: string;
}

/** Élément du carrousel « À la une » (App\Services\PortalFeed). */
export interface FeedItem {
    id: string;
    kind: 'announcement' | 'news';
    title: string;
    excerpt: string;
    priority: 'normale' | 'importante' | 'urgente' | null;
    unread: boolean;
    date: string;
    url: string;
    image: string | null;
}

export interface SubjectSummary {
    id: number;
    name: string;
    teacher: string | null;
    average: number | null;
}

/** Retire les accents et met en minuscules, pour comparer des noms de matières. */
function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

// Dégradés vifs, volontairement indépendants du thème de l'école (comme les tuiles de la maquette).
// Les classes sont écrites en entier pour que Tailwind les détecte.
const GRADIENTS = [
    'from-rose-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-sky-500 to-blue-600',
    'from-amber-500 to-orange-600',
    'from-fuchsia-500 to-pink-600',
    'from-lime-500 to-green-600',
    'from-cyan-500 to-teal-600',
    'from-indigo-500 to-blue-700',
    'from-orange-500 to-red-600',
    'from-teal-400 to-emerald-600',
    'from-yellow-400 to-amber-600',
    'from-pink-500 to-rose-700',
    'from-blue-500 to-indigo-700',
];

// Mot-clé (sans accent) → icône, du plus précis au plus général : premier qui correspond.
const SUBJECT_ICONS: [RegExp, LucideIcon][] = [
    [/patisser|boulang|viennoiser|chocolat|dessert/, Croissant],
    [/cuisin|culinaire|gastronom|restauration chaude/, ChefHat],
    [/sommell|vin|oenolog|bar\b|barman|cocktail/, Wine],
    [/restaur|salle|service|table/, UtensilsCrossed],
    [/accueil|reception|conciergerie|relation client/, ConciergeBell],
    [/hebergement|etage|housekeeping|chambre|hotel|gouvernance/, BedDouble],
    [/tourism|voyage|guid|agence|excursion|animation/, Plane],
    [/geograph|patrimoine|culture/, Map],
    [/anglais|francais|espagnol|langue|communication|expression/, Languages],
    [/math|calcul|statist|compta/, Calculator],
    [/gestion|economie|marketing|droit|legislation|management|commerce|entrepreneur/, Briefcase],
    [/informatique|numerique|bureautique|digital|logiciel/, Laptop],
    [/sport|eps|physique|gym/, Dumbbell],
    [/hygiene|haccp|securite|sante|secourisme/, ShieldCheck],
    [/art|dessin|decor|floral|esthetique/, Palette],
    [/international|monde|geopolitique/, Globe],
];

/** Hachage djb2 : répartit bien des noms de longueur voisine (une simple somme des codes en regroupe beaucoup). */
function hash(text: string): number {
    let value = 5381;

    for (const char of text) {
        value = ((value << 5) + value + char.charCodeAt(0)) >>> 0;
    }

    return value;
}

/** Icône et dégradé d'une matière : l'icône vient du nom, le dégradé en est déduit de façon stable. */
export function subjectStyle(name: string): { icon: LucideIcon; gradient: string } {
    const key = normalize(name);
    const icon = SUBJECT_ICONS.find(([pattern]) => pattern.test(key))?.[1] ?? BookOpen;

    return { icon, gradient: GRADIENTS[hash(key) % GRADIENTS.length] };
}

/** Dégradé stable pour un libellé quelconque (nom de classe, p. ex.). */
export function gradientFor(label: string): string {
    return GRADIENTS[hash(normalize(label)) % GRADIENTS.length];
}

export function formatAmount(value: number): string {
    return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

export function formatAverage(value: number): string {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

/** « 09:00:00 » ou « 09:00 » → « 09:00 ». Les heures de cours sont affichées telles quelles, sans fuseau. */
export function hhmm(time: string): string {
    return time.slice(0, 5);
}

export function greeting(date = new Date()): string {
    const hour = date.getHours();

    if (hour < 5) return 'Bonsoir';
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';

    return 'Bonsoir';
}

export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

/** Durée restante lisible : « 25 min », « 1 h 05 », « 2 j ». */
export function formatDuration(ms: number): string {
    const minutes = Math.max(0, Math.round(ms / 60000));

    if (minutes < 1) return 'moins d’une minute';
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        const rest = minutes % 60;

        return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
    }

    return `${Math.floor(hours / 24)} j`;
}

/** Retour haptique léger sur les appareils qui le permettent (Android) ; sans effet ailleurs. */
export function haptic(duration = 8): void {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(duration);
    } catch {
        // Non pris en charge ou bloqué : sans conséquence.
    }
}

/** Icône d'une rubrique des espaces, d'après le nom de sa route (menu latéral d'ordinateur et feuille Menu). */
export function navIcon(href: string): LucideIcon {
    if (href.includes('dashboard')) return Home;
    if (href.includes('timetable')) return Calendar;
    if (href.includes('grades')) return GraduationCap;
    if (href.includes('exams')) return PenSquare;
    if (href.includes('lesson-log')) return NotebookText;
    if (href.includes('attendance')) return ClipboardCheck;
    if (href.includes('leave')) return CalendarOff;
    if (href.includes('skills')) return Medal;
    if (href.includes('library')) return Library;
    if (href.includes('invoices')) return Receipt;
    if (href.includes('connect')) return MessageCircle;
    if (href.includes('classes') || href.includes('child')) return Users;

    return Home;
}

/** Couleur d'une moyenne sur 20 : vert à partir de 14, doré à partir de 10, rouge en dessous. */
export function averageTone(value: number): { ring: string; text: string; soft: string } {
    if (value >= 14) return { ring: 'stroke-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50 text-emerald-700' };
    if (value >= 10) return { ring: 'stroke-gold-500', text: 'text-gold-700', soft: 'bg-gold-50 text-gold-800' };

    return { ring: 'stroke-red-500', text: 'text-red-600', soft: 'bg-red-50 text-red-700' };
}
