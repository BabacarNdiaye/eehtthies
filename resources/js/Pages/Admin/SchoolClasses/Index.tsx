import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Select } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { SchoolClass } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ClassTabs } from '@/Components/Admin/ClusterTabs';

type ClassRow = SchoolClass & {
    formation: { id: number; name: string };
    academic_year: { id: number; label: string };
    next_class?: { id: number; name: string } | null;
    formation_level?: { id: number; formation_id: number; label: string } | null;
    students_count: number;
};

export default function Index({
    schoolClasses,
    formations,
    academicYears,
    formationLevels,
}: {
    schoolClasses: ClassRow[];
    formations: { id: number; name: string }[];
    academicYears: { id: number; label: string }[];
    formationLevels: { id: number; formation_id: number; label: string }[];
}) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const createForm = useForm({
        name: '',
        formation_id: '' as number | '',
        academic_year_id: '' as number | '',
        capacity: '' as number | '',
        next_class_id: '' as number | '',
        formation_level_id: '' as number | '',
    });

    const editForm = useForm({
        name: '',
        formation_id: '' as number | '',
        academic_year_id: '' as number | '',
        capacity: '' as number | '',
        next_class_id: '' as number | '',
        formation_level_id: '' as number | '',
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.school-classes.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const startEdit = (schoolClass: ClassRow) => {
        setEditingId(schoolClass.id);
        editForm.setData({
            name: schoolClass.name,
            formation_id: schoolClass.formation_id,
            academic_year_id: schoolClass.academic_year_id,
            capacity: schoolClass.capacity ?? '',
            next_class_id: schoolClass.next_class_id ?? '',
            formation_level_id: schoolClass.formation_level_id ?? '',
        });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.patch(route('admin.school-classes.update', id), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const destroy = async (schoolClass: ClassRow) => {
        if (await confirmAction(`Supprimer la classe "${schoolClass.name}" ? Cette action est irréversible.`)) {
            router.delete(route('admin.school-classes.destroy', schoolClass.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Classes" />
            <PageHeader
                title="Classes"
                subtitle="Gérez les classes rattachées aux formations et aux années académiques."
            />
            <ClassTabs current="classes" />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter une classe</h2>
                <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-6 sm:items-end">
                    <Field label="Nom" required error={createForm.errors.name}>
                        <TextInput
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            placeholder="BTS Hôtellerie 1"
                        />
                    </Field>
                    <Field label="Formation" required error={createForm.errors.formation_id}>
                        <Select
                            value={createForm.data.formation_id}
                            onChange={(e) =>
                                createForm.setData('formation_id', e.target.value ? Number(e.target.value) : '')
                            }
                        >
                            <option value="">Sélectionner...</option>
                            {formations.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Année académique" required error={createForm.errors.academic_year_id}>
                        <Select
                            value={createForm.data.academic_year_id}
                            onChange={(e) =>
                                createForm.setData('academic_year_id', e.target.value ? Number(e.target.value) : '')
                            }
                        >
                            <option value="">Sélectionner...</option>
                            {academicYears.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {y.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Capacité" error={createForm.errors.capacity}>
                        <TextInput
                            type="number"
                            value={createForm.data.capacity}
                            onChange={(e) =>
                                createForm.setData('capacity', e.target.value ? Number(e.target.value) : '')
                            }
                        />
                    </Field>
                    <Field label="Niveau" error={createForm.errors.formation_level_id} hint="Règles de passage configurées">
                        <Select
                            value={createForm.data.formation_level_id}
                            onChange={(e) =>
                                createForm.setData('formation_level_id', e.target.value ? Number(e.target.value) : '')
                            }
                        >
                            <option value="">Aucun (manuel)</option>
                            {formationLevels
                                .filter((l) => l.formation_id === createForm.data.formation_id)
                                .map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.label}
                                    </option>
                                ))}
                        </Select>
                    </Field>
                    <Field label="Classe suivante" error={createForm.errors.next_class_id} hint="Repli manuel si pas de niveau">
                        <Select
                            value={createForm.data.next_class_id}
                            onChange={(e) =>
                                createForm.setData('next_class_id', e.target.value ? Number(e.target.value) : '')
                            }
                        >
                            <option value="">Aucune</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.academic_year?.label})
                                </option>
                            ))}
                        </Select>
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
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Formation</th>
                                <th className="px-5 py-3">Année</th>
                                <th className="px-5 py-3">Élèves</th>
                                <th className="px-5 py-3">Capacité</th>
                                <th className="px-5 py-3">Niveau</th>
                                <th className="px-5 py-3">Classe suivante</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {schoolClasses.map((c) =>
                                editingId === c.id ? (
                                    <tr key={c.id} className="bg-gold-50/40">
                                        <td className="px-5 py-3" colSpan={8}>
                                            <form
                                                onSubmit={(e) => submitEdit(e, c.id)}
                                                className="grid grid-cols-1 gap-3 sm:grid-cols-6 sm:items-end"
                                            >
                                                <TextInput
                                                    aria-label="Nom"
                                                    value={editForm.data.name}
                                                    onChange={(e) => editForm.setData('name', e.target.value)}
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
                                                    {formations.map((f) => (
                                                        <option key={f.id} value={f.id}>
                                                            {f.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    aria-label="Année académique"
                                                    value={editForm.data.academic_year_id}
                                                    onChange={(e) =>
                                                        editForm.setData(
                                                            'academic_year_id',
                                                            e.target.value ? Number(e.target.value) : '',
                                                        )
                                                    }
                                                >
                                                    {academicYears.map((y) => (
                                                        <option key={y.id} value={y.id}>
                                                            {y.label}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <TextInput
                                                    aria-label="Capacité"
                                                    type="number"
                                                    value={editForm.data.capacity}
                                                    onChange={(e) =>
                                                        editForm.setData(
                                                            'capacity',
                                                            e.target.value ? Number(e.target.value) : '',
                                                        )
                                                    }
                                                />
                                                <Select
                                                    aria-label="Classe suivante"
                                                    value={editForm.data.next_class_id}
                                                    onChange={(e) =>
                                                        editForm.setData(
                                                            'next_class_id',
                                                            e.target.value ? Number(e.target.value) : '',
                                                        )
                                                    }
                                                >
                                                    <option value="">Aucune</option>
                                                    {schoolClasses
                                                        .filter((other) => other.id !== c.id)
                                                        .map((other) => (
                                                            <option key={other.id} value={other.id}>
                                                                {other.name} ({other.academic_year?.label})
                                                            </option>
                                                        ))}
                                                </Select>
                                                <Select
                                                    aria-label="Niveau"
                                                    value={editForm.data.formation_level_id}
                                                    onChange={(e) =>
                                                        editForm.setData(
                                                            'formation_level_id',
                                                            e.target.value ? Number(e.target.value) : '',
                                                        )
                                                    }
                                                >
                                                    <option value="">Aucun (manuel)</option>
                                                    {formationLevels
                                                        .filter((l) => l.formation_id === editForm.data.formation_id)
                                                        .map((l) => (
                                                            <option key={l.id} value={l.id}>
                                                                {l.label}
                                                            </option>
                                                        ))}
                                                </Select>
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
                                    <tr key={c.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3 font-medium text-ink-900">{c.name}</td>
                                        <td className="px-5 py-3 text-ink-600">{c.formation?.name ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{c.academic_year?.label ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{c.students_count ?? 0}</td>
                                        <td className="px-5 py-3 text-ink-600">{c.capacity ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{c.formation_level?.label ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{c.next_class?.name ?? '—'}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <IconButton
                                                    onClick={() => startEdit(c)}
                                                    label="Modifier"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => destroy(c)}
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
                            {schoolClasses.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune classe enregistrée pour le moment.</p>
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
