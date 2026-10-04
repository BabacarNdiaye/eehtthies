import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea, Checkbox, Select } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Formation } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ChangeEvent, useState } from 'react';

export default function Form({ formation }: { formation?: Formation }) {
    const isEdit = !!formation;
    const [preview, setPreview] = useState<string | null>(
        formation?.image ? `/storage/${formation.image}` : null,
    );

    const { data, setData, post, transform, processing, errors } = useForm({
        name: formation?.name ?? '',
        code: formation?.code ?? '',
        diploma: formation?.diploma ?? '',
        diploma_recognition: formation?.diploma_recognition ?? '',
        level: formation?.level ?? '',
        duration: formation?.duration ?? '',
        description: formation?.description ?? '',
        admission_conditions: formation?.admission_conditions ?? '',
        registration_fee: formation?.registration_fee ?? 0,
        tuition_fee: formation?.tuition_fee ?? 0,
        program: formation?.program ?? '',
        objectives: formation?.objectives ?? '',
        career_prospects: formation?.career_prospects ?? '',
        capacity: formation?.capacity ?? '',
        // Eloquent sérialise le cast `date` en chaîne datetime ISO complète ; un champ <input type='date'>
        // natif exige exactement « AAAA-MM-JJ », sinon il s'affiche silencieusement vide lors de la
        // modification d'une formation existante.
        next_intake_date: formation?.next_intake_date?.slice(0, 10) ?? '',
        is_active: formation?.is_active ?? true,
        order: formation?.order ?? 0,
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
            // POST + simulation de _method : PHP n'analyse pas les corps multipart des requêtes PUT/PATCH.
            transform((data) => ({ ...data, _method: 'put' }));
            post(route('admin.formations.update', formation!.id), { forceFormData: true });
        } else {
            post(route('admin.formations.store'), { forceFormData: true });
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier la formation' : 'Nouvelle formation'} />
            <PageHeader
                title={isEdit ? 'Modifier la formation' : 'Nouvelle formation'}
                subtitle="Renseignez les informations de la formation."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Nom de la formation" required error={errors.name}>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    </Field>
                    <Field label="Code" required error={errors.code}>
                        <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} />
                    </Field>
                    <Field label="Diplôme" error={errors.diploma} hint="CAP, BEP, BT, BTS, DTS...">
                        <TextInput value={data.diploma} onChange={(e) => setData('diploma', e.target.value)} />
                    </Field>
                    <Field
                        label="Reconnaissance du diplôme"
                        error={errors.diploma_recognition}
                        hint="Affichée sur la page publique — important pour la confiance des familles."
                    >
                        <Select
                            value={data.diploma_recognition}
                            onChange={(e) => setData('diploma_recognition', e.target.value)}
                        >
                            <option value="">-- Non renseigné --</option>
                            <option value="Diplôme d'État">Diplôme d'État</option>
                            <option value="Diplôme d'école">Diplôme d'école</option>
                            <option value="Diplôme d'école (validé par la Chambre des Métiers)">
                                Diplôme d'école (validé par la Chambre des Métiers)
                            </option>
                            <option value="Attestation">Attestation</option>
                        </Select>
                    </Field>
                    <Field label="Niveau" error={errors.level}>
                        <TextInput value={data.level} onChange={(e) => setData('level', e.target.value)} />
                    </Field>
                    <Field label="Durée" error={errors.duration} hint="ex: 2 ans">
                        <TextInput value={data.duration} onChange={(e) => setData('duration', e.target.value)} />
                    </Field>
                    <Field label="Capacité d'accueil" error={errors.capacity}>
                        <TextInput type="number" value={data.capacity} onChange={(e) => setData('capacity', e.target.value)} />
                    </Field>
                    <Field
                        label="Prochaine rentrée"
                        error={errors.next_intake_date}
                        hint="Affichée sur la page publique de la formation."
                    >
                        <TextInput
                            type="date"
                            value={data.next_intake_date}
                            onChange={(e) => setData('next_intake_date', e.target.value)}
                        />
                    </Field>
                    <Field label="Frais d'inscription (FCFA)" error={errors.registration_fee}>
                        <TextInput type="number" value={data.registration_fee} onChange={(e) => setData('registration_fee', e.target.value)} />
                    </Field>
                    <Field label="Frais de formation (FCFA)" error={errors.tuition_fee}>
                        <TextInput type="number" value={data.tuition_fee} onChange={(e) => setData('tuition_fee', e.target.value)} />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Description" error={errors.description}>
                        <Textarea rows={4} value={data.description} onChange={(e) => setData('description', e.target.value)} />
                    </Field>
                    <Field label="Conditions d'admission" error={errors.admission_conditions}>
                        <Textarea rows={3} value={data.admission_conditions} onChange={(e) => setData('admission_conditions', e.target.value)} />
                    </Field>
                    <Field label="Programme / matières" error={errors.program}>
                        <Textarea rows={4} value={data.program} onChange={(e) => setData('program', e.target.value)} />
                    </Field>
                    <Field label="Objectifs" error={errors.objectives}>
                        <Textarea rows={3} value={data.objectives} onChange={(e) => setData('objectives', e.target.value)} />
                    </Field>
                    <Field label="Débouchés professionnels" error={errors.career_prospects}>
                        <Textarea rows={3} value={data.career_prospects} onChange={(e) => setData('career_prospects', e.target.value)} />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Photo de la formation" error={errors.image} hint="Format paysage recommandé, 5 Mo max.">
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
                        <Checkbox checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Formation active (visible sur le site public)
                    </label>
                    <Field label="Ordre d'affichage" error={errors.order}>
                        <TextInput type="number" value={data.order} onChange={(e) => setData('order', Number(e.target.value))} />
                    </Field>
                </Card>

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Créer la formation'}
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}
