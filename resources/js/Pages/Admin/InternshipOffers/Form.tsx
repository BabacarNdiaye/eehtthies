import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { InternshipOffer } from '@/types';
import { Head, useForm } from '@inertiajs/react';

interface Props {
    offer?: InternshipOffer;
    partners: { id: number; name: string }[];
    formations: { id: number; name: string }[];
}

export default function Form({ offer, partners, formations }: Props) {
    const isEdit = !!offer;

    const { data, setData, post, put, processing, errors } = useForm({
        partner_id: offer?.partner_id ?? ('' as number | ''),
        formation_id: offer?.formation_id ?? ('' as number | ''),
        title: offer?.title ?? '',
        description: offer?.description ?? '',
        positions_available: offer?.positions_available ?? 1,
        start_date: offer?.start_date?.slice(0, 10) ?? '',
        end_date: offer?.end_date?.slice(0, 10) ?? '',
        expires_at: offer?.expires_at?.slice(0, 10) ?? '',
        is_published: offer?.is_published ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.internship-offers.update', offer!.id));
        } else {
            post(route('admin.internship-offers.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? "Modifier l'offre de stage" : 'Nouvelle offre de stage'} />
            <PageHeader title={isEdit ? "Modifier l'offre de stage" : 'Nouvelle offre de stage'} subtitle="Publiez une offre de stage pour une entreprise partenaire." />

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
                    <Field label="Formation ciblée" error={errors.formation_id}>
                        <Select value={data.formation_id} onChange={(e) => setData('formation_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Toutes formations</option>
                            {formations.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Titre" required error={errors.title}>
                            <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} />
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="Description" error={errors.description}>
                            <Textarea rows={4} value={data.description} onChange={(e) => setData('description', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Places disponibles" required error={errors.positions_available}>
                        <TextInput type="number" min={1} value={data.positions_available} onChange={(e) => setData('positions_available', Number(e.target.value))} />
                    </Field>
                    <Field label="Date d'expiration de l'offre" error={errors.expires_at}>
                        <TextInput type="date" value={data.expires_at} onChange={(e) => setData('expires_at', e.target.value)} />
                    </Field>
                    <Field label="Début du stage" error={errors.start_date}>
                        <TextInput type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                    </Field>
                    <Field label="Fin du stage" error={errors.end_date}>
                        <TextInput type="date" value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
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
