import Drawer from '@/Components/Admin/Drawer';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { useForm } from '@inertiajs/react';
import { CalendarClock, FileText } from 'lucide-react';
import { useState } from 'react';

export interface FollowUpRow {
    id: number;
    student: string | null;
    class: string | null;
    term: string | null;
    kind: string | null;
    problem: string;
    action: string | null;
    owner_id: number | null;
    owner: string | null;
    due_date: string | null;
    status: string;
    status_label: string;
    comment: string | null;
    overdue: boolean;
    interview_at: string | null;
    interview_report: string | null;
    can_manage: boolean;
}

interface Props {
    followUps: FollowUpRow[];
    statuses: Record<string, string>;
    updateRoute: string;
    interviewRoute: string;
    canReassign?: boolean;
    staff?: { id: number; name: string }[];
    showOwner?: boolean;
}

const TONES: Record<string, string> = {
    todo: 'bg-sky-100 text-sky-900',
    in_progress: 'bg-violet-100 text-violet-900',
    done: 'bg-emerald-100 text-emerald-900',
    not_done: 'bg-orange-100 text-orange-900',
    abandoned: 'bg-ink-100 text-ink-700',
};

function EditForm({ followUp, statuses, updateRoute, canReassign, staff, onDone }: { followUp: FollowUpRow; onDone: () => void } & Pick<Props, 'statuses' | 'updateRoute' | 'canReassign' | 'staff'>) {
    const { data, setData, patch, processing, errors } = useForm({
        status: followUp.status,
        comment: followUp.comment ?? '',
        action: followUp.action ?? '',
        owner_id: (followUp.owner_id ?? '') as number | '',
        due_date: followUp.due_date ?? '',
        interview_at: followUp.interview_at ?? '',
        interview_report: followUp.interview_report ?? '',
    });

    return (
        <form
            id={`follow-up-${followUp.id}`}
            className="space-y-4"
            aria-busy={processing}
            onSubmit={(e) => {
                e.preventDefault();
                patch(route(updateRoute, followUp.id), { preserveScroll: true, onSuccess: onDone });
            }}
        >
            <Field label="Action prévue" error={errors.action}>
                <Textarea rows={3} value={data.action} onChange={(e) => setData('action', e.target.value)} />
            </Field>
            <Field label="Statut" error={errors.status}>
                <Select value={data.status} onChange={(e) => setData('status', e.target.value)}>
                    {Object.entries(statuses).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </Field>
            <Field label="Commentaire" error={errors.comment} hint="Obligatoire pour changer de statut.">
                <Textarea rows={3} value={data.comment} onChange={(e) => setData('comment', e.target.value)} />
            </Field>
            {canReassign && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Responsable" error={errors.owner_id}>
                        <Select value={data.owner_id} onChange={(e) => setData('owner_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Non attribuée</option>
                            {(staff ?? []).map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Échéance" error={errors.due_date}>
                        <TextInput type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} />
                    </Field>
                </div>
            )}
            {followUp.kind === 'family_interview' && (
                <>
                    <Field label="Date de l’entretien" error={errors.interview_at}>
                        <TextInput type="datetime-local" value={data.interview_at} onChange={(e) => setData('interview_at', e.target.value)} />
                    </Field>
                    <Field label="Compte rendu de l’entretien" error={errors.interview_report}>
                        <Textarea rows={4} value={data.interview_report} onChange={(e) => setData('interview_report', e.target.value)} />
                    </Field>
                </>
            )}
        </form>
    );
}

/** Actions de suivi en cartes (E09, E10) : lisibles et modifiables au téléphone. */
export default function FollowUpList({ followUps, statuses, updateRoute, interviewRoute, canReassign = false, staff = [], showOwner = true }: Props) {
    const [editing, setEditing] = useState<FollowUpRow | null>(null);

    if (followUps.length === 0) {
        return <p className="rounded-xl border border-ink-100 bg-white p-6 text-sm text-ink-500">Aucune action de suivi.</p>;
    }

    return (
        <>
            <ul className="space-y-3">
                {followUps.map((followUp) => (
                    <li key={followUp.id} className="rounded-xl border border-ink-100 bg-white p-4 shadow-soft">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-semibold text-ink-900">{followUp.problem}</p>
                                <p className="text-sm text-ink-600">
                                    {followUp.student} · {followUp.class} · {followUp.term}
                                </p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONES[followUp.status] ?? TONES.todo}`}>{followUp.status_label}</span>
                        </div>
                        {followUp.action && <p className="mt-2 text-sm text-ink-700">{followUp.action}</p>}
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                            <span className={`inline-flex items-center gap-1 ${followUp.overdue ? 'font-semibold text-red-700' : ''}`}>
                                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                                {followUp.due_date ? `Échéance ${new Date(`${followUp.due_date}T00:00:00`).toLocaleDateString('fr-FR')}` : 'Sans échéance'}
                                {followUp.overdue && ' — dépassée'}
                            </span>
                            {showOwner && <span>Responsable : {followUp.owner ?? 'non attribuée'}</span>}
                        </p>
                        {followUp.comment && <p className="mt-2 text-xs text-ink-500">« {followUp.comment} »</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {followUp.can_manage && (
                                <button type="button" onClick={() => setEditing(followUp)} className="rounded-lg bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800">
                                    Mettre à jour
                                </button>
                            )}
                            {followUp.kind === 'family_interview' && (
                                <a href={route(interviewRoute, followUp.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                                    <FileText className="h-4 w-4" aria-hidden="true" /> Convocation de la famille
                                </a>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            <Drawer
                open={editing !== null}
                onClose={() => setEditing(null)}
                title="Action de suivi"
                subtitle={editing ? `${editing.student} — ${editing.problem}` : undefined}
                footer={
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700">
                            Annuler
                        </button>
                        <button type="submit" form={editing ? `follow-up-${editing.id}` : undefined} className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white">
                            Enregistrer
                        </button>
                    </div>
                }
            >
                {editing && <EditForm followUp={editing} statuses={statuses} updateRoute={updateRoute} canReassign={canReassign} staff={staff} onDone={() => setEditing(null)} />}
            </Drawer>
        </>
    );
}
