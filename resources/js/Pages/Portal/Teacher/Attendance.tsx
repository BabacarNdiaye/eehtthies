import Card from '@/Components/Admin/Card';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import Avatar from '@/Components/Connect/Avatar';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import useMediaQuery from '@/hooks/useMediaQuery';
import PortalLayout from '@/Layouts/PortalLayout';
import { haptic } from '@/lib/portal';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Head, router } from '@inertiajs/react';
import { Check, Clock, Inbox, UserCheck, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';

type StudentRow = { id: number; matricule: string; first_name: string; last_name: string };
type ExistingRow = { student_id: number; status: string; justification?: string | null };
type Pair = { school_class_id: number; subject_id: number; class_name: string; subject_name: string };
type RecordState = { status: string; justification: string };

interface Props {
    pairs: Pair[];
    students: StudentRow[];
    existing: Record<number, ExistingRow>;
    selectedClassId: number | null;
    selectedSubjectId: number | null;
    date: string;
    statuses: Record<string, string>;
}

const statusStyles: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    retard: 'bg-amber-100 text-amber-700 border-amber-200',
    absence_justifiee: 'bg-blue-100 text-blue-700 border-blue-200',
};

// Trois gros boutons pour le pouce ; « absence justifiée » se règle ensuite d'un bouton à bascule.
const choices = [
    { key: 'present', label: 'Présent', icon: UserCheck, on: 'border-emerald-500 bg-emerald-500 text-white' },
    { key: 'retard', label: 'Retard', icon: Clock, on: 'border-amber-500 bg-amber-500 text-white' },
    { key: 'absent', label: 'Absent', icon: UserX, on: 'border-red-500 bg-red-500 text-white' },
];

export default function Attendance({ pairs, students, existing, selectedClassId, selectedSubjectId, date, statuses }: Props) {
    const isWide = useMediaQuery('(min-width: 768px)');
    const [records, setRecords] = useState<Record<number, RecordState>>({});
    const [processing, setProcessing] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const initial: Record<number, RecordState> = {};

        students.forEach((s) => {
            const ex = existing[s.id];
            initial[s.id] = { status: ex?.status ?? 'present', justification: ex?.justification ?? '' };
        });
        setRecords(initial);
    }, [students, existing]);

    const selectedPairKey = selectedClassId && selectedSubjectId ? `${selectedClassId}-${selectedSubjectId}` : '';

    const updateFilters = (patch: Partial<{ pair: string; date: string }>) => {
        let schoolClassId = selectedClassId;
        let subjectId = selectedSubjectId;

        if (patch.pair !== undefined) {
            const [classId, subjId] = patch.pair.split('-').map(Number);
            schoolClassId = classId || null;
            subjectId = subjId || null;
        }

        router.get(
            route('teacher.attendance.index'),
            {
                school_class_id: schoolClassId ?? '',
                subject_id: subjectId ?? '',
                date: patch.date ?? date,
            },
            { preserveState: true },
        );
    };

    const setStatus = (studentId: number, status: string) => {
        setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
    };

    const setJustification = (studentId: number, justification: string) => {
        setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], justification } }));
    };

    const markAllPresent = () => {
        haptic(12);
        setRecords((prev) => Object.fromEntries(students.map((s) => [s.id, { status: 'present', justification: prev[s.id]?.justification ?? '' }])));
    };

    const counts = students.reduce(
        (total, s) => {
            const status = records[s.id]?.status ?? 'present';

            if (status === 'present') total.present++;
            else if (status === 'retard') total.late++;
            else total.absent++;

            return total;
        },
        { present: 0, late: 0, absent: 0 },
    );

    const save = () => {
        if (!selectedClassId || !selectedSubjectId) return;
        setProcessing(true);
        router.post(
            route('teacher.attendance.store'),
            {
                school_class_id: selectedClassId,
                subject_id: selectedSubjectId,
                date,
                records: students.map((s) => ({
                    student_id: s.id,
                    status: records[s.id]?.status ?? 'present',
                    justification: records[s.id]?.justification || null,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    haptic(20);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2500);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mes présences" />
            <PortalPageHeader title="Présences" subtitle="Faites l'appel pour l'une de vos classes." />

            <Card className="mb-5 p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Classe / Matière">
                        <Select value={selectedPairKey} onChange={(e) => updateFilters({ pair: e.target.value })}>
                            <option value="">Sélectionner...</option>
                            {pairs.map((p) => (
                                <option key={`${p.school_class_id}-${p.subject_id}`} value={`${p.school_class_id}-${p.subject_id}`}>
                                    {p.class_name} — {p.subject_name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Date">
                        <TextInput type="date" value={date} onChange={(e) => updateFilters({ date: e.target.value })} />
                    </Field>
                </div>
            </Card>

            {(!selectedClassId || !selectedSubjectId) && <Card className="p-10 text-center text-ink-400">Sélectionnez une classe et une matière pour commencer l'appel.</Card>}

            {selectedClassId && selectedSubjectId && students.length === 0 && (
                <Card className="p-10 text-center">
                    <div className="flex flex-col items-center gap-3 text-ink-400">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" />
                        </span>
                        <p className="text-sm">Aucun élève actif dans cette classe.</p>
                    </div>
                </Card>
            )}

            {selectedClassId && selectedSubjectId && students.length > 0 && !isWide && (
                <>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-1.5 text-xs font-semibold" aria-live="polite">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                                {counts.present} présent{counts.present > 1 ? 's' : ''}
                            </span>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                                {counts.late} retard{counts.late > 1 ? 's' : ''}
                            </span>
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">
                                {counts.absent} absent{counts.absent > 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={markAllPresent}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 transition-colors active:bg-ink-50"
                        >
                            <UserCheck className="h-4 w-4" /> Tous présents
                        </button>
                    </div>

                    <ul className="space-y-2.5">
                        {students.map((s) => {
                            const status = records[s.id]?.status ?? 'present';
                            const isAbsent = status === 'absent' || status === 'absence_justifiee';

                            return (
                                <li key={s.id} className="rounded-2xl bg-white p-3.5 shadow-soft ring-1 ring-ink-100">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-ink-900">
                                                {s.first_name} {s.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{s.matricule}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label={`Statut de ${s.first_name} ${s.last_name}`}>
                                        {choices.map((choice) => {
                                            const active = choice.key === 'absent' ? isAbsent : status === choice.key;

                                            return (
                                                <button
                                                    key={choice.key}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => {
                                                        haptic();
                                                        setStatus(s.id, choice.key === 'absent' && status === 'absence_justifiee' ? 'absence_justifiee' : choice.key);
                                                    }}
                                                    className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-colors ${
                                                        active ? choice.on : 'border-ink-200 text-ink-500 active:bg-ink-50'
                                                    }`}
                                                >
                                                    <choice.icon className="h-4 w-4" /> {choice.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {status !== 'present' && (
                                        <div className="mt-3 flex items-center gap-2">
                                            {isAbsent && (
                                                <button
                                                    type="button"
                                                    aria-pressed={status === 'absence_justifiee'}
                                                    onClick={() => {
                                                        haptic();
                                                        setStatus(s.id, status === 'absence_justifiee' ? 'absent' : 'absence_justifiee');
                                                    }}
                                                    className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                                                        status === 'absence_justifiee' ? 'border-blue-200 bg-blue-100 text-blue-700' : 'border-ink-200 text-ink-500 active:bg-ink-50'
                                                    }`}
                                                >
                                                    Justifiée
                                                </button>
                                            )}
                                            <TextInput
                                                placeholder="Motif (optionnel)"
                                                aria-label={`Motif pour ${s.first_name} ${s.last_name}`}
                                                value={records[s.id]?.justification ?? ''}
                                                onChange={(e) => setJustification(s.id, e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    <div className="sticky bottom-[calc(var(--portal-bar-h)+0.5rem)] z-20 mt-4">
                        <button
                            type="button"
                            onClick={save}
                            disabled={processing}
                            className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white shadow-elevated transition-colors disabled:opacity-60 ${
                                saved ? 'bg-emerald-600' : 'bg-ink-900 active:bg-ink-800'
                            }`}
                        >
                            {saved ? (
                                <>
                                    <Check className="h-5 w-5" /> Appel enregistré
                                </>
                            ) : (
                                `Enregistrer l'appel · ${students.length} élève${students.length > 1 ? 's' : ''}`
                            )}
                        </button>
                    </div>
                </>
            )}

            {selectedClassId && selectedSubjectId && students.length > 0 && isWide && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Élève</th>
                                    <th className="px-5 py-3">Statut</th>
                                    <th className="px-5 py-3">Justification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {students.map((s) => (
                                    <tr key={s.id}>
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-ink-900">
                                                {s.first_name} {s.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{s.matricule}</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                {Object.entries(statuses).map(([value, label]) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setStatus(s.id, value)}
                                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                                                            records[s.id]?.status === value ? statusStyles[value] : 'border-ink-200 text-ink-400 hover:bg-ink-50'
                                                        }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <TextInput
                                                placeholder="Motif (optionnel)"
                                                value={records[s.id]?.justification ?? ''}
                                                onChange={(e) => setJustification(s.id, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-ink-100 p-4">
                        <button
                            type="button"
                            onClick={markAllPresent}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                        >
                            <UserCheck className="h-4 w-4" /> Tous présents
                        </button>
                        <button
                            onClick={save}
                            disabled={processing}
                            className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Enregistrer les présences
                        </button>
                    </div>
                </Card>
            )}
        </PortalLayout>
    );
}
