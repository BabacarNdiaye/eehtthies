import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { MONTH_LABELS } from '@/lib/months';
import { Head, useForm } from '@inertiajs/react';

interface Props {
    students: { id: number; first_name: string; last_name: string; matricule: string }[];
    academicYears: { id: number; label: string }[];
    types: Record<string, string>;
}

export default function Form({ students, academicYears, types }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        student_id: '' as number | '',
        academic_year_id: '' as number | '',
        type: 'scolarite',
        period_month: '' as number | '',
        label: '',
        amount: '' as number | '',
        discount: 0,
        due_date: '',
        notes: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.invoices.store'));
    };

    return (
        <AdminLayout>
            <Head title="Nouvelle facture" />
            <PageHeader title="Nouvelle facture" subtitle="Créez une facture manuelle pour un élève." />

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
                    <Field label="Type" required error={errors.type}>
                        <Select value={data.type} onChange={(e) => setData('type', e.target.value)}>
                            {Object.entries(types).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    {data.type === 'mensualite' && (
                        <Field label="Mois" required error={errors.period_month}>
                            <Select
                                value={data.period_month}
                                onChange={(e) => setData('period_month', e.target.value ? Number(e.target.value) : '')}
                            >
                                <option value="">Sélectionner...</option>
                                {Object.entries(MONTH_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    )}
                    <div className="sm:col-span-2">
                        <Field label="Libellé" required error={errors.label}>
                            <TextInput value={data.label} onChange={(e) => setData('label', e.target.value)} placeholder="Frais de scolarité — Semestre 1" />
                        </Field>
                    </div>
                    <Field label="Montant (FCFA)" required error={errors.amount}>
                        <TextInput type="number" value={data.amount} onChange={(e) => setData('amount', e.target.value ? Number(e.target.value) : '')} />
                    </Field>
                    <Field label="Remise (FCFA)" error={errors.discount}>
                        <TextInput type="number" value={data.discount} onChange={(e) => setData('discount', Number(e.target.value))} />
                    </Field>
                    <Field label="Année académique" error={errors.academic_year_id}>
                        <Select value={data.academic_year_id} onChange={(e) => setData('academic_year_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Aucune</option>
                            {academicYears.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {y.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Date d'échéance" error={errors.due_date}>
                        <TextInput type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Notes" error={errors.notes}>
                            <Textarea rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        Créer la facture
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
