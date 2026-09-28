import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea, Select, Checkbox } from '@/Components/Admin/Field';
import { NewsArticle } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ChangeEvent, useState } from 'react';
import { Trash2 } from 'lucide-react';

function toDatetimeLocal(value?: string | null) {
    if (!value) return '';
    return value.slice(0, 16);
}

export default function Form({ article }: { article?: NewsArticle }) {
    const isEdit = !!article;
    const [preview, setPreview] = useState<string | null>(
        article?.image ? `/storage/${article.image}` : null,
    );

    const { data, setData, post, transform, processing, errors } = useForm({
        title: article?.title ?? '',
        excerpt: article?.excerpt ?? '',
        content: article?.content ?? '',
        category: article?.category ?? '',
        source: article?.source ?? 'manuel',
        facebook_post_url: article?.facebook_post_url ?? '',
        is_published: article?.is_published ?? false,
        is_featured: article?.is_featured ?? false,
        published_at: toDatetimeLocal(article?.published_at),
        image: null as File | null,
    });

    const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('image', file);
        if (file) setPreview(URL.createObjectURL(file));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            // POST + _method spoof: PHP does not parse multipart bodies on PUT/PATCH requests.
            transform((data) => ({ ...data, _method: 'put' }));
            post(route('admin.news.update', article!.id), { forceFormData: true });
        } else {
            post(route('admin.news.store'), { forceFormData: true });
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? "Modifier l'article" : 'Nouvel article'} />
            <PageHeader
                title={isEdit ? "Modifier l'article" : 'Nouvel article'}
                subtitle="Renseignez le contenu de l'article d'actualité."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Titre" required error={errors.title}>
                        <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} />
                    </Field>
                    <Field label="Catégorie" error={errors.category}>
                        <TextInput value={data.category} onChange={(e) => setData('category', e.target.value)} />
                    </Field>
                    <Field label="Source" required error={errors.source}>
                        <Select
                            value={data.source}
                            onChange={(e) => setData('source', e.target.value as 'manuel' | 'facebook')}
                        >
                            <option value="manuel">Saisie manuelle</option>
                            <option value="facebook">Facebook</option>
                        </Select>
                    </Field>
                    {data.source === 'facebook' && (
                        <Field label="Lien de la publication Facebook" error={errors.facebook_post_url}>
                            <TextInput
                                type="url"
                                value={data.facebook_post_url}
                                onChange={(e) => setData('facebook_post_url', e.target.value)}
                                placeholder="https://facebook.com/..."
                            />
                        </Field>
                    )}
                    <Field label="Date de publication" error={errors.published_at}>
                        <TextInput
                            type="datetime-local"
                            value={data.published_at}
                            onChange={(e) => setData('published_at', e.target.value)}
                        />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Extrait" error={errors.excerpt} hint="Court résumé affiché dans les listes.">
                        <Textarea rows={2} value={data.excerpt} onChange={(e) => setData('excerpt', e.target.value)} />
                    </Field>
                    <Field label="Contenu" required error={errors.content}>
                        <Textarea rows={12} value={data.content} onChange={(e) => setData('content', e.target.value)} />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Photo de l'article" error={errors.image} hint="Format paysage recommandé, 5 Mo max.">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onImageChange}
                            className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
                        />
                    </Field>
                    {preview && (
                        <img src={preview} alt="Aperçu" className="h-40 w-full max-w-md rounded-lg object-cover" />
                    )}
                </Card>

                <Card className="flex flex-wrap items-center gap-6 p-6">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_published} onChange={(e) => setData('is_published', e.target.checked)} />
                        Publié (visible sur le site public)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_featured} onChange={(e) => setData('is_featured', e.target.checked)} />
                        Mettre en avant (article vedette)
                    </label>
                </Card>

                <div className="flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : "Créer l'article"}
                    </button>
                </div>
            </form>

            {isEdit && <PhotosCard article={article!} />}
        </AdminLayout>
    );
}

function PhotosCard({ article }: { article: NewsArticle }) {
    const upload = useForm({ photos: [] as File[] });
    const [previews, setPreviews] = useState<string[]>([]);

    const onFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        upload.setData('photos', files);
        setPreviews(files.map((f) => URL.createObjectURL(f)));
    };

    const submitUpload = (e: React.FormEvent) => {
        e.preventDefault();
        upload.post(route('admin.news.photos.store', article.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                upload.reset('photos');
                setPreviews([]);
            },
        });
    };

    const photos = article.photos ?? [];

    return (
        <Card className="mt-6 p-6">
            <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Autres photos</h2>
            <p className="mb-4 text-sm text-ink-500">
                Ajoutez plusieurs photos supplémentaires affichées dans la galerie de l'article (JPG/PNG, 5 Mo max
                chacune).
            </p>

            <form onSubmit={submitUpload} className="mb-5 flex flex-col gap-3 rounded-lg bg-ink-50 p-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <Field label="Sélectionner des photos" error={upload.errors.photos}>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={onFilesChange}
                            className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                        />
                    </Field>
                </div>
                <button
                    type="submit"
                    disabled={upload.processing || upload.data.photos.length === 0}
                    className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Ajouter
                </button>
            </form>

            {previews.length > 0 && (
                <div className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {previews.map((src, i) => (
                        <img key={i} src={src} alt="Aperçu" className="h-20 w-full rounded-lg object-cover" />
                    ))}
                </div>
            )}

            {photos.length === 0 ? (
                <p className="text-sm text-ink-400">Aucune photo supplémentaire pour cet article.</p>
            ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {photos.map((photo) => (
                        <div key={photo.id} className="group relative overflow-hidden rounded-lg">
                            <img src={`/storage/${photo.path}`} alt="" className="h-24 w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('Supprimer cette photo ?')) {
                                        router.delete(
                                            route('admin.news.photos.destroy', [article.id, photo.id]),
                                            { preserveScroll: true },
                                        );
                                    }
                                }}
                                className="absolute inset-0 flex items-center justify-center bg-ink-950/60 text-white opacity-0 transition group-hover:opacity-100"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
