import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import PageHeader from '@/Components/Admin/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface Props {
    record: { id: number; student_id: number; occurred_on: string; level: string; reason: string; days: number | null } | null;
    students: { id: number; name: string; matricule: string; school_class_id: number | null }[];
    classes: { id: number; name: string; label: string }[];
    levels: Record<string, string>;
    defaults: { student_id: number | null; occurred_on: string };
}

export default function Form({ record, students, classes, levels, defaults }: Props) {
    const isEdit = record !== null;

    const { data, setData, post, put, processing, errors } = useForm({
        student_id: (record?.student_id ?? defaults.student_id ?? '') as number | '',
        occurred_on: record?.occurred_on ?? defaults.occurred_on,
        level: record?.level ?? Object.keys(levels)[0],
        reason: record?.reason ?? '',
        days: (record?.days ?? '') as number | '',
    });

    // La classe ne sert qu'à restreindre la liste d'élèves : elle n'est pas envoyée.
    const [classId, setClassId] = useState<number | ''>(students.find((student) => student.id === data.student_id)?.school_class_id ?? '');

    const choices = useMemo(() => students.filter((student) => classId === '' || student.school_class_id === classId), [students, classId]);
    const student = students.find((item) => item.id === data.student_id);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (record) {
            put(route('admin.discipline.update', record.id));
        } else {
            post(route('admin.discipline.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier la sanction' : 'Nouvelle sanction'} />
            <PageHeader
                title={isEdit ? 'Modifier la sanction' : 'Nouvelle sanction'}
                subtitle="Le motif est interne : il n'apparaît jamais sur la vue projetée du conseil ni dans l'espace des familles."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    {isEdit ? (
                        <div className="sm:col-span-2">
                            <p className="mb-1.5 text-sm font-medium text-ink-700">Élève</p>
                            <p className="text-sm text-ink-900">
                                {student ? `${student.name} · ${student.matricule}` : 'Élève hors des effectifs actifs'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <Field label="Classe" hint="Facultatif : réduit la liste d'élèves.">
                                <Select
                                    value={classId}
                                    onChange={(e) => {
                                        const next = e.target.value ? Number(e.target.value) : '';
                                        setClassId(next);
                                        if (next !== '' && student && student.school_class_id !== next) setData('student_id', '');
                                    }}
                                >
                                    <option value="">Toutes les classes</option>
                                    {classes.map((schoolClass) => (
                                        <option key={schoolClass.id} value={schoolClass.id}>
                                            {schoolClass.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Élève" required error={errors.student_id}>
                                <Select value={data.student_id} onChange={(e) => setData('student_id', e.target.value ? Number(e.target.value) : '')}>
                                    <option value="">Choisir un élève</option>
                                    {choices.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} · {item.matricule}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </>
                    )}

                    <Field label="Date des faits" required error={errors.occurred_on}>
                        <TextInput type="date" max={defaults.occurred_on} value={data.occurred_on} onChange={(e) => setData('occurred_on', e.target.value)} />
                    </Field>
                    <Field label="Niveau de la sanction" required error={errors.level}>
                        <Select value={data.level} onChange={(e) => setData('level', e.target.value)}>
                            {Object.entries(levels).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    {data.level === 'exclusion' && (
                        <Field label="Jours d'exclusion" error={errors.days}>
                            <TextInput type="number" min={1} max={365} value={data.days} onChange={(e) => setData('days', e.target.value ? Number(e.target.value) : '')} />
                        </Field>
                    )}
                    <div className="sm:col-span-2">
                        <Field label="Motif" required error={errors.reason}>
                            <Textarea rows={4} value={data.reason} onChange={(e) => setData('reason', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <FormActions>
                    <Link href={route('admin.discipline.index')} className="rounded-lg border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                        Annuler
                    </Link>
                    <button type="submit" disabled={processing} className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                        {isEdit ? 'Enregistrer les modifications' : 'Enregistrer la sanction'}
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}
