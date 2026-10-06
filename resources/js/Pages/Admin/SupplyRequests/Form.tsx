import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import LinesEditor, { EditorLine, EditorProduct } from '@/Components/Admin/Economat/LinesEditor';
import { Head, Link, useForm } from '@inertiajs/react';

interface Props {
    products: EditorProduct[];
    classes: { id: number; name: string }[];
}

export default function Form({ products, classes }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        purpose: '',
        school_class_id: '' as number | '',
        needed_at: '',
        notes: '',
        lines: [{ product_id: '', quantity: '' }] as EditorLine[],
    });

    return (
        <AdminLayout>
            <Head title="Nouvelle demande de matériel" />
            <PageHeader title="Nouvelle demande de matériel" subtitle="Indiquez l'usage (atelier de cuisine, service en salle, événement…) et le matériel ou les denrées nécessaires." />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    post(route('admin.supply-requests.store'));
                }}
                className="space-y-6"
            >
                <Card className="grid gap-4 p-5 sm:grid-cols-3">
                    <div className="sm:col-span-3">
                        <Field label="Motif" required error={errors.purpose}>
                            <TextInput value={data.purpose} onChange={(e) => setData('purpose', e.target.value)} placeholder="Ex. Atelier pâtisserie du jeudi" />
                        </Field>
                    </div>
                    <Field label="Classe" error={errors.school_class_id}>
                        <Select value={data.school_class_id} onChange={(e) => setData('school_class_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Aucune</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Nécessaire pour le" error={errors.needed_at}>
                        <TextInput type="date" value={data.needed_at} onChange={(e) => setData('needed_at', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-3">
                        <Field label="Précisions" error={errors.notes}>
                            <Textarea rows={2} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Articles demandés</h2>
                    <LinesEditor products={products} lines={data.lines} onChange={(lines) => setData('lines', lines)} errors={errors as Record<string, string>} />
                </Card>

                <div className="flex items-center justify-end gap-3">
                    <Link href={route('admin.supply-requests.index')} className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                        Annuler
                    </Link>
                    <button type="submit" disabled={processing} className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-800 disabled:opacity-50">
                        Envoyer la demande
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
