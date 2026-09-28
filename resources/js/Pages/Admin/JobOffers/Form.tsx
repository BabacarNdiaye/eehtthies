import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { JobOffer } from '@/types';
import { Head, useForm } from '@inertiajs/react';

interface Props {
    offer?: JobOffer;
    partners: { id: number; name: string }[];
    contractTypes: Record<string, string>;
}

export default function Form({ offer, partners, contractTypes }: Props) {
    const isEdit = !!offer;

    const { data, setData, post, put, processing, errors } = useForm({
        partner_id: offer?.partner_id ?? ('' as number | ''),
        title: offer?.title ?? '',
        description: offer?.description ?? '',
        contract_type: offer?.contract_type ?? 'cdi',
        location: offer?.location ?? '',
        expires_at: offer?.expires_at?.slice(0, 10) ?? '',
        is_published: offer?.is_published ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.job-offers.update', offer!.id));
        } else {
            post(route('admin.job-offers.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? "Modifier l'offre d'emploi" : "Nouvelle offre d'emploi"} />
            <PageHeader title={isEdit ? "Modifier l'offre d'emploi" : "Nouvelle offre d'emploi"} subtitle="Publiez une offre d'emploi pour une entreprise partenaire." />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Partenaire" required error={errors.partner_id}>
                        <Select value={data.partner_id} onChange={(e) => setData('partner_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Sélectionner...</option>
                            {partners.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Type de contrat" required error={errors.contract_type}>
                        <Select value={data.contract_type} onChange={(e) => setData('contract_type', e.target.value as typeof data.contract_type)}>
                            {Object.entries(contractTypes).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Intitulé du poste" required error={errors.title}>
                            <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} />
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="Description" error={errors.description}>
                            <Textarea rows={4} value={data.description} onChange={(e) => setData('description', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Lieu" error={errors.location}>
                        <TextInput value={data.location} onChange={(e) => setData('location', e.target.value)} />
                    </Field>
                    <Field label="Date d'expiration" error={errors.expires_at}>
                        <TextInput type="date" value={data.expires_at} onChange={(e) => setData('expires_at', e.target.value)} />
                    </Field>
                </Card>

                <Card className="p-6">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_published} onChange={(e) => setData('is_published', e.target.checked)} />
                        Publier sur le site public
                    </label>
                </Card>

                <div className="flex justify-end gap-3">
                    <button type="submit" disabled={processing} className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                        {isEdit ? 'Enregistrer les modifications' : "Créer l'offre"}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
