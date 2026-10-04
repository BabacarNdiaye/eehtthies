import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import CsvImport from '@/Components/Admin/CsvImport';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Select } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { Subject } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';

type SubjectRow = Subject & { formation: { id: number; name: string } | null };

export default function Index({
    subjects,
    formations,
}: {
    subjects: SubjectRow[];
    formations: { id: number; name: string }[];
}) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const createForm = useForm({
        name: '',
        code: '',
        formation_id: '' as number | '',
        coefficient: 1,
    });

    const editForm = useForm({
        name: '',
        code: '',
        formation_id: '' as number | '',
        coefficient: 1,
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.subjects.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const startEdit = (subject: SubjectRow) => {
        setEditingId(subject.id);
        editForm.setData({
            name: subject.name,
            code: subject.code ?? '',
            formation_id: subject.formation_id ?? '',
            coefficient: subject.coefficient,
        });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.patch(route('admin.subjects.update', id), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const destroy = (subject: SubjectRow) => {
        if (confirm(`Supprimer la matière "${subject.name}" ? Cette action est irréversible.`)) {
            router.delete(route('admin.subjects.destroy', subject.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Matières" />
            <PageHeader
                title="Matières"
                subtitle="Gérez les matières enseignées et leurs coefficients."
            >
                <CsvImport
                    title="Importer des matières"
                    columns="name, code, formation (code ou nom de la formation), coefficient (name obligatoire)"
                    postRoute={route('admin.subjects.import')}
                    templateRoute={route('admin.subjects.import.template')}
                />
            </PageHeader>

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter une matière</h2>
                <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
                    <Field label="Nom" required error={createForm.errors.name}>
                        <TextInput
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                        />
                    </Field>
                    <Field label="Code" error={createForm.errors.code}>
                        <TextInput
                            value={createForm.data.code}
                            onChange={(e) => createForm.setData('code', e.target.value)}
                        />
                    </Field>
                    <Field label="Formation" error={createForm.errors.formation_id}>
                        <Select
                            value={createForm.data.formation_id}
                            onChange={(e) =>
                                createForm.setData('formation_id', e.target.value ? Number(e.target.value) : '')
                            }
                        >
                            <option value="">Toutes formations</option>
                            {formations.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Coefficient" required error={createForm.errors.coefficient}>
                        <TextInput
                            type="number"
                            step="0.5"
                            min="0"
                            value={createForm.data.coefficient}
                            onChange={(e) => createForm.setData('coefficient', Number(e.target.value))}
                        />
                    </Field>
                    <button
                        type="submit"
                        disabled={createForm.processing}
                        className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        Ajouter
                    </button>
                </form>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Code</th>
                                <th className="px-5 py-3">Formation</th>
                                <th className="px-5 py-3">Coefficient</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {subjects.map((s) =>
                                editingId === s.id ? (
                                    <tr key={s.id} className="bg-gold-50/40">
                                        <td className="px-5 py-3" colSpan={5}>
                                            <form
                                                onSubmit={(e) => submitEdit(e, s.id)}
                                                className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end"
                                            >
                                                <TextInput
                                                    aria-label="Nom"
                                                    value={editForm.data.name}
                                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                                />
                                                <TextInput
                                                    aria-label="Code"
                                                    value={editForm.data.code}
                                                    onChange={(e) => editForm.setData('code', e.target.value)}
                                                />
                                                <Select
                                                    aria-label="Formation"
                                                    value={editForm.data.formation_id}
                                                    onChange={(e) =>
                                                        editForm.setData(
                                                            'formation_id',
                                                            e.target.value ? Number(e.target.value) : '',
                                                        )
                                                    }
                                                >
                                                    <option value="">Toutes formations</option>
                                                    {formations.map((f) => (
                                                        <option key={f.id} value={f.id}>
                                                            {f.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <TextInput
                                                    aria-label="Coefficient"
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    value={editForm.data.coefficient}
                                                    onChange={(e) => editForm.setData('coefficient', Number(e.target.value))}
                                                />
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
                                    <tr key={s.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3 font-medium text-ink-900">{s.name}</td>
                                        <td className="px-5 py-3 text-ink-600">{s.code ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{s.formation?.name ?? 'Toutes formations'}</td>
                                        <td className="px-5 py-3 text-ink-600">{s.coefficient}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <IconButton
                                                    onClick={() => startEdit(s)}
                                                    label="Modifier"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => destroy(s)}
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
                            {subjects.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune matière enregistrée pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
