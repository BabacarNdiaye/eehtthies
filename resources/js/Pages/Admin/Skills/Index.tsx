import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput, Textarea } from '@/Components/Admin/Field';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

type SkillRow = {
    id: number;
    formation_id: number;
    name: string;
    description: string | null;
    order: number;
};

interface Props {
    formations: { id: number; name: string }[];
    skills: SkillRow[];
    selectedFormationId: number | null;
}

export default function Index({ formations, skills, selectedFormationId }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const changeFormation = (value: string) => {
        router.get(route('admin.skills.index'), value ? { formation_id: value } : {}, { preserveState: true });
    };

    const createForm = useForm({
        name: '',
        description: '',
        order: 0,
    });

    const editForm = useForm({
        name: '',
        description: '',
        order: 0,
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.transform((data) => ({ ...data, formation_id: selectedFormationId }));
        createForm.post(route('admin.skills.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.setData('name', ''),
        });
    };

    const startEdit = (skill: SkillRow) => {
        setEditingId(skill.id);
        editForm.setData({
            name: skill.name,
            description: skill.description ?? '',
            order: skill.order,
        });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.patch(route('admin.skills.update', id), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const destroy = (skill: SkillRow) => {
        if (confirm(`Supprimer la compétence "${skill.name}" ? Les évaluations liées seront aussi supprimées.`)) {
            router.delete(route('admin.skills.destroy', skill.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Référentiel de compétences" />
            <PageHeader
                title="Référentiel de compétences"
                subtitle="Définissez les compétences professionnelles évaluées pour chaque filière."
            />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Filière</h2>
                <div className="max-w-xs">
                    <Select value={selectedFormationId ?? ''} onChange={(e) => changeFormation(e.target.value)}>
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
                        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter une compétence</h2>
                        <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
                            <div className="sm:col-span-2">
                                <Field label="Nom" required error={createForm.errors.name}>
                                    <TextInput
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                    />
                                </Field>
                            </div>
                            <Field label="Ordre" error={createForm.errors.order}>
                                <TextInput
                                    type="number"
                                    min="0"
                                    value={createForm.data.order}
                                    onChange={(e) => createForm.setData('order', Number(e.target.value))}
                                />
                            </Field>
                            <button
                                type="submit"
                                disabled={createForm.processing}
                                className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                            >
                                Ajouter
                            </button>
                            <div className="sm:col-span-4">
                                <Field label="Description (optionnel)" error={createForm.errors.description}>
                                    <Textarea
                                        rows={2}
                                        value={createForm.data.description}
                                        onChange={(e) => createForm.setData('description', e.target.value)}
                                    />
                                </Field>
                            </div>
                        </form>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3">Ordre</th>
                                        <th className="px-5 py-3">Compétence</th>
                                        <th className="px-5 py-3">Description</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {skills.map((s) =>
                                        editingId === s.id ? (
                                            <tr key={s.id} className="bg-gold-50/40">
                                                <td className="px-5 py-3" colSpan={4}>
                                                    <form
                                                        onSubmit={(e) => submitEdit(e, s.id)}
                                                        className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
                                                    >
                                                        <TextInput
                                                            type="number"
                                                            min="0"
                                                            value={editForm.data.order}
                                                            onChange={(e) => editForm.setData('order', Number(e.target.value))}
                                                        />
                                                        <div className="sm:col-span-2">
                                                            <TextInput
                                                                value={editForm.data.name}
                                                                onChange={(e) => editForm.setData('name', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="submit"
                                                                disabled={editForm.processing}
                                                                className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                                                            >
                                                                Enregistrer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingId(null)}
                                                                className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                        <div className="sm:col-span-4">
                                                            <Textarea
                                                                rows={2}
                                                                value={editForm.data.description}
                                                                onChange={(e) => editForm.setData('description', e.target.value)}
                                                            />
                                                        </div>
                                                    </form>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={s.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                                <td className="px-5 py-3 text-ink-500">{s.order}</td>
                                                <td className="px-5 py-3 font-medium text-ink-900">{s.name}</td>
                                                <td className="max-w-md px-5 py-3 text-ink-500">{s.description || '—'}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => startEdit(s)}
                                                            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => destroy(s)}
                                                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                    {skills.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-10 text-center">
                                                <div className="flex flex-col items-center gap-3 text-ink-400">
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                        <Inbox className="h-6 w-6" />
                                                    </span>
                                                    <p className="text-sm">Aucune compétence définie pour cette filière.</p>
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
