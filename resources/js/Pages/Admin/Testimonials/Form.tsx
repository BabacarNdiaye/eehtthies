import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea, Select, Checkbox } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Testimonial } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Star } from 'lucide-react';

export default function Form({
    testimonial,
    formations,
}: {
    testimonial?: Testimonial;
    formations: { id: number; name: string }[];
}) {
    const isEdit = !!testimonial;

    const { data, setData, post, put, processing, errors } = useForm({
        name: testimonial?.name ?? '',
        role: testimonial?.role ?? '',
        formation_id: testimonial?.formation_id ?? ('' as number | ''),
        content: testimonial?.content ?? '',
        rating: testimonial?.rating ?? 5,
        is_published: testimonial?.is_published ?? false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.testimonials.update', testimonial!.id));
        } else {
            post(route('admin.testimonials.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier le témoignage' : 'Nouveau témoignage'} />
            <PageHeader
                title={isEdit ? 'Modifier le témoignage' : 'Nouveau témoignage'}
                subtitle="Renseignez les informations du témoignage."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Nom" required error={errors.name}>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    </Field>
                    <Field label="Rôle / fonction" error={errors.role} hint="ex: Ancien élève, Chef de cuisine...">
                        <TextInput value={data.role} onChange={(e) => setData('role', e.target.value)} />
                    </Field>
                    <Field label="Formation associée" error={errors.formation_id}>
                        <Select
                            value={data.formation_id}
                            onChange={(e) =>
                                setData('formation_id', e.target.value ? Number(e.target.value) : '')
                            }
                        >
                            <option value="">Aucune formation</option>
                            {formations.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Note" required error={errors.rating}>
                        <div className="flex items-center gap-1 pt-1.5">
                            {Array.from({ length: 5 }).map((_, i) => {
                                const value = i + 1;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setData('rating', value)}
                                        aria-label={`${value} sur 5`}
                                        aria-pressed={value === data.rating}
                                        className="p-0.5"
                                    >
                                        <Star
                                            className={`h-6 w-6 transition-colors duration-150 ${
                                                value <= data.rating
                                                    ? 'fill-gold-500 text-gold-500'
                                                    : 'text-ink-200 hover:text-gold-300'
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                            <span className="ml-2 text-sm text-ink-500">{data.rating} / 5</span>
                        </div>
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Témoignage" required error={errors.content}>
                        <Textarea rows={5} value={data.content} onChange={(e) => setData('content', e.target.value)} />
                    </Field>
                </Card>

                <Card className="flex flex-wrap items-center gap-6 p-6">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_published} onChange={(e) => setData('is_published', e.target.checked)} />
                        Publié (visible sur le site public)
                    </label>
                </Card>

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Créer le témoignage'}
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}
