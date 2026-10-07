/**
 * Assistant de candidature en étapes (téléphone). Les règles de contrôle reprennent celles de
 * Site\CandidatureController::store : cinq champs obligatoires, le reste est facultatif. Le serveur reste juge ;
 * ce contrôle évite seulement d'envoyer un dossier qu'il refuserait.
 */

export interface CandidatureData {
    formation_id: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    gender: string;
    email: string;
    phone: string;
    address: string;
    guardian_name: string;
    guardian_phone: string;
    last_school: string;
    last_diploma: string;
    motivation: string;
    documents: File[];
    /** Piège anti-robots : champ caché qui doit rester vide (voir App\Support\Honeypot). */
    website_url: string;
}

export type CandidatureErrors = Partial<Record<keyof CandidatureData, string>>;

export const STEPS = [
    { key: 'formation', label: 'Formation' },
    { key: 'identite', label: 'Vous' },
    { key: 'parcours', label: 'Parcours' },
    { key: 'documents', label: 'Documents' },
] as const;

export const LAST_STEP = STEPS.length - 1;

const FIELD_STEP: Record<string, number> = {
    formation_id: 0,
    first_name: 1,
    last_name: 1,
    birth_date: 1,
    gender: 1,
    email: 1,
    phone: 1,
    address: 1,
    guardian_name: 2,
    guardian_phone: 2,
    last_school: 2,
    last_diploma: 2,
    motivation: 2,
    documents: 3,
};

/** Étape qui contient un champ ; les erreurs de fichiers arrivent sous la forme « documents.0 ». */
export function stepOfField(field: string): number {
    return FIELD_STEP[field.split('.')[0]] ?? 0;
}

/** Première étape qui porte une erreur parmi les champs donnés (0 s'il n'y en a pas). */
export function firstStepWithError(fields: string[]): number {
    return fields.length === 0 ? 0 : Math.min(...fields.map(stepOfField));
}

const REQUIRED: Record<number, [keyof CandidatureData, string][]> = {
    0: [['formation_id', 'Choisissez une formation.']],
    1: [
        ['first_name', 'Indiquez votre prénom.'],
        ['last_name', 'Indiquez votre nom.'],
        ['email', 'Indiquez votre adresse e-mail.'],
        ['phone', 'Indiquez votre numéro de téléphone.'],
    ],
};

/** Champs manquants ou invalides de l'étape demandée. Vide = on peut passer à la suite. */
export function validateStep(step: number, data: CandidatureData): CandidatureErrors {
    const errors: CandidatureErrors = {};

    for (const [field, message] of REQUIRED[step] ?? []) {
        if (!String(data[field] ?? '').trim()) errors[field] = message;
    }

    if (step === 1 && !errors.email && !/^\S+@\S+\.\S+$/.test(data.email.trim())) {
        errors.email = "Cette adresse e-mail n'a pas l'air valide.";
    }

    return errors;
}

/* Brouillon : le texte saisi survit à un rechargement ou à un retour en arrière, le temps de l'onglet. */

const DRAFT_KEY = 'eeht:candidature-draft';

const DRAFT_FIELDS = [
    'formation_id',
    'first_name',
    'last_name',
    'birth_date',
    'gender',
    'email',
    'phone',
    'address',
    'guardian_name',
    'guardian_phone',
    'last_school',
    'last_diploma',
    'motivation',
] as const;

export type Draft = Partial<Pick<CandidatureData, (typeof DRAFT_FIELDS)[number]>>;

export function loadDraft(): Draft {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

        return Object.fromEntries(DRAFT_FIELDS.filter((field) => typeof parsed[field] === 'string').map((field) => [field, parsed[field]])) as Draft;
    } catch {
        return {};
    }
}

export function saveDraft(data: CandidatureData): void {
    try {
        const draft = Object.fromEntries(DRAFT_FIELDS.map((field) => [field, data[field]]));

        if (Object.values(draft).every((value) => value === '')) {
            sessionStorage.removeItem(DRAFT_KEY);
        } else {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    } catch {
        // Stockage plein ou bloqué (navigation privée) : on perd seulement le brouillon.
    }
}

export function clearDraft(): void {
    try {
        sessionStorage.removeItem(DRAFT_KEY);
    } catch {
        // Voir saveDraft.
    }
}
