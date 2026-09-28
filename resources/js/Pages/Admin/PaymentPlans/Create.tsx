import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Head, useForm } from '@inertiajs/react';
import { useMemo } from 'react';

type StudentOption = { id: number; first_name: string; last_name: string; matricule: string };
type YearOption = { id: number; label: string };

interface Props {
    students: StudentOption[];
    academicYears: YearOption[];
}

export default function Create({ students, academicYears }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        student_id: '',
        academic_year_id: '',
        label: 'Scolarité',
        total_amount: '',
        installments_count: '3',
        first_due_date: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.payment-plans.store'));
    };

    const preview = useMemo(() => {
        const total = parseFloat(data.total_amount);
        const count = parseInt(data.installments_count, 10);
        if (!total || !count || !data.first_due_date) return [];

        const base = Math.floor((total / count) * 100) / 100;
        const rows = [];
        const firstDate = new Date(data.first_due_date);

        for (let i = 1; i <= count; i++) {
            const amount = i === count ? Math.round((total - base * (count - 1)) * 100) / 100 : base;
            const dueDate = new Date(firstDate);
            dueDate.setMonth(dueDate.getMonth() + (i - 1));
            rows.push({ index: i, amount, dueDate: dueDate.toLocaleDateString('fr-FR') });
        }
        return rows;
    }, [data.total_amount, data.installments_count, data.first_due_date]);

    return (
        <AdminLayout>
            <Head title="Nouvel échéancier" />
            <PageHeader title="Nouvel échéancier de paiement" subtitle="Répartit un montant en plusieurs factures mensuelles." />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Élève" error={errors.student_id}>
                            <Select value={data.student_id} onChange={(e) => setData('student_id', e.target.value)}>
                                <option value="">Sélectionner...</option>
                                {students.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.first_name} {s.last_name} ({s.matricule})
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Année académique (optionnel)" error={errors.academic_year_id}>
                            <Select value={data.academic_year_id} onChange={(e) => setData('academic_year_id', e.target.value)}>
                                <option value="">—</option>
                                {academicYears.map((y) => (
                                    <option key={y.id} value={y.id}>
                                        {y.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Libellé" error={errors.label}>
                            <TextInput value={data.label} onChange={(e) => setData('label', e.target.value)} />
                        </Field>
                        <Field label="Montant total (FCFA)" error={errors.total_amount}>
                            <TextInput
                                type="number"
                                min="1"
                                value={data.total_amount}
                                onChange={(e) => setData('total_amount', e.target.value)}
                            />
                        </Field>
                        <Field label="Nombre de tranches" error={errors.installments_count}>
                            <Select value={data.installments_count} onChange={(e) => setData('installments_count', e.target.value)}>
                                {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                                    <option key={n} value={n}>
                                        {n} tranches
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Date de la 1ère échéance" error={errors.first_due_date}>
                            <TextInput
                                type="date"
                                value={data.first_due_date}
                                onChange={(e) => setData('first_due_date', e.target.value)}
                            />
                        </Field>
                        <button
                            type="submit"
                            disabled={processing || preview.length === 0}
                            className="w-full rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Créer l'échéancier
                        </button>
                    </form>
                </Card>

                <Card className="p-6">
                    <h3 className="mb-4 text-base font-semibold text-ink-900">Aperçu du calendrier</h3>
                    {preview.length === 0 ? (
                        <p className="text-sm text-ink-400">
                            Renseignez le montant, le nombre de tranches et la première échéance pour voir l'aperçu.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {preview.map((row) => (
                                <div
                                    key={row.index}
                                    className="flex items-center justify-between rounded-lg border border-ink-100 px-4 py-3"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-ink-900">
                                            Tranche {row.index}/{preview.length}
                                        </p>
                                        <p className="text-xs text-ink-500">Échéance : {row.dueDate}</p>
                                    </div>
                                    <p className="font-serif text-lg font-bold text-ink-900">
                                        {row.amount.toLocaleString('fr-FR')} FCFA
                                    </p>
                                </div>
                            ))}
                            <div className="flex items-center justify-between border-t border-ink-200 pt-3 text-sm">
                                <span className="font-semibold text-ink-700">Total</span>
                                <span className="font-semibold text-ink-900">
                                    {preview.reduce((sum, r) => sum + r.amount, 0).toLocaleString('fr-FR')} FCFA
                                </span>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AdminLayout>
    );
}
