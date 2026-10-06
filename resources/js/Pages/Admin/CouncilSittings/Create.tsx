import Card from '@/Components/Admin/Card';
import { Checkbox, Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import PageHeader from '@/Components/Admin/PageHeader';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';

interface ClassOption {
    id: number;
    name: string;
    formation: string | null;
    teachers: { user_id: number; name: string }[];
    terms_taken: string[];
}

interface Props {
    defaults: { academic_year_id: number | null; term: string };
    years: { id: number; label: string }[];
    terms: string[];
    classes: ClassOption[];
    staff: { id: number; name: string }[];
    functions: Record<string, string>;
}

/**
 * Séance commune (plusieurs classes, un conseil et un procès-verbal par classe) : cadre commun, classes cochées avec
 * leur professeur principal, membres communs. Les enseignants de chaque classe sont ajoutés à son seul conseil.
 */
export default function Create({ defaults, years, terms, classes, staff, functions }: Props) {
    const form = useForm({
        academic_year_id: defaults.academic_year_id ?? '',
        term: defaults.term,
        is_end_of_year: false,
        scheduled_at: '',
        room: '',
        agenda: '',
        president_id: '' as number | '',
        secretary_id: '' as number | '',
        classes: [] as { school_class_id: number; main_teacher_id: number | null }[],
        members: [] as { user_id: number | ''; function: string }[],
    });
    const { data, setData, errors } = form;
    const available = classes.filter((option) => !option.terms_taken.includes(data.term));
    const errorOf = (key: string) => (errors as Record<string, string>)[key];
    const pick = (option: ClassOption) => ({ school_class_id: option.id, main_teacher_id: option.teachers.length === 1 ? option.teachers[0].user_id : null });

    const toggle = (option: ClassOption, on: boolean) => setData('classes', on ? [...data.classes, pick(option)] : data.classes.filter((row) => row.school_class_id !== option.id));
    const setMainTeacher = (id: number, userId: number | null) => setData('classes', data.classes.map((row) => (row.school_class_id === id ? { ...row, main_teacher_id: userId } : row)));
    const staffOptions = staff.map((user) => (
        <option key={user.id} value={user.id}>
            {user.name}
        </option>
    ));

    return (
        <AdminLayout>
            <Head title="Nouvelle séance commune" />
            <PageHeader title="Nouvelle séance commune" subtitle="Les conseils de plusieurs classes tenus ensemble : même date, même salle, même président, même visio. Chaque classe garde son procès-verbal." />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post(route('admin.council-sittings.store'));
                }}
                className="space-y-6"
            >
                <Card className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Année scolaire" required error={errors.academic_year_id}>
                        <Select value={data.academic_year_id} onChange={(e) => router.get(route('admin.council-sittings.create'), { academic_year_id: e.target.value })}>
                            {years.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Période" required error={errors.term}>
                        <Select value={data.term} onChange={(e) => setData({ ...data, term: e.target.value, classes: [] })}>
                            {terms.map((term) => (
                                <option key={term} value={term}>
                                    {term}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Date et heure" required error={errors.scheduled_at}>
                        <TextInput type="datetime-local" value={data.scheduled_at} onChange={(e) => setData('scheduled_at', e.target.value)} />
                    </Field>
                    <Field label="Salle" error={errors.room}>
                        <TextInput value={data.room} onChange={(e) => setData('room', e.target.value)} />
                    </Field>
                    <Field label="Président(e)" required error={errors.president_id}>
                        <Select value={data.president_id} onChange={(e) => setData('president_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Choisir…</option>
                            {staffOptions}
                        </Select>
                    </Field>
                    <Field label="Secrétaire de séance" error={errors.secretary_id}>
                        <Select value={data.secretary_id} onChange={(e) => setData('secretary_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Aucun pour l’instant</option>
                            {staffOptions}
                        </Select>
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-ink-800 sm:col-span-2 lg:col-span-3">
                        <Checkbox checked={data.is_end_of_year} onChange={(e) => setData('is_end_of_year', e.target.checked)} /> Conseils de fin d’année (décisions d’orientation)
                    </label>
                    <div className="sm:col-span-2 lg:col-span-3">
                        <Field label="Ordre du jour" error={errors.agenda}>
                            <Textarea rows={2} value={data.agenda} onChange={(e) => setData('agenda', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-serif text-base font-bold text-ink-900">
                            Classes ({data.classes.length} / {available.length})
                        </h2>
                        <div className="flex gap-3 text-sm">
                            <button type="button" onClick={() => setData('classes', available.map(pick))} className="font-semibold text-ink-800 underline">
                                Tout cocher
                            </button>
                            <button type="button" onClick={() => setData('classes', [])} className="font-semibold text-ink-800 underline">
                                Tout décocher
                            </button>
                        </div>
                    </div>
                    {errors.classes && <p className="mb-2 text-sm text-red-700">{errors.classes}</p>}
                    {available.length === 0 ? (
                        <p className="text-sm text-ink-500">Toutes les classes de l’année ont déjà leur conseil pour cette période.</p>
                    ) : (
                        <ul className="divide-y divide-ink-100">
                            {available.map((option) => {
                                const position = data.classes.findIndex((item) => item.school_class_id === option.id);
                                const row = position >= 0 ? data.classes[position] : null;

                                return (
                                    <li key={option.id} className="flex flex-wrap items-center gap-3 py-2.5">
                                        <label className="flex min-w-0 flex-1 basis-56 items-center gap-2 text-sm">
                                            <Checkbox checked={!!row} onChange={(e) => toggle(option, e.target.checked)} />
                                            <span className="font-medium text-ink-900">{option.name}</span>
                                            <span className="text-ink-500">{option.formation}</span>
                                        </label>
                                        {row && (
                                            <div className="w-full sm:w-72">
                                                <Select aria-label={`Professeur principal de ${option.name}`} value={row.main_teacher_id ?? ''} onChange={(e) => setMainTeacher(option.id, e.target.value ? Number(e.target.value) : null)}>
                                                    <option value="">Professeur principal à choisir</option>
                                                    {option.teachers.map((teacher) => (
                                                        <option key={teacher.user_id} value={teacher.user_id}>
                                                            {teacher.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                                {errorOf(`classes.${position}.main_teacher_id`) && <p className="text-xs text-red-700">{errorOf(`classes.${position}.main_teacher_id`)}</p>}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <p className="mt-2 text-xs text-ink-500">Les enseignants de chaque classe sont ajoutés à son conseil ; le professeur principal peut aussi être choisi plus tard, conseil par conseil.</p>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Membres communs</h2>
                    <p className="mb-3 text-sm text-ink-600">Ils siègent pour toutes les classes (Direction, vie scolaire, délégués…). Le président et le secrétaire y sont déjà.</p>
                    <ul className="space-y-2">
                        {data.members.map((member, index) => (
                            <li key={index} className="flex flex-wrap items-center gap-2">
                                <Select aria-label={`Membre commun ${index + 1}`} className="w-full sm:w-72" value={member.user_id} onChange={(e) => setData('members', data.members.map((item, i) => (i === index ? { ...item, user_id: e.target.value ? Number(e.target.value) : '' } : item)))}>
                                    <option value="">Choisir…</option>
                                    {staffOptions}
                                </Select>
                                <Select aria-label={`Fonction du membre commun ${index + 1}`} className="w-full sm:w-56" value={member.function} onChange={(e) => setData('members', data.members.map((item, i) => (i === index ? { ...item, function: e.target.value } : item)))}>
                                    {Object.entries(functions).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </Select>
                                <button type="button" onClick={() => setData('members', data.members.filter((_, i) => i !== index))} className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Retirer le membre commun ${index + 1}`}>
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button type="button" onClick={() => setData('members', [...data.members, { user_id: '', function: 'school_life' }])} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                        <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter un membre commun
                    </button>
                </Card>

                <div className="flex justify-end gap-3">
                    <Link href={route('admin.councils.index')} className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                        Annuler
                    </Link>
                    <button type="submit" disabled={form.processing || data.classes.length === 0} className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                        Créer les {data.classes.length} conseils
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
