import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, Select, TextInput } from '@/Components/Admin/Field';
import { Exam } from '@/types';
import { Head, useForm } from '@inertiajs/react';

type TeacherOption = { id: number; first_name: string; last_name: string };

interface Props {
    exam?: Exam & { invigilators?: TeacherOption[] };
    schoolClasses: { id: number; name: string }[];
    subjects: { id: number; name: string }[];
    rooms: { id: number; name: string }[];
    teachers: TeacherOption[];
    academicYears: { id: number; label: string }[];
    types: Record<string, string>;
    terms: string[];
}

export default function Form({ exam, schoolClasses, subjects, rooms, teachers, academicYears, types, terms }: Props) {
    const isEdit = !!exam;

    const { data, setData, post, put, processing, errors } = useForm({
        title: exam?.title ?? '',
        type: exam?.type ?? 'devoir',
        session: exam?.session ?? 'normale',
        school_class_id: exam?.school_class_id ?? ('' as number | ''),
        subject_id: exam?.subject_id ?? ('' as number | ''),
        room_id: exam?.room_id ?? ('' as number | ''),
        academic_year_id: exam?.academic_year_id ?? ('' as number | ''),
        term: exam?.term ?? terms[0] ?? '',
        exam_date: exam?.exam_date?.slice(0, 10) ?? '',
        start_time: exam?.start_time?.slice(0, 5) ?? '',
        end_time: exam?.end_time?.slice(0, 5) ?? '',
        max_score: exam?.max_score ?? 20,
        coefficient: exam?.coefficient ?? 1,
        is_published: exam?.is_published ?? false,
        invigilator_ids: exam?.invigilators?.map((t) => t.id) ?? ([] as number[]),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.exams.update', exam!.id));
        } else {
            post(route('admin.exams.store'));
        }
    };

    const toggleInvigilator = (id: number) => {
        setData(
            'invigilator_ids',
            data.invigilator_ids.includes(id)
                ? data.invigilator_ids.filter((i) => i !== id)
                : [...data.invigilator_ids, id],
        );
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? "Modifier l'épreuve" : 'Nouvelle épreuve'} />
            <PageHeader
                title={isEdit ? "Modifier l'épreuve" : 'Nouvelle épreuve'}
                subtitle="Planifiez un devoir, contrôle ou examen pour une classe."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Titre" required error={errors.title}>
                        <TextInput
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="Devoir n°1 - Cuisine professionnelle"
                        />
                    </Field>
                    <Field label="Type" required error={errors.type}>
                        <Select value={data.type} onChange={(e) => setData('type', e.target.value as typeof data.type)}>
                            {Object.entries(types).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Classe" required error={errors.school_class_id}>
                        <Select
                            value={data.school_class_id}
                            onChange={(e) => setData('school_class_id', e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Sélectionner...</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Matière" required error={errors.subject_id}>
                        <Select
                            value={data.subject_id}
                            onChange={(e) => setData('subject_id', e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Sélectionner...</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Salle" error={errors.room_id}>
                        <Select
                            value={data.room_id}
                            onChange={(e) => setData('room_id', e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Aucune</option>
                            {rooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Session" required error={errors.session}>
                        <Select
                            value={data.session}
                            onChange={(e) => setData('session', e.target.value as typeof data.session)}
                        >
                            <option value="normale">Normale</option>
                            <option value="rattrapage">Rattrapage</option>
                        </Select>
                    </Field>
                    <Field label="Année académique" error={errors.academic_year_id}>
                        <Select
                            value={data.academic_year_id}
                            onChange={(e) => setData('academic_year_id', e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Sélectionner...</option>
                            {academicYears.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {y.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Période" error={errors.term}>
                        <Select value={data.term} onChange={(e) => setData('term', e.target.value)}>
                            {terms.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Date de l'épreuve" required error={errors.exam_date}>
                        <TextInput
                            type="date"
                            value={data.exam_date}
                            onChange={(e) => setData('exam_date', e.target.value)}
                        />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Heure de début" error={errors.start_time}>
                            <TextInput
                                type="time"
                                value={data.start_time}
                                onChange={(e) => setData('start_time', e.target.value)}
                            />
                        </Field>
                        <Field label="Heure de fin" error={errors.end_time}>
                            <TextInput
                                type="time"
                                value={data.end_time}
                                onChange={(e) => setData('end_time', e.target.value)}
                            />
                        </Field>
                    </div>
                    <Field label="Barème (note maximale)" required error={errors.max_score}>
                        <TextInput
                            type="number"
                            step="0.5"
                            value={data.max_score}
                            onChange={(e) => setData('max_score', Number(e.target.value))}
                        />
                    </Field>
                    <Field label="Coefficient" required error={errors.coefficient}>
                        <TextInput
                            type="number"
                            step="0.5"
                            value={data.coefficient}
                            onChange={(e) => setData('coefficient', Number(e.target.value))}
                        />
                    </Field>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-3 font-serif text-base font-bold text-ink-900">Surveillants</h2>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {teachers.map((t) => (
                            <label key={t.id} className="flex items-center gap-2 text-sm text-ink-700">
                                <Checkbox
                                    checked={data.invigilator_ids.includes(t.id)}
                                    onChange={() => toggleInvigilator(t.id)}
                                />
                                {t.first_name} {t.last_name}
                            </label>
                        ))}
                        {teachers.length === 0 && <p className="text-sm text-ink-400">Aucun enseignant disponible.</p>}
                    </div>
                </Card>

                <Card className="flex items-center gap-3 p-6">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox checked={data.is_published} onChange={(e) => setData('is_published', e.target.checked)} />
                        Publier les résultats (visibles dans les bulletins)
                    </label>
                </Card>

                <div className="flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : "Créer l'épreuve"}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
