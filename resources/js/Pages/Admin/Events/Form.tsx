import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea, Checkbox } from '@/Components/Admin/Field';
import { EventItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ChangeEvent, useState } from 'react';

function toDatetimeLocal(value?: string | null) {
    if (!value) return '';
    return value.slice(0, 16);
}

export default function Form({ event }: { event?: EventItem }) {
    const isEdit = !!event;
    const [preview, setPreview] = useState<string | null>(
        event?.image ? `/storage/${event.image}` : null,
    );

    const { data, setData, post, transform, processing, errors } = useForm({
        title: event?.title ?? '',
        description: event?.description ?? '',
        location: event?.location ?? '',
        start_at: toDatetimeLocal(event?.start_at),
        end_at: toDatetimeLocal(event?.end_at),
        is_published: event?.is_published ?? false,
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
            post(route('admin.events.update', event!.id), { forceFormData: true });
        } else {
            post(route('admin.events.store'), { forceFormData: true });
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? "Modifier l'événement" : 'Nouvel événement'} />
            <PageHeader
                title={isEdit ? "Modifier l'événement" : 'Nouvel événement'}
                subtitle="Renseignez les informations de l'événement."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Titre" required error={errors.title}>
                        <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} />
                    </Field>
                    <Field label="Lieu" error={errors.location}>
                        <TextInput value={data.location} onChange={(e) => setData('location', e.target.value)} />
                    </Field>
                    <Field label="Date et heure de début" required error={errors.start_at}>
                        <TextInput
                            type="datetime-local"
                            value={data.start_at}
                            onChange={(e) => setData('start_at', e.target.value)}
                        />
                    </Field>
                    <Field label="Date et heure de fin" error={errors.end_at}>
                        <TextInput
                            type="datetime-local"
                            value={data.end_at}
                            onChange={(e) => setData('end_at', e.target.value)}
                        />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Description" error={errors.description}>
                        <Textarea rows={6} value={data.description} onChange={(e) => setData('description', e.target.value)} />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Photo de l'événement" error={errors.image} hint="Format paysage recommandé, 5 Mo max.">
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
                </Card>

                <div className="flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : "Créer l'événement"}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
