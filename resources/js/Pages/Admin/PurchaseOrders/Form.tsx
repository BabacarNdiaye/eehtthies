import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import LinesEditor, { EditorLine, EditorProduct } from '@/Components/Admin/Economat/LinesEditor';
import { Head, Link, useForm } from '@inertiajs/react';

interface Props {
    suppliers: { id: number; name: string }[];
    products: (EditorProduct & { supplier_id: number | null })[];
    supplierId: number | null;
}

export default function Form({ suppliers, products, supplierId }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        supplier_id: (supplierId ?? '') as number | '',
        expected_at: '',
        notes: '',
        lines: [{ product_id: '', quantity: '', unit_cost: '' }] as EditorLine[],
    });
    const errs = errors as Record<string, string>;
    // Les articles du fournisseur choisi passent en premier ; les autres restent disponibles.
    const sorted = [...products].sort((a, b) => Number(b.supplier_id === data.supplier_id) - Number(a.supplier_id === data.supplier_id) || a.name.localeCompare(b.name));

    return (
        <AdminLayout>
            <Head title="Nouveau bon de commande" />
            <PageHeader title="Nouveau bon de commande" subtitle="Choisissez le fournisseur et les articles à commander. Le bon reste en brouillon tant qu'il n'est pas envoyé." />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    post(route('admin.purchase-orders.store'));
                }}
                className="space-y-6"
            >
                <Card className="grid gap-4 p-5 sm:grid-cols-3">
                    <Field label="Fournisseur" required error={errors.supplier_id}>
                        <Select value={data.supplier_id} onChange={(e) => setData('supplier_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Choisir…</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Livraison souhaitée" error={errors.expected_at}>
                        <TextInput type="date" value={data.expected_at} onChange={(e) => setData('expected_at', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-3">
                        <Field label="Note pour le fournisseur" error={errors.notes}>
                            <Textarea rows={2} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Articles commandés</h2>
                    <LinesEditor products={sorted} lines={data.lines} onChange={(lines) => setData('lines', lines)} withCost errors={errs} />
                </Card>

                <div className="flex items-center justify-end gap-3">
                    <Link href={route('admin.purchase-orders.index')} className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                        Annuler
                    </Link>
                    <button type="submit" disabled={processing} className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-800 disabled:opacity-50">
                        Créer le bon
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
