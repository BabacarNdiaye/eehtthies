import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { Room } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { RoomTabs } from '@/Components/Admin/ClusterTabs';

export default function Index({ rooms }: { rooms: Room[] }) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const createForm = useForm({
        name: '',
        type: '',
        capacity: '' as number | '',
    });

    const editForm = useForm({
        name: '',
        type: '',
        capacity: '' as number | '',
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.rooms.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const startEdit = (room: Room) => {
        setEditingId(room.id);
        editForm.setData({
            name: room.name,
            type: room.type ?? '',
            capacity: room.capacity ?? '',
        });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.patch(route('admin.rooms.update', id), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const destroy = async (room: Room) => {
        if (await confirmAction(`Supprimer la salle "${room.name}" ? Cette action est irréversible.`)) {
            router.delete(route('admin.rooms.destroy', room.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Salles" />
            <PageHeader
                title="Salles"
                subtitle="Gérez les salles de classe, ateliers et espaces utilisés pour l'emploi du temps et les examens."
            />
            <RoomTabs current="rooms" />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter une salle</h2>
                <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
                    <Field label="Nom" required error={createForm.errors.name}>
                        <TextInput
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            placeholder="Salle 101"
                        />
                    </Field>
                    <Field label="Type" error={createForm.errors.type} hint="Salle de classe, atelier, amphi...">
                        <TextInput
                            value={createForm.data.type}
                            onChange={(e) => createForm.setData('type', e.target.value)}
                        />
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
                                <th className="px-5 py-3">Nom</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">Capacité</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {rooms.map((r) =>
                                editingId === r.id ? (
                                    <tr key={r.id} className="bg-gold-50/40">
                                        <td className="px-5 py-3" colSpan={4}>
                                            <form
                                                onSubmit={(e) => submitEdit(e, r.id)}
                                                className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
                                            >
                                                <TextInput
                                                    aria-label="Nom"
                                                    value={editForm.data.name}
                                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                                />
                                                <TextInput
                                                    aria-label="Type"
                                                    value={editForm.data.type}
                                                    onChange={(e) => editForm.setData('type', e.target.value)}
                                                />
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
                                    <tr key={r.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3 font-medium text-ink-900">{r.name}</td>
                                        <td className="px-5 py-3 text-ink-600">{r.type ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{r.capacity ?? '—'}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <IconButton
                                                    onClick={() => startEdit(r)}
                                                    label="Modifier"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => destroy(r)}
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
                            {rooms.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune salle enregistrée pour le moment.</p>
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
