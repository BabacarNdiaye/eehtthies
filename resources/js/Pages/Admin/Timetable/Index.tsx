import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import { Room, SchoolClass, Subject, TimetableEntry } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { Clock, MapPin, Pencil, Plus, Trash2, User, X } from 'lucide-react';
import { useState } from 'react';

type ClassOption = SchoolClass & { formation?: { id: number; name: string } };
type TeacherOption = { id: number; first_name: string; last_name: string };

interface Props {
    schoolClasses: ClassOption[];
    subjects: Subject[];
    teachers: TeacherOption[];
    rooms: Room[];
    entries: TimetableEntry[];
    selectedClassId: number | null;
    days: Record<string, string>;
}

const emptyForm = {
    school_class_id: '' as number | '',
    subject_id: '' as number | '',
    teacher_id: '' as number | '',
    room_id: '' as number | '',
    day_of_week: '' as number | '',
    start_time: '',
    end_time: '',
};

export default function Index({ schoolClasses, subjects, teachers, rooms, entries, selectedClassId, days }: Props) {
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const createForm = useForm(emptyForm);
    const editForm = useForm(emptyForm);

    const selectClass = (id: string) => {
        router.get(route('admin.timetable.index'), id ? { school_class_id: id } : {}, { preserveState: true });
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('admin.timetable.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                createForm.setData('school_class_id', selectedClassId ?? '');
                setShowAdd(false);
            },
        });
    };

    const startEdit = (entry: TimetableEntry) => {
        setEditingId(entry.id);
        editForm.clearErrors();
        editForm.setData({
            school_class_id: entry.school_class_id,
            subject_id: entry.subject_id,
            teacher_id: entry.teacher_id ?? '',
            room_id: entry.room_id ?? '',
            day_of_week: entry.day_of_week,
            start_time: entry.start_time.slice(0, 5),
            end_time: entry.end_time.slice(0, 5),
        });
    };

    const submitEdit = (e: React.FormEvent, id: number) => {
        e.preventDefault();
        editForm.put(route('admin.timetable.update', id), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const destroy = async (entry: TimetableEntry) => {
        if (await confirmAction('Supprimer ce créneau de l\'emploi du temps ?')) {
            router.delete(route('admin.timetable.destroy', entry.id), { preserveScroll: true });
        }
    };

    const byDay = Object.keys(days)
        .map(Number)
        .sort((a, b) => a - b)
        .map((day) => ({
            day,
            label: days[day],
            items: entries
                .filter((e) => e.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time)),
        }));

    const openAdd = () => {
        createForm.reset();
        createForm.setData('school_class_id', selectedClassId ?? '');
        setShowAdd(true);
    };

    return (
        <AdminLayout>
            <Head title="Emploi du temps" />
            <PageHeader
                title="Emploi du temps"
                subtitle="Construisez le planning hebdomadaire de chaque classe et détectez automatiquement les conflits."
            >
                {selectedClassId && (
                    <>
                        <a
                            href={`/admin/timetable/pdf?school_class_id=${selectedClassId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Télécharger PDF
                        </a>

                        <button
                            onClick={openAdd}
                            className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400"
                        >
                            <Plus className="h-4 w-4" /> Ajouter un créneau
                        </button>
                    </>
                )}
            </PageHeader>

            <Card className="mb-6 p-6">
                <Field label="Classe">
                    <Select value={selectedClassId ?? ''} onChange={(e) => selectClass(e.target.value)}>
                        <option value="">Sélectionner une classe...</option>
                        {schoolClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.formation ? `— ${c.formation.name}` : ''}
                            </option>
                        ))}
                    </Select>
                </Field>
            </Card>

            {!selectedClassId && (
                <Card className="p-10 text-center text-ink-500">
                    Sélectionnez une classe ci-dessus pour consulter ou construire son emploi du temps.
                </Card>
            )}

            {selectedClassId && showAdd && (
                <Card className="mb-6 p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-serif text-lg font-bold text-ink-900">Nouveau créneau</h2>
                        <IconButton onClick={() => setShowAdd(false)} label="Fermer le formulaire">
                            <X className="h-5 w-5" />
                        </IconButton>
                    </div>
                    <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <Field label="Jour" required error={createForm.errors.day_of_week}>
                            <Select
                                value={createForm.data.day_of_week}
                                onChange={(e) =>
                                    createForm.setData('day_of_week', e.target.value ? Number(e.target.value) : '')
                                }
                            >
                                <option value="">...</option>
                                {Object.entries(days).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Matière" required error={createForm.errors.subject_id}>
                            <Select
                                value={createForm.data.subject_id}
                                onChange={(e) =>
                                    createForm.setData('subject_id', e.target.value ? Number(e.target.value) : '')
                                }
                            >
                                <option value="">...</option>
                                {subjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Enseignant" error={createForm.errors.teacher_id}>
                            <Select
                                value={createForm.data.teacher_id}
                                onChange={(e) =>
                                    createForm.setData('teacher_id', e.target.value ? Number(e.target.value) : '')
                                }
                            >
                                <option value="">...</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.first_name} {t.last_name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Salle" error={createForm.errors.room_id}>
                            <Select
                                value={createForm.data.room_id}
                                onChange={(e) =>
                                    createForm.setData('room_id', e.target.value ? Number(e.target.value) : '')
                                }
                            >
                                <option value="">...</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Début" required error={createForm.errors.start_time}>
                            <TextInput
                                type="time"
                                value={createForm.data.start_time}
                                onChange={(e) => createForm.setData('start_time', e.target.value)}
                            />
                        </Field>
                        <Field label="Fin" required error={createForm.errors.end_time}>
                            <TextInput
                                type="time"
                                value={createForm.data.end_time}
                                onChange={(e) => createForm.setData('end_time', e.target.value)}
                            />
                        </Field>
                        <div className="sm:col-span-3 lg:col-span-6">
                            <button
                                type="submit"
                                disabled={createForm.processing}
                                className="rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50"
                            >
                                Ajouter le créneau
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            {selectedClassId && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {byDay.map(({ day, label, items }) => (
                        <Card key={day} className="p-5">
                            <h3 className="mb-3 font-serif text-base font-bold text-ink-900">{label}</h3>
                            {items.length === 0 && (
                                <p className="text-sm text-ink-500">Aucun cours programmé.</p>
                            )}
                            <ul className="space-y-2">
                                {items.map((entry) =>
                                    editingId === entry.id ? (
                                        <li key={entry.id} className="rounded-lg bg-gold-50/50 p-3">
                                            <form
                                                onSubmit={(e) => submitEdit(e, entry.id)}
                                                className="grid grid-cols-2 gap-2"
                                            >
                                                <Select
                                                    aria-label="Matière"
                                                    value={editForm.data.subject_id}
                                                    onChange={(e) =>
                                                        editForm.setData('subject_id', Number(e.target.value))
                                                    }
                                                >
                                                    {subjects.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    aria-label="Enseignant"
                                                    value={editForm.data.teacher_id}
                                                    onChange={(e) =>
                                                        editForm.setData(
                                                            'teacher_id',
                                                            e.target.value ? Number(e.target.value) : '',
                                                        )
                                                    }
                                                >
                                                    <option value="">Enseignant...</option>
                                                    {teachers.map((t) => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.first_name} {t.last_name}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    aria-label="Salle"
                                                    value={editForm.data.room_id}
                                                    onChange={(e) =>
                                                        editForm.setData(
                                                            'room_id',
                                                            e.target.value ? Number(e.target.value) : '',
                                                        )
                                                    }
                                                >
                                                    <option value="">Salle...</option>
                                                    {rooms.map((r) => (
                                                        <option key={r.id} value={r.id}>
                                                            {r.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <Select
                                                    aria-label="Jour"
                                                    value={editForm.data.day_of_week}
                                                    onChange={(e) =>
                                                        editForm.setData('day_of_week', Number(e.target.value))
                                                    }
                                                >
                                                    {Object.entries(days).map(([value, dayLabel]) => (
                                                        <option key={value} value={value}>
                                                            {dayLabel}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <TextInput
                                                    aria-label="Heure de début"
                                                    type="time"
                                                    value={editForm.data.start_time}
                                                    onChange={(e) => editForm.setData('start_time', e.target.value)}
                                                />
                                                <TextInput
                                                    aria-label="Heure de fin"
                                                    type="time"
                                                    value={editForm.data.end_time}
                                                    onChange={(e) => editForm.setData('end_time', e.target.value)}
                                                />
                                                {(editForm.errors.day_of_week ||
                                                    editForm.errors.teacher_id ||
                                                    editForm.errors.room_id) && (
                                                    <p className="col-span-2 text-xs text-red-600">
                                                        {editForm.errors.day_of_week ||
                                                            editForm.errors.teacher_id ||
                                                            editForm.errors.room_id}
                                                    </p>
                                                )}
                                                <div className="col-span-2 flex gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={editForm.processing}
                                                        className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-800"
                                                    >
                                                        Enregistrer
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingId(null)}
                                                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-100"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </form>
                                        </li>
                                    ) : (
                                        <li
                                            key={entry.id}
                                            className="flex items-center justify-between rounded-lg border border-ink-100 p-3"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-ink-900">
                                                    {entry.subject?.name}
                                                </p>
                                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                                    </span>
                                                    {entry.teacher && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <User className="h-3.5 w-3.5" />
                                                            {entry.teacher.first_name} {entry.teacher.last_name}
                                                        </span>
                                                    )}
                                                    {entry.room && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            {entry.room.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <IconButton
                                                    onClick={() => startEdit(entry)}
                                                    label="Modifier"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => destroy(entry)}
                                                    label="Supprimer"
                                                    tone="danger"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </IconButton>
                                            </div>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </Card>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
