import Card from '@/Components/Admin/Card';
import Drawer from '@/Components/Admin/Drawer';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import DecisionPanel, { SessionDecisionType } from '@/Components/Council/DecisionPanel';
import { StudentDraft } from '@/hooks/useCouncilAutosave';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export interface ClosedStudent {
    id: number;
    name: string;
    general_appreciation: string | null;
    decisions: { id: number; decision_type_id: number; label: string | null; category: string | null; reason: string | null; status: string }[];
}

export interface AppealRow {
    id: number;
    student: string | null;
    decision: string | null;
    filed_at: string;
    filed_by_name: string;
    reason: string;
    deadline: string;
    outcome: string;
    outcome_label: string;
}

interface Props {
    councilId: number;
    students: ClosedStudent[];
    decisionTypes: SessionDecisionType[];
    categories: Record<string, string>;
    appeals: AppealRow[];
    appealDeadline: string | null;
    canRectify: boolean;
    canAppeal: boolean;
}

const day = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');
const keep = { preserveScroll: true } as const;

function RectifyForm({ councilId, student, decisionTypes, categories, onDone }: { councilId: number; student: ClosedStudent; decisionTypes: SessionDecisionType[]; categories: Record<string, string>; onDone: () => void }) {
    const active = student.decisions.filter((decision) => decision.status !== 'rectified');
    const [draft, setDraft] = useState<StudentDraft>({
        general_appreciation: student.general_appreciation ?? '',
        review_status: 'reviewed',
        decisions: active.map((decision) => ({ decision_type_id: decision.decision_type_id, reason: decision.reason })),
        revision: 0,
    });
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <form
            id="rectify-form"
            className="space-y-5"
            onSubmit={(e) => {
                e.preventDefault();
                router.post(
                    route('admin.councils.rectify', [councilId, student.id]),
                    { decisions: draft.decisions, general_appreciation: draft.general_appreciation, reason },
                    { ...keep, onError: (received) => setErrors(received as Record<string, string>), onSuccess: onDone },
                );
            }}
        >
            <DecisionPanel draft={draft} types={decisionTypes} categories={categories} readOnly={false} onChange={setDraft} />
            {errors.decisions && <p className="text-sm text-red-700">{errors.decisions}</p>}
            <Field label="Motif de la rectification" required error={errors.reason} hint="Conservé avec l’ancienne et la nouvelle valeur ; une nouvelle version du PV est générée.">
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
        </form>
    );
}

function AppealForm({ councilId, decisionId, onDone }: { councilId: number; decisionId: number; onDone: () => void }) {
    const form = useForm({ filed_at: new Date().toISOString().slice(0, 10), filed_by_name: '', reason: '' });

    return (
        <form
            id="appeal-form"
            className="space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                form.post(route('admin.councils.appeals.store', [councilId, decisionId]), { ...keep, onSuccess: onDone });
            }}
        >
            <Field label="Date de dépôt" required error={form.errors.filed_at}>
                <TextInput type="date" value={form.data.filed_at} onChange={(e) => form.setData('filed_at', e.target.value)} />
            </Field>
            <Field label="Déposé par" required error={form.errors.filed_by_name}>
                <TextInput value={form.data.filed_by_name} onChange={(e) => form.setData('filed_by_name', e.target.value)} placeholder="M. Diop (père)" />
            </Field>
            <Field label="Motif du recours" required error={form.errors.reason}>
                <Textarea rows={4} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
            </Field>
        </form>
    );
}

/** Après la clôture : rectification par la Direction (REC-01) et recours des familles (REC-02, REC-03). */
export default function ClosedCouncilTools({ councilId, students, decisionTypes, categories, appeals, appealDeadline, canRectify, canAppeal }: Props) {
    const [rectifying, setRectifying] = useState<ClosedStudent | null>(null);
    const [appealing, setAppealing] = useState<{ student: ClosedStudent; decisionId: number } | null>(null);
    const [outcome, setOutcome] = useState<Record<number, { type?: string; comment?: string }>>({});
    const [selectedId, setSelectedId] = useState('');
    const selected = students.find((student) => String(student.id) === selectedId) ?? null;
    const orientation = selected?.decisions.find((decision) => decision.category === 'orientation' && decision.status === 'active') ?? null;
    const orientationTypes = decisionTypes.filter((type) => type.category === 'orientation');
    const decide = (appealId: number, kind: 'upheld' | 'modified') =>
        router.post(
            route('admin.councils.appeals.decide', appealId),
            { outcome: kind, decision_type_id: kind === 'modified' ? Number(outcome[appealId]?.type) : null, comment: outcome[appealId]?.comment ?? '' },
            keep,
        );

    return (
        <Card className="mt-6 space-y-5 p-5">
            <div>
                <h2 className="font-serif text-base font-bold text-ink-900">Après la clôture</h2>
                <p className="text-sm text-ink-600">
                    Une rectification génère une nouvelle version du procès-verbal ; les précédentes restent consultables.
                    {appealDeadline && ` Recours possibles jusqu’au ${day(appealDeadline)}.`}
                </p>
            </div>

            {(canRectify || canAppeal) && (
                <div className="flex flex-wrap items-center gap-2">
                    <Select aria-label="Élève concerné" className="w-full sm:w-72" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                        <option value="">Choisir un élève…</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.name}
                            </option>
                        ))}
                    </Select>
                    {canRectify && (
                        <button type="button" disabled={!selected} onClick={() => selected && setRectifying(selected)} className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50">
                            Rectifier ses décisions
                        </button>
                    )}
                    {canAppeal && (
                        <button
                            type="button"
                            disabled={!selected || !orientation}
                            onClick={() => selected && orientation && setAppealing({ student: selected, decisionId: orientation.id })}
                            className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
                        >
                            Enregistrer un recours
                        </button>
                    )}
                    {selected && canAppeal && !orientation && <p className="basis-full text-xs text-ink-500">Le recours ne porte que sur une décision d’orientation active (conseil de fin d’année).</p>}
                </div>
            )}

            {appeals.length > 0 && (
                <div>
                    <h3 className="mb-2 font-semibold text-ink-900">Recours</h3>
                    <ul className="space-y-3">
                        {appeals.map((appeal) => (
                            <li key={appeal.id} className="rounded-lg border border-ink-100 p-3 text-sm">
                                <p className="font-medium text-ink-900">
                                    {appeal.student} — {appeal.decision} · <span className="text-ink-600">{appeal.outcome_label}</span>
                                </p>
                                <p className="text-ink-600">
                                    Déposé le {day(appeal.filed_at)} par {appeal.filed_by_name} : {appeal.reason}
                                </p>
                                {appeal.outcome === 'pending' && canRectify && (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
                                        <Select aria-label="Nouvelle orientation (si modifiée)" value={outcome[appeal.id]?.type ?? ''} onChange={(e) => setOutcome({ ...outcome, [appeal.id]: { ...outcome[appeal.id], type: e.target.value } })}>
                                            <option value="">Nouvelle orientation…</option>
                                            {orientationTypes.map((type) => (
                                                <option key={type.id} value={type.id}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </Select>
                                        <TextInput aria-label="Commentaire de la réponse" placeholder="Commentaire" value={outcome[appeal.id]?.comment ?? ''} onChange={(e) => setOutcome({ ...outcome, [appeal.id]: { ...outcome[appeal.id], comment: e.target.value } })} />
                                        <button type="button" onClick={() => decide(appeal.id, 'upheld')} className="rounded-lg border border-ink-200 px-3 py-2 font-semibold text-ink-700 hover:bg-ink-50">
                                            Maintenir
                                        </button>
                                        <button type="button" disabled={!outcome[appeal.id]?.type} onClick={() => decide(appeal.id, 'modified')} className="rounded-lg bg-ink-900 px-3 py-2 font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                                            Modifier
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <Drawer
                open={rectifying !== null}
                onClose={() => setRectifying(null)}
                title="Rectifier une décision"
                subtitle={rectifying?.name}
                footer={
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setRectifying(null)} className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700">
                            Annuler
                        </button>
                        <button type="submit" form="rectify-form" className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white">
                            Rectifier
                        </button>
                    </div>
                }
            >
                {rectifying && <RectifyForm councilId={councilId} student={rectifying} decisionTypes={decisionTypes} categories={categories} onDone={() => setRectifying(null)} />}
            </Drawer>

            <Drawer
                open={appealing !== null}
                onClose={() => setAppealing(null)}
                title="Recours de la famille"
                subtitle={appealing?.student.name}
                footer={
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setAppealing(null)} className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700">
                            Annuler
                        </button>
                        <button type="submit" form="appeal-form" className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white">
                            Enregistrer le recours
                        </button>
                    </div>
                }
            >
                {appealing && <AppealForm councilId={councilId} decisionId={appealing.decisionId} onDone={() => setAppealing(null)} />}
            </Drawer>
        </Card>
    );
}
