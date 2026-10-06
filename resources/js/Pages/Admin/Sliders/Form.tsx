import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea, Checkbox } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Slider } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ChangeEvent, useState } from 'react';

export default function Form({ slider }: { slider?: Slider }) {
    const isEdit = !!slider;
    const [preview, setPreview] = useState<string | null>(
        slider?.image ? `/storage/${slider.image}` : null,
    );

    const { data, setData, post, transform, processing, errors } = useForm<{
        title: string;
        subtitle: string;
        image: File | null;
        button_text: string;
        button_link: string;
        order: number;
        is_active: boolean;
    }>({
        title: slider?.title ?? '',
        subtitle: slider?.subtitle ?? '',
        image: null,
        button_text: slider?.button_text ?? '',
        button_link: slider?.button_link ?? '',
        order: slider?.order ?? 0,
        is_active: slider?.is_active ?? true,
    });

    const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('image', file);
        if (file) {
            setPreview(URL.createObjectURL(file));
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            // POST + simulation de _method : PHP n'analyse pas les corps multipart des requêtes PUT/PATCH.
            transform((data) => ({ ...data, _method: 'put' }));
            post(route('admin.sliders.update', slider!.id), { forceFormData: true });
        } else {
            post(route('admin.sliders.store'), { forceFormData: true });
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier la slide' : 'Nouvelle slide'} />
            <PageHeader
                title={isEdit ? 'Modifier la slide' : 'Nouvelle slide'}
                subtitle="Renseignez les informations de la slide d'accueil."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Titre" required error={errors.title}>
                        <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} />
                    </Field>
                    <Field label="Ordre d'affichage" error={errors.order}>
                        <TextInput
                            type="number"
                            value={data.order}
                            onChange={(e) => setData('order', Number(e.target.value))}
                        />
                    </Field>
                    <Field label="Texte du bouton" error={errors.button_text}>
                        <TextInput value={data.button_text} onChange={(e) => setData('button_text', e.target.value)} />
                    </Field>
                    <Field label="Lien du bouton" error={errors.button_link}>
                        <TextInput
                            value={data.button_link}
                            onChange={(e) => setData('button_link', e.target.value)}
                            placeholder="/formations"
                        />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Sous-titre" error={errors.subtitle}>
                            <Textarea rows={2} value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Image" error={errors.image} hint="Format recommandé : paysage, 5 Mo max.">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onImageChange}
                            className="block w-full text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
                        />
                    </Field>
                    {preview && (
                        <img
                            src={preview}
                            alt="Aperçu"
                            className="h-40 w-full max-w-md rounded-lg object-cover"
                        />
                    )}
                </Card>

                <Card className="flex flex-wrap items-center gap-6 p-6">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Active (visible sur le site public)
                    </label>
                </Card>

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Créer la slide'}
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}
