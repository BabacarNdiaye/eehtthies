import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import FormActions from '@/Components/Admin/FormActions';
import { PracticalSession } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    session?: PracticalSession;
    schoolClasses: { id: number; name: string }[];
    subjects: { id: number; name: string }[];
    teachers: { id: number; first_name: string; last_name: string }[];
    products: { id: number; name: string; unit: string; unit_cost: number; quantity_in_stock: number }[];
}

const fcfa = (v: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} FCFA`;

export default function Form({ session, schoolClasses, subjects, teachers, products }: Props) {
    const isEdit = !!session;

    const { data, setData, post, put, processing, errors } = useForm({
        title: session?.title ?? '',
        school_class_id: session?.school_class_id ?? ('' as number | ''),
        subject_id: session?.subject_id ?? ('' as number | ''),
        teacher_id: session?.teacher_id ?? ('' as number | ''),
        session_date: session?.session_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        notes: session?.notes ?? '',
    });

    const itemForm = useForm({
        product_id: '' as number | '',
        quantity_used: '' as number | '',
    });

    const [itemError, setItemError] = useState<string | null>(null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.practical-sessions.update', session!.id));
        } else {
            post(route('admin.practical-sessions.store'));
        }
    };

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        setItemError(null);
        itemForm.post(route('admin.practical-sessions.items.store', session!.id), {
            preserveScroll: true,
            onSuccess: () => itemForm.reset(),
            onError: (errs) => setItemError(Object.values(errs)[0] as string),
        });
    };

    const removeItem = (itemId: number) => {
        if (confirm('Retirer ce produit de la séance ? Le stock consommé sera restitué.')) {
            router.delete(route('admin.practical-sessions.items.destroy', [session!.id, itemId]), { preserveScroll: true });
        }
    };

    const estimatedCost = (session?.items ?? []).reduce((sum, item) => sum + Number(item.quantity_used) * Number(item.unit_cost_at_time), 0);

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier la séance' : 'Nouvelle séance'} />
            <PageHeader title={isEdit ? 'Modifier la séance' : 'Nouvelle séance pratique'} subtitle="Enregistrez une séance d'atelier et les produits consommés." />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Field label="Titre de la séance" required error={errors.title}>
                            <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder="Atelier pâtisserie — Croissants" />
                        </Field>
                    </div>
                    <Field label="Classe" required error={errors.school_class_id}>
                        <Select value={data.school_class_id} onChange={(e) => setData('school_class_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Sélectionner...</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Matière" error={errors.subject_id}>
                        <Select value={data.subject_id} onChange={(e) => setData('subject_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Aucune</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Enseignant" error={errors.teacher_id}>
                        <Select value={data.teacher_id} onChange={(e) => setData('teacher_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Aucun</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.first_name} {t.last_name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Date de la séance" required error={errors.session_date}>
                        <TextInput type="date" value={data.session_date} onChange={(e) => setData('session_date', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Notes" error={errors.notes}>
                            <Textarea rows={2} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <FormActions>
                    <button type="submit" disabled={processing} className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                        {isEdit ? 'Enregistrer les modifications' : 'Créer la séance'}
                    </button>
                </FormActions>
            </form>

            {isEdit && (
                <Card className="mt-6 overflow-hidden">
                    <div className="border-b border-ink-100 p-5">
                        <h2 className="font-serif text-lg font-semibold text-ink-900">Produits consommés</h2>
                        <p className="text-sm text-ink-500">Coût estimé de la séance : {fcfa(estimatedCost)}</p>
                    </div>

                    <form onSubmit={addItem} className="grid grid-cols-1 gap-3 border-b border-ink-100 p-5 sm:grid-cols-4 sm:items-end">
                        <Field label="Produit" required>
                            <Select value={itemForm.data.product_id} onChange={(e) => itemForm.setData('product_id', e.target.value ? Number(e.target.value) : '')}>
                                <option value="">Sélectionner...</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.quantity_in_stock} {p.unit} disponible)
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Quantité utilisée" required>
                            <TextInput type="number" step="0.01" value={itemForm.data.quantity_used} onChange={(e) => itemForm.setData('quantity_used', e.target.value ? Number(e.target.value) : '')} />
                        </Field>
                        <button type="submit" disabled={itemForm.processing} className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50">
                            Ajouter
                        </button>
                        {itemError && <p className="sm:col-span-4 text-xs text-red-600">{itemError}</p>}
                    </form>

                    <ul className="divide-y divide-ink-100">
                        {(session?.items ?? []).map((item) => (
                            <li key={item.id} className="flex items-center justify-between px-5 py-3">
                                <div>
                                    <p className="text-sm font-medium text-ink-900">{item.product?.name}</p>
                                    <p className="text-xs text-ink-500">
                                        {item.quantity_used} {item.product?.unit} × {fcfa(Number(item.unit_cost_at_time))} ={' '}
                                        {fcfa(Number(item.quantity_used) * Number(item.unit_cost_at_time))}
                                    </p>
                                </div>
                                <IconButton onClick={() => removeItem(item.id)} label="Supprimer" tone="danger">
                                    <Trash2 className="h-4 w-4" />
                                </IconButton>
                            </li>
                        ))}
                        {(session?.items ?? []).length === 0 && (
                            <li className="px-5 py-8 text-center text-ink-500">Aucun produit consommé pour cette séance.</li>
                        )}
                    </ul>
                </Card>
            )}
        </AdminLayout>
    );
}
