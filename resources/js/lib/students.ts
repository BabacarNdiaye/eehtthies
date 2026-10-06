import { Paginated } from '@/types';

/**
 * Types et petites fonctions de la page « Élèves » (aperçu des promotions et liste par portée). Les formes décrites ici
 * sont celles que prépare App\Support\StudentDirectory : toute évolution se fait des deux côtés, et
 * StudentDirectoryTest verrouille le côté serveur.
 */

export const statusLabels = {
    actif: 'Actif',
    suspendu: 'Suspendu',
    diplome: 'Diplômé',
    transfere: 'Transféré',
    abandon: 'Abandon',
    exclu: 'Exclu',
} as const;

export type StudentStatus = keyof typeof statusLabels;

/** Libellés des pastilles de filtre (le pluriel : « 12 Actifs »). */
export const statusPlurals: Record<StudentStatus, string> = {
    actif: 'Actifs',
    suspendu: 'Suspendus',
    diplome: 'Diplômés',
    transfere: 'Transférés',
    abandon: 'Abandons',
    exclu: 'Exclus',
};

export const statusKeys = Object.keys(statusLabels) as StudentStatus[];

export interface DossierItem {
    key: string;
    label: string;
    ok: boolean;
}

export interface StudentRow {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    gender: 'M' | 'F' | null;
    status: StudentStatus;
    is_repeating: boolean;
    photo_url: string | null;
    birth_date: string | null;
    birth_place: string | null;
    address: string | null;
    phone: string | null;
    /** Le numéro de l'élève mis en forme (« +221 77 187 79 18 »), ou tel que saisi quand ce n'est pas un numéro. */
    phone_display: string | null;
    email: string | null;
    professional_email: string | null;
    emergency_contact: string | null;
    formation: { id: number; name: string } | null;
    school_class: { id: number; name: string } | null;
    level: string | null;
    year: string | null;
    contact: {
        owner: 'student' | 'guardian' | null;
        display: string | null;
        tel: string | null;
        whatsapp: string | null;
        email: string | null;
    };
    guardian: { name: string | null; phone: string | null; email: string | null };
    dossier: { done: number; total: number; items: DossierItem[]; missing: string[] };
    created_at: string | null;
    /** Seulement pour qui peut voir la comptabilité. */
    balance?: number;
    late?: boolean;
}

export interface ClassNode {
    id: number;
    name: string;
    count: number;
    incomplete: number;
    capacity: number | null;
    year: string | null;
    level: string | null;
}

export interface LevelNode {
    id: number;
    label: string;
    number: number;
    count: number;
    incomplete: number;
    classes: ClassNode[];
}

export interface FormationNode {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    capacity: number | null;
    count: number;
    incomplete: number;
    unassigned: number;
    levels: LevelNode[];
    classes: ClassNode[];
}

export interface DiplomaGroup {
    key: string;
    label: string;
    title: string | null;
    count: number;
    formations: FormationNode[];
}

export interface Tree {
    total: number;
    unassigned: number;
    no_formation: number;
    groups: DiplomaGroup[];
}

export interface Filters {
    year: string;
    formation_id: string;
    formation_level_id: string;
    school_class_id: string;
    status: string;
    search: string;
    incomplete: boolean;
    sort: string;
    list: boolean;
    highlight: number | null;
}

export interface Defaults {
    year: string;
    status: string;
}

export interface YearOption {
    id: number;
    label: string;
    is_current: boolean;
    count: number;
}

export interface Scope {
    kind: 'class' | 'level' | 'formation' | 'unassigned' | 'no_formation' | 'search' | 'incomplete' | 'all';
    title: string;
    diploma: { key: string; label: string } | null;
    formation: { id: number; name: string } | null;
    level: { id: number; label: string } | null;
    class: { id: number; name: string; capacity: number | null; year: string | null; level: string | null; active: number } | null;
}

export interface StudentsPageProps {
    mode: 'overview' | 'directory';
    filters: Filters;
    defaults: Defaults;
    years: YearOption[];
    allYearsCount: number;
    tree: Tree;
    stats: { students: number; classes: number; unassigned: number; incomplete: number };
    statusCounts: Record<string, number>;
    incompleteCount: number;
    scope: Scope | null;
    students: Paginated<StudentRow> | null;
    classCounts: Record<string, number>;
    elsewhere: { count: number } | null;
    canSeeFinance: boolean;
}

/** Ce qu'une action de navigation change : les filtres qu'on lui donne remplacent ceux de la vue en cours. */
export type Patch = Partial<Filters>;

/** Les filtres de portée vidés : on revient sur l'aperçu, ou on repart d'une autre promotion. */
export const noScope: Patch = { formation_id: '', formation_level_id: '', school_class_id: '', list: false, incomplete: false, search: '' };

/**
 * Paramètres d'adresse d'une vue. Les valeurs par défaut (année en cours, statut « actif », tri par nom) n'y figurent
 * pas : les adresses restent courtes et celles d'hier restent valables. La fiche à mettre en évidence n'est jamais
 * reprise d'une vue à l'autre.
 */
export function queryFor(filters: Filters, defaults: Defaults, patch: Patch = {}): Record<string, string> {
    const next = { ...filters, highlight: null, ...patch };
    const query: Record<string, string> = {};

    if (next.year !== defaults.year) query.year = next.year;
    if (next.status !== defaults.status) query.status = next.status;
    if (next.formation_id) query.formation_id = next.formation_id;
    if (next.formation_level_id) query.formation_level_id = next.formation_level_id;
    if (next.school_class_id) query.school_class_id = next.school_class_id;
    if (next.search.trim()) query.search = next.search.trim();
    if (next.incomplete) query.incomplete = '1';
    if (next.sort !== 'name') query.sort = next.sort;
    if (next.list) query.list = '1';

    return query;
}

/** Les filtres d'une vue pour un export : année et statut toujours explicites (sans eux, l'export prendrait toute l'école). */
export function exportQuery(filters: Filters): Record<string, string> {
    const query: Record<string, string> = { year: filters.year, status: filters.status };

    if (filters.formation_id) query.formation_id = filters.formation_id;
    if (filters.formation_level_id) query.formation_level_id = filters.formation_level_id;
    if (filters.school_class_id) query.school_class_id = filters.school_class_id;
    if (filters.search.trim()) query.search = filters.search.trim();
    if (filters.incomplete) query.incomplete = '1';

    return query;
}

export function fullName(student: Pick<StudentRow, 'first_name' | 'last_name'>): string {
    return `${student.first_name} ${student.last_name}`.trim();
}

export function initialsOf(student: Pick<StudentRow, 'first_name' | 'last_name'>): string {
    const letters = [student.first_name, student.last_name].map((part) => part.trim().charAt(0)).join('');

    return (letters || '?').toUpperCase();
}

// Teintes assez sombres pour que les initiales blanches restent lisibles (contraste d'au moins 4,5:1).
const avatarTones = ['bg-ink-700', 'bg-gold-700', 'bg-blue-600', 'bg-emerald-700', 'bg-rose-600', 'bg-purple-600'];

export function avatarTone(student: Pick<StudentRow, 'id' | 'first_name' | 'last_name'>): string {
    const seed = `${student.first_name}${student.last_name}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), student.id);

    return avatarTones[seed % avatarTones.length];
}

/** Âge en années révolues à partir d'une date « AAAA-MM-JJ » ; null si la date manque ou est incohérente. */
export function ageFrom(birthDate: string | null, today: Date = new Date()): number | null {
    if (!birthDate) return null;

    const born = new Date(`${birthDate}T00:00:00`);

    if (Number.isNaN(born.getTime()) || born > today) return null;

    let age = today.getFullYear() - born.getFullYear();

    if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age -= 1;

    return age;
}

export function longDate(value: string | null): string | null {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface Section {
    /** L'identifiant de la classe, ou « none » pour les élèves sans classe. */
    key: string;
    class: StudentRow['school_class'];
    level: string | null;
    year: string | null;
    students: StudentRow[];
}

/** Découpe une page de résultats en sections de classe (les élèves arrivent déjà triés par classe) : un en-tête par classe. */
export function sectionsOf(students: StudentRow[]): Section[] {
    const sections: Section[] = [];

    for (const student of students) {
        const key = String(student.school_class?.id ?? 'none');
        const last = sections[sections.length - 1];

        if (last && last.key === key) {
            last.students.push(student);
        } else {
            sections.push({ key, class: student.school_class, level: student.level, year: student.year, students: [student] });
        }
    }

    return sections;
}

/** « 1 élève », « 12 élèves » : le pluriel français, qui compte zéro au singulier. */
export function studentCount(count: number): string {
    return `${count} élève${count > 1 ? 's' : ''}`;
}
