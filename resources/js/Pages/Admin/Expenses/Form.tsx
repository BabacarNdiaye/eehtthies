import AdminLayout from '@/Layouts/AdminLayout';
import AttachmentsPanel from '@/Components/Admin/AttachmentsPanel';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Expense } from '@/types';
import { Head, useForm } from '@inertiajs/react';

interface Props {
    expense?: Expense;
    categories: Record<string, string>;
}

export default function Form({ expense, categories }: Props) {
    const isEdit = !!expense;

    const { data, setData, post, put, processing, errors } = useForm({
        category: expense?.category ?? Object.keys(categories)[0],
        label: expense?.label ?? '',
        amount: expense?.amount ?? ('' as number | ''),
        expense_date: expense?.expense_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        payment_method: expense?.payment_method ?? 'especes',
        supplier_name: expense?.supplier_name ?? '',
        notes: expense?.notes ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.expenses.update', expense!.id));
        } else {
            post(route('admin.expenses.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'} />
            <PageHeader title={isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'} subtitle="Enregistrez une charge de l'établissement." />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Catégorie" required error={errors.category}>
                        <Select value={data.category} onChange={(e) => setData('category', e.target.value)}>
                            {Object.entries(categories).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Mode de paiement" required error={errors.payment_method}>
                        <Select value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value as typeof data.payment_method)}>
                            <option value="especes">Espèces</option>
                            <option value="virement">Virement bancaire</option>
                            <option value="mobile_money">Mobile Money</option>
                            <option value="autre">Autre</option>
                        </Select>
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Libellé" required error={errors.label}>
                            <TextInput value={data.label} onChange={(e) => setData('label', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Montant (FCFA)" required error={errors.amount}>
                        <TextInput type="number" value={data.amount} onChange={(e) => setData('amount', e.target.value ? Number(e.target.value) : '')} />
                    </Field>
                    <Field label="Date de la dépense" required error={errors.expense_date}>
                        <TextInput type="date" value={data.expense_date} onChange={(e) => setData('expense_date', e.target.value)} />
                    </Field>
                    <Field label="Fournisseur" error={errors.supplier_name}>
                        <TextInput value={data.supplier_name} onChange={(e) => setData('supplier_name', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Notes" error={errors.notes}>
                            <Textarea rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Créer la dépense'}
                    </button>
                </FormActions>
            </form>
            {expense && (
                <AttachmentsPanel target="expense" targetId={expense.id} attachments={expense.attachments} title="Justificatifs" hint="Facture, reçu ou bon de commande (PDF, JPG, PNG, DOC, 5 Mo maximum)." />
            )}
        </AdminLayout>
    );
}
