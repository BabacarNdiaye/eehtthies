import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, TextInput, Textarea, Checkbox } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Faq } from '@/types';
import { Head, useForm } from '@inertiajs/react';

export default function Form({ faq }: { faq?: Faq }) {
    const isEdit = !!faq;

    const { data, setData, post, put, processing, errors } = useForm({
        question: faq?.question ?? '',
        answer: faq?.answer ?? '',
        category: faq?.category ?? '',
        order: faq?.order ?? 0,
        is_published: faq?.is_published ?? false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.faqs.update', faq!.id));
        } else {
            post(route('admin.faqs.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier la question' : 'Nouvelle question'} />
            <PageHeader
                title={isEdit ? 'Modifier la question' : 'Nouvelle question'}
                subtitle="Renseignez la question et sa réponse."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Catégorie" error={errors.category} hint="ex: Admissions, Scolarité, Vie étudiante...">
                        <TextInput value={data.category} onChange={(e) => setData('category', e.target.value)} />
                    </Field>
                    <Field label="Ordre d'affichage" error={errors.order}>
                        <TextInput
                            type="number"
                            value={data.order}
                            onChange={(e) => setData('order', Number(e.target.value))}
                        />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6">
                    <Field label="Question" required error={errors.question}>
                        <Textarea rows={2} value={data.question} onChange={(e) => setData('question', e.target.value)} />
                    </Field>
                    <Field label="Réponse" required error={errors.answer}>
                        <Textarea rows={6} value={data.answer} onChange={(e) => setData('answer', e.target.value)} />
                    </Field>
                </Card>

                <Card className="flex flex-wrap items-center gap-6 p-6">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_published} onChange={(e) => setData('is_published', e.target.checked)} />
                        Publiée (visible sur le site public)
                    </label>
                </Card>

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Créer la question'}
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}
