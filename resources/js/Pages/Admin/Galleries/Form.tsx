import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Checkbox } from '@/Components/Admin/Field';
import { Gallery, GalleryMediaItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Film, Trash2, UploadCloud } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';

type GalleryWithMedia = Gallery & { media: GalleryMediaItem[] };

export default function Form({ gallery }: { gallery?: GalleryWithMedia }) {
    const isEdit = !!gallery;

    const { data, setData, post, put, processing, errors } = useForm({
        title: gallery?.title ?? '',
        category: gallery?.category ?? '',
        is_published: gallery?.is_published ?? false,
    });

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.galleries.update', gallery!.id));
        } else {
            post(route('admin.galleries.store'));
        }
    };

    const uploadFiles = (e: ChangeEvent<HTMLInputElement>) => {
        if (!gallery || !e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        router.post(
            route('admin.galleries.media.store', gallery.id),
            { files: Array.from(e.target.files) },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                },
            },
        );
    };

    const deleteMedia = (media: GalleryMediaItem) => {
        if (!gallery) return;
        if (confirm('Supprimer ce média de l\'album ?')) {
            router.delete(route('admin.galleries.media.destroy', [gallery.id, media.id]), {
                preserveScroll: true,
            });
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? "Modifier l'album" : 'Nouvel album'} />
            <PageHeader
                title={isEdit ? "Modifier l'album" : 'Nouvel album'}
                subtitle="Renseignez les informations de l'album photo/vidéo."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Titre de l'album" required error={errors.title}>
                        <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} />
                    </Field>
                    <Field label="Catégorie" error={errors.category}>
                        <TextInput value={data.category} onChange={(e) => setData('category', e.target.value)} />
                    </Field>
                </Card>

                <Card className="flex flex-wrap items-center gap-6 p-6">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_published} onChange={(e) => setData('is_published', e.target.checked)} />
                        Publié (visible sur le site public)
                    </label>
                </Card>

                <div className="flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : "Créer l'album"}
                    </button>
                </div>
            </form>

            {isEdit && gallery && (
                <Card className="mt-8 p-6">
                    <h2 className="font-serif text-lg font-bold text-ink-900">Médias de l'album</h2>
                    <p className="mt-1 text-sm text-ink-500">
                        Ajoutez des photos ou vidéos à cet album (formats acceptés : jpg, png, webp, mp4, mov — 20&nbsp;Mo max).
                    </p>

                    <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 px-6 py-8 text-center hover:border-gold-400 hover:bg-gold-50/40">
                        <UploadCloud className="h-6 w-6 text-ink-400" />
                        <span className="text-sm font-medium text-ink-600">
                            {uploading ? 'Envoi en cours...' : 'Cliquez pour sélectionner des fichiers'}
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            disabled={uploading}
                            onChange={uploadFiles}
                        />
                    </label>

                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {gallery.media.map((item) => (
                            <div
                                key={item.id}
                                className="group relative overflow-hidden rounded-lg border border-ink-100 bg-ink-50"
                            >
                                {item.type === 'image' ? (
                                    <img
                                        src={`/storage/${item.path}`}
                                        alt={item.caption ?? ''}
                                        className="h-32 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-32 w-full items-center justify-center bg-ink-800">
                                        <Film className="h-8 w-8 text-white/70" />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => deleteMedia(item)}
                                    className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-red-500 opacity-0 shadow transition group-hover:opacity-100"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {gallery.media.length === 0 && (
                            <p className="col-span-full py-6 text-center text-sm text-ink-400">
                                Aucun média ajouté pour le moment.
                            </p>
                        )}
                    </div>
                </Card>
            )}
        </AdminLayout>
    );
}
