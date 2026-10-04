import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, Select, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Product } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

interface Props {
    product?: Product;
    suppliers: { id: number; name: string }[];
    categories: Record<string, string>;
}

export default function Form({ product, suppliers, categories }: Props) {
    const isEdit = !!product;

    const { data, setData, post, put, processing, errors } = useForm({
        name: product?.name ?? '',
        category: product?.category ?? Object.keys(categories)[0],
        unit: product?.unit ?? 'unité',
        unit_cost: product?.unit_cost ?? 0,
        min_threshold: product?.min_threshold ?? 0,
        supplier_id: product?.supplier_id ?? ('' as number | ''),
        is_active: product?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.products.update', product!.id));
        } else {
            post(route('admin.products.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier le produit' : 'Nouveau produit'} />
            <PageHeader title={isEdit ? 'Modifier le produit' : 'Nouveau produit'} subtitle="Renseignez les informations de l'article." />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Field label="Nom du produit" required error={errors.name}>
                            <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Catégorie" required error={errors.category}>
                        <Select value={data.category} onChange={(e) => setData('category', e.target.value)}>
                            {Object.entries(categories).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Unité" required error={errors.unit} hint="kg, litre, pièce...">
                        <TextInput value={data.unit} onChange={(e) => setData('unit', e.target.value)} />
                    </Field>
                    <Field label="Coût unitaire (FCFA)" required error={errors.unit_cost}>
                        <TextInput type="number" step="0.01" value={data.unit_cost} onChange={(e) => setData('unit_cost', Number(e.target.value))} />
                    </Field>
                    <Field label="Seuil d'alerte" required error={errors.min_threshold}>
                        <TextInput type="number" step="0.01" value={data.min_threshold} onChange={(e) => setData('min_threshold', Number(e.target.value))} />
                    </Field>
                    <Field label="Fournisseur" error={errors.supplier_id}>
                        <Select value={data.supplier_id} onChange={(e) => setData('supplier_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Aucun</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        Produit actif
                    </label>
                </Card>

                {!isEdit && (
                    <p className="text-xs text-ink-500">
                        Le stock initial est à 0. Utilisez « Mouvements de stock » après création pour enregistrer une
                        entrée.
                    </p>
                )}
                {isEdit && (
                    <p className="text-xs text-ink-500">
                        Stock actuel : {product!.quantity_in_stock} {product!.unit}. Utilisez{' '}
                        <Link href={route('admin.products.movements', { product_id: product!.id })} className="text-gold-700 hover:underline">
                            les mouvements de stock
                        </Link>{' '}
                        pour l'ajuster.
                    </p>
                )}

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}
