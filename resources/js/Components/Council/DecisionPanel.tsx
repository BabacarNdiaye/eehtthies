import { Checkbox, Textarea, TextInput } from '@/Components/Admin/Field';
import AppreciationPicker, { BankEntry } from '@/Components/Council/AppreciationPicker';
import { toneClasses } from '@/lib/council';
import { StudentDraft } from '@/hooks/useCouncilAutosave';

export interface SessionDecisionType {
    id: number;
    label: string;
    category: string;
    color: string;
    requires_reason: boolean;
    /** Décision soumise à vote (PAR-02) : la délibération ne se clôt pas sans vote adopté. */
    requires_vote?: boolean;
    incompatible_ids: number[];
}

interface Props {
    draft: StudentDraft;
    types: SessionDecisionType[];
    categories: Record<string, string>;
    /** `undefined` masque l'encart (vue partagée, rectification) ; `null` affiche « Aucune ». */
    recommendation?: SessionDecisionType | null;
    readOnly: boolean;
    onChange: (draft: StudentDraft) => void;
    /** Banque d'appréciations (DEC-03) ; absente, le bouton n'est pas proposé. */
    bank?: { entries: BankEntry[]; levels: Record<string, string>; themes: Record<string, string> };
}

/**
 * Choix des décisions d'un élève (colonne de droite du mode conseil). Les règles RG-08 à RG-10 sont reflétées ici (cases
 * grisées, avec la raison), mais le serveur les garantit : c'est lui qui refuse un ensemble incompatible.
 */
export default function DecisionPanel({ draft, types, categories, recommendation, readOnly, onChange, bank }: Props) {
    const chosenIds = draft.decisions.map((decision) => decision.decision_type_id);
    const chosen = types.filter((type) => chosenIds.includes(type.id));

    const blockedBy = (type: SessionDecisionType): string | null => {
        if (chosenIds.includes(type.id)) return null;
        if ((type.category === 'distinction' || type.category === 'orientation') && chosen.some((other) => other.category === type.category)) {
            return type.category === 'distinction' ? 'une seule distinction' : 'une seule orientation';
        }
        if (type.category === 'distinction' && chosen.some((other) => other.category === 'alert')) return 'incompatible avec une alerte';
        if (type.category === 'alert' && chosen.some((other) => other.category === 'distinction')) return 'incompatible avec une distinction';
        const clash = chosen.find((other) => other.incompatible_ids.includes(type.id) || type.incompatible_ids.includes(other.id));

        return clash ? `incompatible avec « ${clash.label} »` : null;
    };

    const toggle = (type: SessionDecisionType, on: boolean) =>
        onChange({
            ...draft,
            decisions: on ? [...draft.decisions, { decision_type_id: type.id, reason: null }] : draft.decisions.filter((decision) => decision.decision_type_id !== type.id),
        });

    const setReason = (typeId: number, reason: string) =>
        onChange({ ...draft, decisions: draft.decisions.map((decision) => (decision.decision_type_id === typeId ? { ...decision, reason } : decision)) });

    return (
        <div className="space-y-5">
            {recommendation !== undefined && (
                <div className="rounded-xl bg-ink-50 p-3 text-sm">
                    <p className="text-ink-500">Recommandation du professeur principal</p>
                    <p className="font-semibold text-ink-900">{recommendation ? recommendation.label : 'Aucune'}</p>
                </div>
            )}

            {Object.entries(categories).map(([category, label]) => {
                const options = types.filter((type) => type.category === category);
                if (options.length === 0) return null;

                return (
                    <fieldset key={category}>
                        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</legend>
                        <ul className="space-y-1.5">
                            {options.map((type) => {
                                const checked = chosenIds.includes(type.id);
                                const blocked = blockedBy(type);
                                const reason = draft.decisions.find((decision) => decision.decision_type_id === type.id)?.reason ?? '';

                                return (
                                    <li key={type.id}>
                                        <label className={`flex items-start gap-2 text-sm ${blocked ? 'text-ink-400' : 'text-ink-900'}`}>
                                            <Checkbox className="mt-0.5" checked={checked} disabled={readOnly || blocked !== null} onChange={(e) => toggle(type, e.target.checked)} />
                                            <span>
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses(type.color)}`}>{type.label}</span>
                                                {blocked && <span className="ml-1 text-xs">({blocked})</span>}
                                            </span>
                                        </label>
                                        {checked && (
                                            <TextInput
                                                className="mt-1.5"
                                                aria-label={`Motif de « ${type.label} »${type.requires_reason ? ' (obligatoire)' : ''}`}
                                                placeholder={type.requires_reason ? 'Motif (obligatoire)' : 'Motif (facultatif)'}
                                                value={reason}
                                                disabled={readOnly}
                                                onChange={(e) => setReason(type.id, e.target.value)}
                                            />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </fieldset>
                );
            })}

            <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="general-appreciation" className="block text-sm font-semibold text-ink-900">
                        Appréciation générale du conseil
                    </label>
                    {bank && bank.entries.length > 0 && (
                        <AppreciationPicker
                            bank={bank.entries}
                            levels={bank.levels}
                            themes={bank.themes}
                            disabled={readOnly}
                            onPick={(text) => onChange({ ...draft, general_appreciation: draft.general_appreciation.trim() ? `${draft.general_appreciation.trim()} ${text}` : text })}
                        />
                    )}
                </div>
                <Textarea
                    id="general-appreciation"
                    rows={5}
                    disabled={readOnly}
                    value={draft.general_appreciation}
                    onChange={(e) => onChange({ ...draft, general_appreciation: e.target.value })}
                />
                <p className="mt-1 text-xs text-ink-500">Publiable sur le bulletin. Obligatoire pour clore la délibération.</p>
            </div>
        </div>
    );
}
