import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput, Textarea } from '@/Components/Admin/Field';
import Modal from '@/Components/Modal';
import LibraryBrowser, { LibraryResourceRow } from '@/Components/Library/LibraryBrowser';
import DocumentFileField from '@/Components/Library/DocumentFileField';
import { IconButton } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FormationTabs } from '@/Components/Admin/ClusterTabs';

export default function Index({ resources }: { resources: LibraryResourceRow[] }) {
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<LibraryResourceRow | null>(null);

    const createForm = useForm({
        title: '',
        description: '',
        type: 'document' as 'document' | 'lien',
        file: null as File | null,
        thumbnail: null as File | null,
        url: '',
    });

    const editForm = useForm({ title: '', description: '' });

    const closeCreate = () => {
        setShowCreate(false);
        createForm.reset();
        createForm.clearErrors();
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.library.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => closeCreate(),
        });
    };

    const openEdit = (r: LibraryResourceRow) => {
        setEditing(r);
        editForm.setData({ title: r.title, description: r.description ?? '' });
    };

    const closeEdit = () => {
        setEditing(null);
        editForm.clearErrors();
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        editForm.patch(route('admin.library.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => closeEdit(),
        });
    };

    const destroy = async (r: LibraryResourceRow) => {
        if (await confirmAction(`Supprimer la ressource "${r.title}" ?`)) {
            router.delete(route('admin.library.destroy', r.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Bibliothèque" />
            <PageHeader title="Bibliothèque" subtitle="Ressources partagées, visibles par tous les élèves et enseignants.">
                <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                >
                    <Plus className="h-4 w-4" />
                    Ajouter une ressource
                </button>
            </PageHeader>
            <FormationTabs current="library" />

            <LibraryBrowser
                resources={resources}
                renderActions={(r) => (
                    <>
                        <IconButton onClick={() => openEdit(r)} label="Modifier">
                            <Pencil className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton onClick={() => destroy(r)} label="Supprimer" tone="danger">
                            <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                    </>
                )}
            />

            <Modal show={showCreate} onClose={closeCreate} maxWidth="lg">
                <form onSubmit={submitCreate} className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter une ressource</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Titre" required error={createForm.errors.title}>
                            <TextInput value={createForm.data.title} onChange={(e) => createForm.setData('title', e.target.value)} />
                        </Field>
                        <Field label="Type" error={createForm.errors.type}>
                            <Select
                                value={createForm.data.type}
                                onChange={(e) => createForm.setData('type', e.target.value as 'document' | 'lien')}
                            >
                                <option value="document">Document</option>
                                <option value="lien">Lien</option>
                            </Select>
                        </Field>
                        {createForm.data.type === 'document' ? (
                            <DocumentFileField
                                file={createForm.data.file}
                                onFileChange={(file) => createForm.setData('file', file)}
                                onThumbnailChange={(thumbnail) => createForm.setData('thumbnail', thumbnail)}
                                error={createForm.errors.file}
                            />
                        ) : (
                            <Field label="URL" required error={createForm.errors.url}>
                                <TextInput type="url" placeholder="https://…" value={createForm.data.url} onChange={(e) => createForm.setData('url', e.target.value)} />
                            </Field>
                        )}
                        <div className="sm:col-span-2">
                            <Field label="Description (optionnel)" error={createForm.errors.description}>
                                <Textarea rows={2} value={createForm.data.description} onChange={(e) => createForm.setData('description', e.target.value)} />
                            </Field>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <button type="button" onClick={closeCreate} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-100">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Ajouter
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!editing} onClose={closeEdit} maxWidth="md">
                <form onSubmit={submitEdit} className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Modifier la ressource</h2>
                    <div className="space-y-4">
                        <Field label="Titre" required error={editForm.errors.title}>
                            <TextInput value={editForm.data.title} onChange={(e) => editForm.setData('title', e.target.value)} />
                        </Field>
                        <Field label="Description (optionnel)" error={editForm.errors.description}>
                            <Textarea rows={3} value={editForm.data.description} onChange={(e) => editForm.setData('description', e.target.value)} />
                        </Field>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <button type="button" onClick={closeEdit} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-100">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={editForm.processing}
                            className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Enregistrer
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
