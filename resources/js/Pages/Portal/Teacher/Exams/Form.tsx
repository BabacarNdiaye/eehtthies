import PortalLayout from '@/Layouts/PortalLayout';
import Card from '@/Components/Admin/Card';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Exam } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { teacherNav } from '../Dashboard';

interface ClassSubjectPair {
    school_class_id: number;
    subject_id: number;
    class_name: string;
    subject_name: string;
}

interface Props {
    exam?: Exam;
    classSubjectPairs: ClassSubjectPair[];
    types: Record<string, string>;
    terms: string[];
}

export default function Form({ exam, classSubjectPairs, types, terms }: Props) {
    const isEdit = !!exam;

    const { data, setData, post, put, processing, errors } = useForm({
        title: exam?.title ?? '',
        type: exam?.type ?? 'devoir',
        school_class_id: exam?.school_class_id ?? ('' as number | ''),
        subject_id: exam?.subject_id ?? ('' as number | ''),
        term: exam?.term ?? terms[0] ?? '',
        exam_date: exam?.exam_date?.slice(0, 10) ?? '',
        start_time: exam?.start_time?.slice(0, 5) ?? '',
        end_time: exam?.end_time?.slice(0, 5) ?? '',
        max_score: exam?.max_score ?? 20,
        coefficient: exam?.coefficient ?? 1,
    });

    const classes = useMemo(() => {
        const seen = new Map<number, string>();
        classSubjectPairs.forEach((p) => seen.set(p.school_class_id, p.class_name));
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [classSubjectPairs]);

    const subjectsForClass = useMemo(
        () => classSubjectPairs.filter((p) => p.school_class_id === data.school_class_id),
        [classSubjectPairs, data.school_class_id],
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('teacher.exams.update', exam!.id));
        } else {
            post(route('teacher.exams.store'));
        }
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title={isEdit ? 'Modifier le devoir' : 'Programmer un devoir'} />
            <div className="mb-6">
                <h1 className="font-serif text-2xl font-bold text-ink-900">
                    {isEdit ? 'Modifier le devoir' : 'Programmer un devoir'}
                </h1>
                <p className="mt-1 text-sm text-ink-500">
                    Uniquement pour les classes et matières que vous enseignez.
                </p>
            </div>

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
                            onChange={(e) => {
                                setData('school_class_id', e.target.value ? Number(e.target.value) : '');
                                setData('subject_id', '');
                            }}
                        >
                            <option value="">Sélectionner...</option>
                            {classes.map((c) => (
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
                            disabled={!data.school_class_id}
                        >
                            <option value="">Sélectionner...</option>
                            {subjectsForClass.map((p) => (
                                <option key={p.subject_id} value={p.subject_id}>
                                    {p.subject_name}
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
                    <Field label="Date" required error={errors.exam_date}>
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

                <div className="flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit ? 'Enregistrer les modifications' : 'Programmer le devoir'}
                    </button>
                </div>
            </form>
        </PortalLayout>
    );
}
