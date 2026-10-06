import Card from '@/Components/Admin/Card';
import { Checkbox, Field, Select, TextInput } from '@/Components/Admin/Field';
import { SearchField } from '@/Components/Admin/FilterBar';
import { IconButton } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { SubjectGroupRow, SubjectRow } from '@/lib/council';
import { router, useForm } from '@inertiajs/react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Props {
    groups: SubjectGroupRow[];
    subjects: SubjectRow[];
    canEdit: boolean;
}

const keep = { preserveScroll: true, preserveState: true } as const;
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function GroupRow({ group, canEdit }: { group: SubjectGroupRow; canEdit: boolean }) {
    const [editing, setEditing] = useState(false);
    const { data, setData, patch, processing, errors } = useForm({ label: group.label });
    const protectedGroup = group.code === 'stage';

    const destroy = async () => {
        if (await confirmAction(`Supprimer le groupe « ${group.label} » ? Ses ${group.subjects_count} matière(s) ne seront plus classées.`)) {
            router.delete(route('admin.council-settings.subject-groups.destroy', group.id), keep);
        }
    };

    if (editing) {
        return (
            <li className="px-5 py-3">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        patch(route('admin.council-settings.subject-groups.update', group.id), { ...keep, onSuccess: () => setEditing(false) });
                    }}
                    className="flex items-start gap-2"
                >
                    <div className="flex-1">
                        <TextInput aria-label="Libellé du groupe" value={data.label} onChange={(e) => setData('label', e.target.value)} />
                        {errors.label && <p className="mt-1 text-xs text-red-600">{errors.label}</p>}
                    </div>
                    <IconButton type="submit" label="Enregistrer le libellé" disabled={processing}>
                        <Check className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Annuler" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4" />
                    </IconButton>
                </form>
            </li>
        );
    }

    return (
        <li className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">{group.label}</p>
                <p className="text-xs text-ink-500">
                    {group.subjects_count} matière{group.subjects_count > 1 ? 's' : ''}
                    {protectedGroup ? ' · appréciation, hors moyenne' : ''}
                </p>
            </div>
            {canEdit && (
                <>
                    <IconButton label={`Renommer « ${group.label} »`} onClick={() => setEditing(true)}>
                        <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={protectedGroup ? 'Le groupe « Stage » ne se supprime pas' : `Supprimer « ${group.label} »`} tone="danger" disabled={protectedGroup} onClick={destroy}>
                        <Trash2 className="h-4 w-4" />
                    </IconButton>
                </>
            )}
        </li>
    );
}

export default function SubjectGroupsTab({ groups, subjects, canEdit }: Props) {
    const creation = useForm({ code: '', label: '' });
    const initial = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, subject.subject_group_id ?? ''])) as Record<number, number | ''>, [subjects]);
    const [assigned, setAssigned] = useState(initial);
    const [search, setSearch] = useState('');
    const [unclassifiedOnly, setUnclassifiedOnly] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => setAssigned(initial), [initial]);

    const changed = subjects.filter((subject) => (assigned[subject.id] ?? '') !== (initial[subject.id] ?? ''));
    const visible = subjects.filter(
        (subject) =>
            (!unclassifiedOnly || (assigned[subject.id] ?? '') === '') &&
            normalize(`${subject.name} ${subject.formation ?? ''}`).includes(normalize(search.trim())),
    );

    const saveAssignments = () =>
        router.put(
            route('admin.council-settings.subject-groups.assign'),
            { assignments: changed.map((subject) => ({ subject_id: subject.id, subject_group_id: assigned[subject.id] === '' ? null : assigned[subject.id] })) },
            { ...keep, onStart: () => setSaving(true), onFinish: () => setSaving(false) },
        );

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <Card className="overflow-hidden lg:col-span-1">
                <h2 className="border-b border-ink-100 px-5 py-3 font-serif text-base font-bold text-ink-900">Groupes</h2>
                <ul className="divide-y divide-ink-100">
                    {groups.map((group) => (
                        <GroupRow key={group.id} group={group} canEdit={canEdit} />
                    ))}
                </ul>
                {canEdit && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            creation.post(route('admin.council-settings.subject-groups.store'), { ...keep, onSuccess: () => creation.reset() });
                        }}
                        className="space-y-3 border-t border-ink-100 p-5"
                    >
                        <p className="text-sm font-medium text-ink-700">Nouveau groupe</p>
                        <Field label="Libellé" error={creation.errors.label}>
                            <TextInput value={creation.data.label} onChange={(e) => creation.setData('label', e.target.value)} placeholder="Langues vivantes" />
                        </Field>
                        <Field label="Code" error={creation.errors.code} hint="Lettres minuscules, chiffres et tirets bas.">
                            <TextInput value={creation.data.code} onChange={(e) => creation.setData('code', e.target.value)} placeholder="langues" />
                        </Field>
                        <button type="submit" disabled={creation.processing} className="w-full rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50">
                            Ajouter le groupe
                        </button>
                    </form>
                )}
            </Card>

            <Card className="overflow-hidden lg:col-span-2">
                <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-3 md:flex-row md:items-center">
                    <h2 className="font-serif text-base font-bold text-ink-900 md:flex-1">Rattachement des matières</h2>
                    <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une matière" className="md:max-w-xs" />
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={unclassifiedOnly} onChange={(e) => setUnclassifiedOnly(e.target.checked)} />
                        Non classées
                    </label>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Formation</th>
                                <th className="px-5 py-3">Coef.</th>
                                <th className="px-5 py-3">Groupe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {visible.map((subject) => (
                                <tr key={subject.id}>
                                    <td className="px-5 py-2.5 font-medium text-ink-900">{subject.name}</td>
                                    <td className="px-5 py-2.5 text-ink-600">{subject.formation ?? '—'}</td>
                                    <td className="px-5 py-2.5 text-ink-600">{subject.coefficient}</td>
                                    <td className="px-5 py-2.5">
                                        <Select
                                            aria-label={`Groupe de ${subject.name}`}
                                            disabled={!canEdit}
                                            value={assigned[subject.id] ?? ''}
                                            onChange={(e) => setAssigned((current) => ({ ...current, [subject.id]: e.target.value ? Number(e.target.value) : '' }))}
                                        >
                                            <option value="">Non classée</option>
                                            {groups.map((group) => (
                                                <option key={group.id} value={group.id}>
                                                    {group.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </td>
                                </tr>
                            ))}
                            {visible.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-ink-500">
                                        {subjects.length === 0 ? 'Aucune matière enregistrée.' : 'Aucune matière ne correspond.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {canEdit && (
                    <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-5 py-3">
                        <p className="text-sm text-ink-500">Une matière non classée compte dans le groupe « Autres matières » de la fiche de l'élève.</p>
                        <button
                            type="button"
                            onClick={saveAssignments}
                            disabled={changed.length === 0 || saving}
                            className="shrink-0 rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Enregistrer{changed.length > 0 ? ` (${changed.length})` : ''}
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
}
