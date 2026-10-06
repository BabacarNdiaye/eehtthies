/**
 * Conseil de classe : types et libellés partagés par les écrans d'administration, de séance et des portails.
 * Les classes Tailwind sont écrites en entier pour que le compilateur les détecte.
 */

export interface DecisionTypeRow {
    id: number;
    code: string;
    label: string;
    category: string;
    color: string;
    sort_order: number;
    is_active: boolean;
    is_published_on_report: boolean;
    is_end_of_year_only: boolean;
    requires_vote: boolean;
    creates_follow_up: boolean;
    requires_reason: boolean;
    report_mention: string | null;
    report_decision: string | null;
    incompatible_ids: number[];
    is_used: boolean;
}

export interface ThresholdValues {
    max_average: number | null;
    unjustified_absence_hours: number | null;
    failed_subjects_count: number | null;
    progression_drop: number | null;
    sanction_level: string | null;
}

export type ThresholdSet = Partial<Record<'orange' | 'red', ThresholdValues>>;

export interface SubjectGroupRow {
    id: number;
    code: string;
    label: string;
    sort_order: number;
    subjects_count: number;
}

export interface SubjectRow {
    id: number;
    name: string;
    formation: string | null;
    coefficient: number;
    subject_group_id: number | null;
}

export interface CouncilRules {
    double_validation: boolean;
    appeal_days: number;
    default_absence_hours: number;
    /** Règles de vote (PAR-08). */
    vote_functions: string[];
    vote_majority: string;
    vote_casting: boolean;
    vote_secrecy: string;
    vote_mode: string;
    /** Message aux familles (PAR-10). */
    family_notify: boolean;
    family_subject: string;
    family_message: string;
}

/** Teinte d'un type de décision (DecisionType::TONES) : pastille lisible, texte foncé sur fond clair. */
export const TONE_CLASSES: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-900 ring-emerald-600/20',
    sky: 'bg-sky-100 text-sky-900 ring-sky-600/20',
    violet: 'bg-violet-100 text-violet-900 ring-violet-600/20',
    amber: 'bg-amber-100 text-amber-900 ring-amber-600/20',
    orange: 'bg-orange-100 text-orange-900 ring-orange-600/20',
    red: 'bg-red-100 text-red-900 ring-red-600/20',
    ink: 'bg-ink-100 text-ink-800 ring-ink-500/20',
};

/** Pastille pleine, pour l'aperçu d'une teinte dans une liste de choix. */
export const TONE_SWATCH: Record<string, string> = {
    emerald: 'bg-emerald-600',
    sky: 'bg-sky-600',
    violet: 'bg-violet-600',
    amber: 'bg-amber-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600',
    ink: 'bg-ink-600',
};

export const toneClasses = (tone: string): string => TONE_CLASSES[tone] ?? TONE_CLASSES.ink;
