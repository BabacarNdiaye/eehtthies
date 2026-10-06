import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Checkbox, Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import PageHeader from '@/Components/Admin/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface MemberRow {
    user_id: number | null;
    teacher_id: number | null;
    external_name: string | null;
    external_role: string | null;
    function: string;
    can_vote: boolean;
    name: string;
}

interface Props {
    council: {
        id: number;
        status: string;
        academic_year_id: number;
        school_class_id: number;
        term: string;
        is_end_of_year: boolean;
        scheduled_at: string | null;
        room: string | null;
        agenda: string | null;
        preconseil_deadline: string | null;
        president_id: number | null;
        main_teacher_id: number | null;
        secretary_id: number | null;
        members: MemberRow[];
    } | null;
    defaults: { academic_year_id: number | null; school_class_id: number | null; term: string };
    years: { id: number; label: string }[];
    terms: string[];
    classes: { id: number; name: string; formation: string | null; academic_year_id: number }[];
    staff: { id: number; name: string }[];
    teachers: { id: number; user_id: number; name: string }[];
    functions: Record<string, string>;
}

const STEPS = ['Cadre', 'Membres', 'Récapitulatif'];

interface Proposal {
    members: { user_id: number | null; teacher_id: number | null; name: string; function: string; can_vote: boolean }[];
    students_count: number;
    class_teacher_user_ids: number[];
}

export default function Form({ council, defaults, years, terms, classes, staff, teachers, functions }: Props) {
    const isEdit = council !== null;
    const [step, setStep] = useState(0);
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [external, setExternal] = useState({ name: '', role: '', function: 'delegate_parent' });

    const { data, setData, post, put, processing, errors, transform } = useForm({
        academic_year_id: (council?.academic_year_id ?? defaults.academic_year_id ?? '') as number | '',
        school_class_id: (council?.school_class_id ?? defaults.school_class_id ?? '') as number | '',
        term: council?.term ?? defaults.term,
        is_end_of_year: council?.is_end_of_year ?? false,
        scheduled_at: council?.scheduled_at ?? '',
        room: council?.room ?? '',
        agenda: council?.agenda ?? '',
        preconseil_deadline: council?.preconseil_deadline ?? '',
        president_id: (council?.president_id ?? '') as number | '',
        main_teacher_id: (council?.main_teacher_id ?? '') as number | '',
        secretary_id: (council?.secretary_id ?? '') as number | '',
        members: (council?.members ?? []) as MemberRow[],
        action: 'draft' as 'draft' | 'schedule',
    });

    transform((values) => ({
        ...values,
        scheduled_at: values.scheduled_at || null,
        preconseil_deadline: values.preconseil_deadline || null,
        president_id: values.president_id || null,
        main_teacher_id: values.main_teacher_id || null,
        secretary_id: values.secretary_id || null,
    }));

    const yearClasses = classes.filter((item) => item.academic_year_id === data.academic_year_id);
    const selectedClass = classes.find((item) => item.id === data.school_class_id);

    // Étape « Membres » : à chaque changement de classe, les enseignants de la classe et la vie scolaire sont proposés (CRE-03).
    useEffect(() => {
        if (!data.school_class_id) {
            setProposal(null);
            return;
        }
        const controller = new AbortController();
        window.axios
            .get<Proposal>(route('admin.councils.proposal'), { params: { school_class_id: data.school_class_id }, signal: controller.signal })
            .then(({ data: received }) => {
                setProposal(received);
                if (!isEdit || data.members.length === 0) {
                    setData('members', received.members.map((member) => ({ ...member, external_name: null, external_role: null })));
                }
            })
            .catch(() => undefined);

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.school_class_id]);

    const classTeacherIds = useMemo(() => new Set(proposal?.class_teacher_user_ids ?? []), [proposal]);
    const sortedTeachers = [...teachers].sort((a, b) => Number(classTeacherIds.has(b.user_id)) - Number(classTeacherIds.has(a.user_id)));

    const updateMember = (index: number, patch: Partial<MemberRow>) => setData('members', data.members.map((member, i) => (i === index ? { ...member, ...patch } : member)));
    const removeMember = (index: number) => setData('members', data.members.filter((_, i) => i !== index));
    const addExternal = () => {
        if (external.name.trim() === '') return;
        setData('members', [...data.members, { user_id: null, teacher_id: null, external_name: external.name.trim(), external_role: external.role.trim() || null, function: external.function, can_vote: false, name: external.name.trim() }]);
        setExternal({ name: '', role: '', function: external.function });
    };

    const submit = (action: 'draft' | 'schedule') => {
        data.action = action;
        setData('action', action);
        if (council) {
            put(route('admin.councils.update', council.id));
        } else {
            post(route('admin.councils.store'));
        }
    };

    const stepErrors = [
        ['academic_year_id', 'school_class_id', 'term', 'scheduled_at', 'room', 'agenda', 'preconseil_deadline'],
        ['president_id', 'main_teacher_id', 'secretary_id'],
        [],
    ].map((keys) => keys.some((key) => key in errors) || (keys.length === 0 ? false : Object.keys(errors).some((key) => keys.includes(key.split('.')[0]))));

    const nameOf = (list: { id?: number; user_id?: number; name: string }[], id: number | '', key: 'id' | 'user_id' = 'id') =>
        list.find((item) => item[key] === id)?.name ?? 'Non désigné';

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Modifier le conseil' : 'Nouveau conseil'} />
            <PageHeader title={isEdit ? 'Modifier le conseil de classe' : 'Nouveau conseil de classe'} subtitle="Cadre, membres, puis vérification avant d'enregistrer ou de programmer." />

            <ol className="mb-6 flex flex-wrap gap-2" aria-label="Étapes">
                {STEPS.map((label, index) => (
                    <li key={label}>
                        <button
                            type="button"
                            onClick={() => setStep(index)}
                            aria-current={step === index ? 'step' : undefined}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                step === index ? 'bg-ink-900 text-white' : stepErrors[index] ? 'bg-red-50 text-red-800 ring-1 ring-red-200' : 'bg-white text-ink-700 ring-1 ring-ink-200'
                            }`}
                        >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs" aria-hidden="true">
                                {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
                            </span>
                            {label}
                            {stepErrors[index] && <span className="sr-only"> (à corriger)</span>}
                        </button>
                    </li>
                ))}
            </ol>

            {step === 0 && (
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Année scolaire" required error={errors.academic_year_id}>
                        <Select value={data.academic_year_id} onChange={(e) => setData((current) => ({ ...current, academic_year_id: e.target.value ? Number(e.target.value) : '', school_class_id: '' }))}>
                            <option value="">Choisir</option>
                            {years.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Période" required error={errors.term}>
                        <Select value={data.term} onChange={(e) => setData('term', e.target.value)}>
                            {terms.map((term) => (
                                <option key={term} value={term}>
                                    {term}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Classe" required error={errors.school_class_id}>
                        <Select value={data.school_class_id} onChange={(e) => setData('school_class_id', e.target.value ? Number(e.target.value) : '')}>
                            <option value="">Choisir une classe</option>
                            {yearClasses.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                    {item.formation ? ` — ${item.formation}` : ''}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <label className="flex items-start gap-3 self-end pb-2 text-sm text-ink-800">
                        <Checkbox className="mt-0.5" checked={data.is_end_of_year} onChange={(e) => setData('is_end_of_year', e.target.checked)} />
                        <span>
                            Conseil de fin d’année
                            <span className="block text-xs text-ink-500">Active les décisions d’orientation, alors obligatoires pour chaque élève.</span>
                        </span>
                    </label>
                    <Field label="Date et heure" error={errors.scheduled_at} hint="Obligatoire pour programmer le conseil.">
                        <TextInput type="datetime-local" value={data.scheduled_at} onChange={(e) => setData('scheduled_at', e.target.value)} />
                    </Field>
                    <Field label="Salle" error={errors.room}>
                        <TextInput value={data.room} onChange={(e) => setData('room', e.target.value)} />
                    </Field>
                    <Field label="Date limite du pré-conseil" error={errors.preconseil_deadline} hint="Après elle, les saisies des enseignants passent en lecture seule.">
                        <TextInput type="datetime-local" value={data.preconseil_deadline} onChange={(e) => setData('preconseil_deadline', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Ordre du jour" error={errors.agenda}>
                            <Textarea rows={4} value={data.agenda} onChange={(e) => setData('agenda', e.target.value)} />
                        </Field>
                    </div>
                </Card>
            )}

            {step === 1 && (
                <div className="space-y-6">
                    <Card className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
                        <Field label="Président(e) du conseil" error={errors.president_id} hint="Obligatoire pour programmer.">
                            <Select value={data.president_id} onChange={(e) => setData('president_id', e.target.value ? Number(e.target.value) : '')}>
                                <option value="">Non désigné</option>
                                <optgroup label="Personnel">
                                    {staff.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Enseignants">
                                    {sortedTeachers.map((teacher) => (
                                        <option key={teacher.id} value={teacher.user_id}>
                                            {teacher.name}
                                        </option>
                                    ))}
                                </optgroup>
                            </Select>
                        </Field>
                        <Field label="Professeur principal" error={errors.main_teacher_id} hint="Obligatoire pour programmer.">
                            <Select value={data.main_teacher_id} onChange={(e) => setData('main_teacher_id', e.target.value ? Number(e.target.value) : '')}>
                                <option value="">Non désigné</option>
                                {sortedTeachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.user_id}>
                                        {teacher.name}
                                        {classTeacherIds.has(teacher.user_id) ? ' (enseigne dans la classe)' : ''}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Secrétaire de séance" error={errors.secretary_id}>
                            <Select value={data.secretary_id} onChange={(e) => setData('secretary_id', e.target.value ? Number(e.target.value) : '')}>
                                <option value="">Non désigné</option>
                                {staff.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-3">
                            <h2 className="font-serif text-base font-bold text-ink-900">Autres membres ({data.members.length})</h2>
                            <p className="text-xs text-ink-500">Président, professeur principal et secrétaire s’y ajoutent d’office.</p>
                        </div>
                        <ul className="divide-y divide-ink-100">
                            {data.members.map((member, index) => (
                                <li key={`${member.user_id ?? 'x'}-${member.teacher_id ?? 'x'}-${index}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                    <div className="min-w-0 flex-1 basis-48">
                                        <p className="font-medium text-ink-900">{member.name || member.external_name}</p>
                                        {member.external_role && <p className="text-xs text-ink-500">{member.external_role}</p>}
                                        {(errors as Record<string, string>)[`members.${index}.external_name`] && (
                                            <p className="text-xs text-red-600">{(errors as Record<string, string>)[`members.${index}.external_name`]}</p>
                                        )}
                                    </div>
                                    <Select aria-label={`Fonction de ${member.name || member.external_name}`} className="sm:w-56" value={member.function} onChange={(e) => updateMember(index, { function: e.target.value })}>
                                        {Object.entries(functions).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </Select>
                                    <label className="flex items-center gap-2 text-sm text-ink-700">
                                        <Checkbox checked={member.can_vote} onChange={(e) => updateMember(index, { can_vote: e.target.checked })} />
                                        Vote
                                    </label>
                                    <IconButton label={`Retirer ${member.name || member.external_name}`} tone="danger" onClick={() => removeMember(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </IconButton>
                                </li>
                            ))}
                            {data.members.length === 0 && <li className="px-5 py-6 text-sm text-ink-500">Choisissez d’abord une classe : ses enseignants seront proposés.</li>}
                        </ul>
                        <div className="grid gap-3 border-t border-ink-100 p-5 sm:grid-cols-4 sm:items-end">
                            <Field label="Membre extérieur">
                                <TextInput value={external.name} onChange={(e) => setExternal({ ...external, name: e.target.value })} placeholder="Nom et prénom" />
                            </Field>
                            <Field label="Qualité">
                                <TextInput value={external.role} onChange={(e) => setExternal({ ...external, role: e.target.value })} placeholder="Déléguée des parents" />
                            </Field>
                            <Field label="Fonction">
                                <Select value={external.function} onChange={(e) => setExternal({ ...external, function: e.target.value })}>
                                    {Object.entries(functions).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <button type="button" onClick={addExternal} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                                <UserPlus className="h-4 w-4" aria-hidden="true" />
                                Ajouter
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            {step === 2 && (
                <Card className="space-y-4 p-6">
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-ink-500">Classe</dt>
                            <dd className="font-medium text-ink-900">{selectedClass ? `${selectedClass.name} · ${data.term}` : 'Non choisie'}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-500">Date</dt>
                            <dd className="font-medium text-ink-900">{data.scheduled_at ? new Date(data.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) : 'À fixer'}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-500">Président(e)</dt>
                            <dd className="font-medium text-ink-900">{data.president_id ? nameOf([...staff, ...teachers.map((t) => ({ id: t.user_id, name: t.name }))], data.president_id) : 'Non désigné'}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-500">Professeur principal</dt>
                            <dd className="font-medium text-ink-900">{nameOf(teachers, data.main_teacher_id, 'user_id')}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-500">Élèves concernés</dt>
                            <dd className="font-medium text-ink-900">{proposal ? `${proposal.students_count} élève(s) actif(s)` : '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-500">Membres</dt>
                            <dd className="font-medium text-ink-900">{new Set([...data.members.map((member, index) => member.user_id ?? `x${index}`), data.president_id, data.main_teacher_id, data.secretary_id].filter(Boolean)).size}</dd>
                        </div>
                    </dl>
                    <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
                        Programmer prend la photo des données (moyennes, rangs, absences, sanctions) et fixe les pastilles d’alerte. Elle se rafraîchit jusqu’à l’ouverture de la séance, puis elle est figée.
                    </p>
                    {Object.keys(errors).length > 0 && <p className="text-sm text-red-700">Des informations sont à corriger : voyez les étapes signalées en rouge.</p>}
                </Card>
            )}

            <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
                <Link href={council ? route('admin.councils.show', council.id) : route('admin.councils.index')} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
                    Annuler
                </Link>
                <div className="flex flex-wrap gap-3">
                    {step > 0 && (
                        <button type="button" onClick={() => setStep(step - 1)} className="rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                            Précédent
                        </button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <button type="button" onClick={() => setStep(step + 1)} className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
                            Suivant
                        </button>
                    ) : (
                        <>
                            <button type="button" disabled={processing} onClick={() => submit('draft')} className="rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50">
                                {council && council.status !== 'draft' ? 'Enregistrer' : 'Enregistrer en brouillon'}
                            </button>
                            {(!council || council.status === 'draft') && (
                                <button type="button" disabled={processing} onClick={() => submit('schedule')} className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                                    Programmer
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
