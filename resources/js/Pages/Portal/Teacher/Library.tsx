import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Field, Select, TextInput, Textarea } from '@/Components/Admin/Field';
import Modal from '@/Components/Modal';
import LibraryBrowser, { LibraryResourceRow } from '@/Components/Library/LibraryBrowser';
import DocumentFileField from '@/Components/Library/DocumentFileField';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function Library({ resources }: { resources: LibraryResourceRow[] }) {
    const currentUserId = usePage().props.auth.user?.id;
    const [showCreate, setShowCreate] = useState(false);

    const form = useForm({
        title: '',
        description: '',
        type: 'document' as 'document' | 'lien',
        file: null as File | null,
        thumbnail: null as File | null,
        url: '',
    });

    const closeCreate = () => {
        setShowCreate(false);
        form.reset();
        form.clearErrors();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('teacher.library.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => closeCreate(),
        });
    };

    const destroy = (r: LibraryResourceRow) => {
        if (confirm(`Supprimer la ressource "${r.title}" ?`)) {
            router.delete(route('teacher.library.destroy', r.id), { preserveScroll: true });
        }
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Bibliothèque" />
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-ink-900">Bibliothèque</h1>
                    <p className="mt-1 text-sm text-ink-500">Ressources partagées, visibles par tous les élèves et enseignants.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                >
                    <Plus className="h-4 w-4" />
                    Ajouter une ressource
                </button>
            </div>

            <LibraryBrowser
                resources={resources}
                renderActions={(r) =>
                    r.uploaded_by?.id === currentUserId ? (
                        <button onClick={() => destroy(r)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    ) : null
                }
            />

            <Modal show={showCreate} onClose={closeCreate} maxWidth="lg">
                <form onSubmit={submit} className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Ajouter une ressource</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Titre" required error={form.errors.title}>
                            <TextInput value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                        </Field>
                        <Field label="Type" error={form.errors.type}>
                            <Select value={form.data.type} onChange={(e) => form.setData('type', e.target.value as 'document' | 'lien')}>
                                <option value="document">Document</option>
                                <option value="lien">Lien</option>
                            </Select>
                        </Field>
                        {form.data.type === 'document' ? (
                            <DocumentFileField
                                file={form.data.file}
                                onFileChange={(file) => form.setData('file', file)}
                                onThumbnailChange={(thumbnail) => form.setData('thumbnail', thumbnail)}
                                error={form.errors.file}
                            />
                        ) : (
                            <Field label="URL" required error={form.errors.url}>
                                <TextInput type="url" placeholder="https://…" value={form.data.url} onChange={(e) => form.setData('url', e.target.value)} />
                            </Field>
                        )}
                        <div className="sm:col-span-2">
                            <Field label="Description (optionnel)" error={form.errors.description}>
                                <Textarea rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                            </Field>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <button type="button" onClick={closeCreate} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-100">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Ajouter
                        </button>
                    </div>
                </form>
            </Modal>
        </PortalLayout>
    );
}
