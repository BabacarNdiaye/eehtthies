import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput, Checkbox } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

type Ref = { id: number; name: string };

type LevelRow = {
    id: number;
    formation_id: number;
    level_number: number;
    label: string;
    is_final_level: boolean;
    min_average: number | null;
    max_unjustified_absences: number | null;
    internship_required: boolean;
    final_exam_required: boolean;
    required_subjects: Ref[];
    required_skills: Ref[];
};

interface Props {
    formations: Ref[];
    levels: LevelRow[];
    subjects: Ref[];
    skills: Ref[];
    selectedFormationId: number | null;
}

const emptyForm = {
    level_number: 1,
    label: '',
    is_final_level: false as boolean,
    min_average: '' as number | '',
    max_unjustified_absences: '' as number | '',
    internship_required: false as boolean,
    final_exam_required: false as boolean,
    required_subject_ids: [] as number[],
    required_skill_ids: [] as number[],
};

function RulesFields({
    data,
    setData,
    subjects,
    skills,
}: {
    data: typeof emptyForm;
    setData: (key: string, value: unknown) => void;
    subjects: Ref[];
    skills: Ref[];
}) {
    const toggleId = (key: 'required_subject_ids' | 'required_skill_ids', id: number) => {
        const current = data[key] as number[];
        setData(key, current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);
    };

    return (
        <>
            <Field label="N° niveau" required>
                <TextInput
                    type="number"
                    min="1"
                    value={data.level_number}
                    onChange={(e) => setData('level_number', Number(e.target.value))}
                />
            </Field>
            <div className="sm:col-span-2">
                <Field label="Libellé" required>
                    <TextInput value={data.label} onChange={(e) => setData('label', e.target.value)} placeholder="Année 1" />
                </Field>
            </div>
            <Field label="Moyenne min. /20">
                <TextInput
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    value={data.min_average}
                    onChange={(e) => setData('min_average', e.target.value ? Number(e.target.value) : '')}
                />
            </Field>
            <Field label="Absences injust. max">
                <TextInput
                    type="number"
                    min="0"
                    value={data.max_unjustified_absences}
                    onChange={(e) => setData('max_unjustified_absences', e.target.value ? Number(e.target.value) : '')}
                />
            </Field>
            <div className="flex items-center gap-2 pb-2">
                <Checkbox checked={data.is_final_level} onChange={(e) => setData('is_final_level', e.target.checked)} id="is_final_level" />
                <label htmlFor="is_final_level" className="text-sm text-ink-700">Niveau final (diplôme/certificat)</label>
            </div>
            <div className="flex items-center gap-2 pb-2">
                <Checkbox checked={data.internship_required} onChange={(e) => setData('internship_required', e.target.checked)} id="internship_required" />
                <label htmlFor="internship_required" className="text-sm text-ink-700">Stage obligatoire</label>
            </div>
            <div className="flex items-center gap-2 pb-2">
                <Checkbox checked={data.final_exam_required} onChange={(e) => setData('final_exam_required', e.target.checked)} id="final_exam_required" />
                <label htmlFor="final_exam_required" className="text-sm text-ink-700">Examen final obligatoire</label>
            </div>
            <div className="sm:col-span-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Matières obligatoires</p>
                <div className="flex flex-wrap gap-3">
                    {subjects.map((s) => (
                        <label key={s.id} className="flex items-center gap-1.5 text-sm text-ink-700">
                            <Checkbox checked={data.required_subject_ids.includes(s.id)} onChange={() => toggleId('required_subject_ids', s.id)} />
                            {s.name}
                        </label>
                    ))}
                    {subjects.length === 0 && <p className="text-xs text-ink-500">Aucune matière pour cette filière.</p>}
                </div>
            </div>
            <div className="sm:col-span-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Compétences obligatoires</p>
                <div className="flex flex-wrap gap-3">
                    {skills.map((s) => (
                        <label key={s.id} className="flex items-center gap-1.5 text-sm text-ink-700">
                            <Checkbox checked={data.required_skill_ids.includes(s.id)} onChange={() => toggleId('required_skill_ids', s.id)} />
                            {s.name}
                        </label>
                    ))}
                    {skills.length === 0 && <p className="text-xs text-ink-500">Aucune compétence pour cette filière.</p>}
                </div>
            </div>
        </>
    );
}

export default function Index({ formations, levels, subjects, skills, selectedFormationId }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const changeFormation = (value: string) => {
        router.get(route('admin.formation-levels.index'), value ? { formation_id: value } : {}, { preserveState: true });
    };

    const createForm = useForm(emptyForm);
    const editForm = useForm(emptyForm);

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.transform((data) => ({ ...data, formation_id: selectedFormationId }));
        createForm.post(route('admin.formation-levels.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const startEdit = (level: LevelRow) => {
        setEditingId(level.id);
        editForm.setData({
            level_number: level.level_number,
            label: level.label,
            is_final_level: level.is_final_level,
            min_average: level.min_average ?? '',
            max_unjustified_absences: level.max_unjustified_absences ?? '',
            internship_required: level.internship_required,
            final_exam_required: level.final_exam_required,
            required_subject_ids: level.required_subjects.map((s) => s.id),
            required_skill_ids: level.required_skills.map((s) => s.id),
        });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.transform((data) => ({ ...data, formation_id: selectedFormationId }));
        editForm.patch(route('admin.formation-levels.update', id), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const destroy = async (level: LevelRow) => {
        if (await confirmAction(`Supprimer le niveau "${level.label}" ? Les classes qui y sont rattachées perdront leurs règles de passage.`)) {
            router.delete(route('admin.formation-levels.destroy', level.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Niveaux & règles de passage" />
            <PageHeader
                title="Niveaux & règles de passage"
                subtitle="Configurez, pour chaque formation, ses niveaux et les règles qui déterminent le passage, le redoublement ou la diplomation."
            />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Filière</h2>
                <div className="max-w-xs">
                    <Select aria-label="Filière" value={selectedFormationId ?? ''} onChange={(e) => changeFormation(e.target.value)}>
                        <option value="">Sélectionner une filière</option>
                        {formations.map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </Card>

            {selectedFormationId && (
                <>
                    <Card className="mb-6 p-6">
                        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter un niveau</h2>
                        <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
                            <RulesFields data={createForm.data} setData={createForm.setData} subjects={subjects} skills={skills} />
                            <button
                                type="submit"
                                disabled={createForm.processing}
                                className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50 sm:col-span-4 sm:w-fit"
                            >
                                Ajouter le niveau
                            </button>
                        </form>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3">Niveau</th>
                                        <th className="px-5 py-3">Règles</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {levels.map((l) =>
                                        editingId === l.id ? (
                                            <tr key={l.id} className="bg-gold-50/40">
                                                <td className="px-5 py-3" colSpan={3}>
                                                    <form
                                                        onSubmit={(e) => submitEdit(e, l.id)}
                                                        className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
                                                    >
                                                        <RulesFields data={editForm.data} setData={editForm.setData} subjects={subjects} skills={skills} />
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="submit"
                                                                disabled={editForm.processing}
                                                                className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                                                            >
                                                                Enregistrer
                                                            </button>
                                                            <IconButton
                                                                type="button"
                                                                onClick={() => setEditingId(null)}
                                                                label="Annuler la modification"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </IconButton>
                                                        </div>
                                                    </form>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={l.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                                <td className="px-5 py-3">
                                                    <p className="font-medium text-ink-900">
                                                        {l.level_number}. {l.label}
                                                    </p>
                                                    {l.is_final_level && (
                                                        <span className="text-xs font-semibold text-gold-700">Niveau final</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-xs text-ink-600">
                                                    <ul className="list-disc space-y-0.5 pl-4">
                                                        {l.min_average !== null && <li>Moyenne ≥ {l.min_average}/20</li>}
                                                        {l.max_unjustified_absences !== null && (
                                                            <li>Max {l.max_unjustified_absences} absence(s) injustifiée(s)</li>
                                                        )}
                                                        {l.internship_required && <li>Stage obligatoire</li>}
                                                        {l.final_exam_required && <li>Examen final obligatoire</li>}
                                                        {l.required_subjects.length > 0 && (
                                                            <li>Matières : {l.required_subjects.map((s) => s.name).join(', ')}</li>
                                                        )}
                                                        {l.required_skills.length > 0 && (
                                                            <li>Compétences : {l.required_skills.map((s) => s.name).join(', ')}</li>
                                                        )}
                                                    </ul>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <IconButton
                                                            onClick={() => startEdit(l)}
                                                            label="Modifier"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </IconButton>
                                                        <IconButton
                                                            onClick={() => destroy(l)}
                                                            label="Supprimer"
                                                            tone="danger"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </IconButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                    {levels.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-10 text-center">
                                                <div className="flex flex-col items-center gap-3 text-ink-500">
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                        <Inbox className="h-6 w-6" />
                                                    </span>
                                                    <p className="text-sm">Aucun niveau défini pour cette filière.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </AdminLayout>
    );
}
