import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea, Checkbox } from '@/Components/Admin/Field';
import { Partner } from '@/types';
import { Head, useForm } from '@inertiajs/react';

export default function Form({ partner }: { partner?: Partner }) {
    const isEdit = !!partner;

    const { data, setData, post, put, processing, errors } = useForm({
        name: partner?.name ?? '',
        type: partner?.type ?? '',
        description: partner?.description ?? '',
        website: partner?.website ?? '',
        contact_name: partner?.contact_name ?? '',
        contact_email: partner?.contact_email ?? '',
        contact_phone: partner?.contact_phone ?? '',
        is_published: partner?.is_published ?? false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.partners.update', partner!.id));
        } else {
            post(route('admin.partners.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier le partenaire' : 'Nouveau partenaire'} />
            <PageHeader
                title={isEdit ? 'Modifier le partenaire' : 'Nouveau partenaire'}
                subtitle="Renseignez les informations du partenaire."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Nom du partenaire" required error={errors.name}>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    </Field>
                    <Field label="Type" error={errors.type} hint="ex: Entreprise, Institution, Hôtel...">
                        <TextInput value={data.type} onChange={(e) => setData('type', e.target.value)} />
                    </Field>
                    <Field label="Site web" error={errors.website}>
                        <TextInput
                            type="url"
                            value={data.website}
                            onChange={(e) => setData('website', e.target.value)}
                            placeholder="https://"
                        />
                    </Field>
                    <Field label="Nom du contact" error={errors.contact_name}>
                        <TextInput value={data.contact_name} onChange={(e) => setData('contact_name', e.target.value)} />
                    </Field>
                    <Field label="E-mail du contact" error={errors.contact_email}>
                        <TextInput
                            type="email"
                            value={data.contact_email}
                            onChange={(e) => setData('contact_email', e.target.value)}
                        />
                    </Field>
                    <Field label="Téléphone du contact" error={errors.contact_phone}>
                        <TextInput value={data.contact_phone} onChange={(e) => setData('contact_phone', e.target.value)} />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Description" error={errors.description}>
                        <Textarea rows={5} value={data.description} onChange={(e) => setData('description', e.target.value)} />
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
                        {isEdit ? 'Enregistrer les modifications' : 'Créer le partenaire'}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
