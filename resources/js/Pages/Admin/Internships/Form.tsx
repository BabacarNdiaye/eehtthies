import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { Internship } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Download } from 'lucide-react';

interface Props {
    internship?: Internship;
    students: { id: number; first_name: string; last_name: string; matricule: string }[];
    partners: { id: number; name: string }[];
    offers: { id: number; title: string; partner_id: number }[];
    statuses: Record<string, string>;
}

export default function Form({ internship, students, partners, offers, statuses }: Props) {
    const isEdit = !!internship;

    const { data, setData, post, put, processing, errors } = useForm({
        student_id: internship?.student_id ?? ('' as number | ''),
        partner_id: internship?.partner_id ?? ('' as number | ''),
        internship_offer_id: internship?.internship_offer_id ?? ('' as number | ''),
        title: internship?.title ?? '',
        start_date: internship?.start_date?.slice(0, 10) ?? '',
        end_date: internship?.end_date?.slice(0, 10) ?? '',
        supervisor_name: internship?.supervisor_name ?? '',
        supervisor_phone: internship?.supervisor_phone ?? '',
        supervisor_email: internship?.supervisor_email ?? '',
        status: internship?.status ?? 'en_cours',
        evaluation_score: internship?.evaluation_score ?? '',
        evaluation_appreciation: internship?.evaluation_appreciation ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.internships.update', internship!.id));
        } else {
            post(route('admin.internships.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier le stage' : 'Nouveau stage'} />
            <PageHeader title={isEdit ? 'Modifier le stage' : 'Nouveau stage'} subtitle="Enregistrez le placement en stage d'un élève." />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Élève" required error={errors.student_id}>
                        <Select value={data.student_id} onChange={(e) => setData('student_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Sélectionner...</option>
                            {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.first_name} {s.last_name} ({s.matricule})
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Entreprise partenaire" required error={errors.partner_id}>
                        <Select value={data.partner_id} onChange={(e) => setData('partner_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Sélectionner...</option>
                            {partners.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Offre de stage liée (optionnel)" error={errors.internship_offer_id}>
                            <Select value={data.internship_offer_id} onChange={(e) => setData('internship_offer_id', e.target.value ? Number(e.target.value) : '')}>
                                <option value="">Aucune</option>
                                {offers.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.title}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="Intitulé du stage" required error={errors.title}>
                            <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Date de début" required error={errors.start_date}>
                        <TextInput type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                    </Field>
                    <Field label="Date de fin" error={errors.end_date}>
                        <TextInput type="date" value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
                    </Field>
                    <Field label="Statut" required error={errors.status}>
                        <Select value={data.status} onChange={(e) => setData('status', e.target.value as typeof data.status)}>
                            {Object.entries(statuses).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <h2 className="font-serif text-base font-bold text-ink-900 sm:col-span-2">Tuteur professionnel</h2>
                    <Field label="Nom" error={errors.supervisor_name}>
                        <TextInput value={data.supervisor_name} onChange={(e) => setData('supervisor_name', e.target.value)} />
                    </Field>
                    <Field label="Téléphone" error={errors.supervisor_phone}>
                        <TextInput value={data.supervisor_phone} onChange={(e) => setData('supervisor_phone', e.target.value)} />
                    </Field>
                    <Field label="E-mail" error={errors.supervisor_email}>
                        <TextInput type="email" value={data.supervisor_email} onChange={(e) => setData('supervisor_email', e.target.value)} />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <h2 className="font-serif text-base font-bold text-ink-900 sm:col-span-2">Évaluation</h2>
                    <Field label="Note / 20" error={errors.evaluation_score}>
                        <TextInput type="number" step="0.5" min={0} max={20} value={data.evaluation_score} onChange={(e) => setData('evaluation_score', e.target.value ? Number(e.target.value) : '')} />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Appréciation" error={errors.evaluation_appreciation}>
                            <Textarea rows={3} value={data.evaluation_appreciation} onChange={(e) => setData('evaluation_appreciation', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <div className="flex items-center justify-between">
                    {isEdit && internship!.status === 'termine' && (
                        <a
                            href={route('admin.internships.attestation', internship!.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                        >
                            <Download className="h-4 w-4" /> Télécharger l'attestation
                        </a>
                    )}
                    <button type="submit" disabled={processing} className="ml-auto rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                        {isEdit ? 'Enregistrer les modifications' : 'Créer le stage'}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
