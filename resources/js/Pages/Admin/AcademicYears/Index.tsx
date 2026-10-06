import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Checkbox } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { AcademicYear } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ClassTabs } from '@/Components/Admin/ClusterTabs';

function toDateInput(value?: string | null) {
    if (!value) return '';
    return value.slice(0, 10);
}

export default function Index({ academicYears }: { academicYears: AcademicYear[] }) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const createForm = useForm({
        label: '',
        start_date: '',
        end_date: '',
        is_current: false,
    });

    const editForm = useForm({
        label: '',
        start_date: '',
        end_date: '',
        is_current: false,
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.academic-years.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const startEdit = (year: AcademicYear) => {
        setEditingId(year.id);
        editForm.setData({
            label: year.label,
            start_date: toDateInput(year.start_date),
            end_date: toDateInput(year.end_date),
            is_current: year.is_current,
        });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.patch(route('admin.academic-years.update', id), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const destroy = async (year: AcademicYear) => {
        if (await confirmAction(`Supprimer l'année académique "${year.label}" ? Cette action est irréversible.`)) {
            router.delete(route('admin.academic-years.destroy', year.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Années académiques" />
            <PageHeader
                title="Années académiques"
                subtitle="Gérez les années académiques utilisées pour les classes et les inscriptions."
            />
            <ClassTabs current="years" />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter une année</h2>
                <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
                    <Field label="Libellé" required error={createForm.errors.label}>
                        <TextInput
                            value={createForm.data.label}
                            onChange={(e) => createForm.setData('label', e.target.value)}
                            placeholder="2026-2027"
                        />
                    </Field>
                    <Field label="Début" required error={createForm.errors.start_date}>
                        <TextInput
                            type="date"
                            value={createForm.data.start_date}
                            onChange={(e) => createForm.setData('start_date', e.target.value)}
                        />
                    </Field>
                    <Field label="Fin" required error={createForm.errors.end_date}>
                        <TextInput
                            type="date"
                            value={createForm.data.end_date}
                            onChange={(e) => createForm.setData('end_date', e.target.value)}
                        />
                    </Field>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-ink-700">
                            <Checkbox
                                checked={createForm.data.is_current}
                                onChange={(e) => createForm.setData('is_current', e.target.checked)}
                            />
                            En cours
                        </label>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Ajouter
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Libellé</th>
                                <th className="px-5 py-3">Début</th>
                                <th className="px-5 py-3">Fin</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {academicYears.map((year) =>
                                editingId === year.id ? (
                                    <tr key={year.id} className="bg-gold-50/40">
                                        <td className="px-5 py-3" colSpan={5}>
                                            <form
                                                onSubmit={(e) => submitEdit(e, year.id)}
                                                className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end"
                                            >
                                                <TextInput
                                                    aria-label="Libellé"
                                                    value={editForm.data.label}
                                                    onChange={(e) => editForm.setData('label', e.target.value)}
                                                />
                                                <TextInput
                                                    aria-label="Début"
                                                    type="date"
                                                    value={editForm.data.start_date}
                                                    onChange={(e) => editForm.setData('start_date', e.target.value)}
                                                />
                                                <TextInput
                                                    aria-label="Fin"
                                                    type="date"
                                                    value={editForm.data.end_date}
                                                    onChange={(e) => editForm.setData('end_date', e.target.value)}
                                                />
                                                <label className="flex items-center gap-2 text-sm text-ink-700">
                                                    <Checkbox
                                                        checked={editForm.data.is_current}
                                                        onChange={(e) => editForm.setData('is_current', e.target.checked)}
                                                    />
                                                    En cours
                                                </label>
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
                                    <tr key={year.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3 font-medium text-ink-900">{year.label}</td>
                                        <td className="px-5 py-3 text-ink-600">
                                            {new Date(year.start_date).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">
                                            {new Date(year.end_date).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-5 py-3">
                                            {year.is_current && (
                                                <span className="inline-flex rounded-full bg-gold-100 px-2.5 py-1 text-xs font-medium text-gold-800">
                                                    En cours
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <IconButton
                                                    onClick={() => startEdit(year)}
                                                    label="Modifier"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => destroy(year)}
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
                            {academicYears.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune année académique enregistrée pour le moment.</p>
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
