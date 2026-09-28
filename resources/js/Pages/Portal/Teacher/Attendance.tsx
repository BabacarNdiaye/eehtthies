import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import Card from '@/Components/Admin/Card';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Head, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';
import { useEffect, useState } from 'react';

type StudentRow = { id: number; matricule: string; first_name: string; last_name: string };
type ExistingRow = { student_id: number; status: string; justification?: string | null };
type Pair = { school_class_id: number; subject_id: number; class_name: string; subject_name: string };

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

export default function Attendance({
    pairs,
    students,
    existing,
    selectedClassId,
    selectedSubjectId,
    date,
    statuses,
}: Props) {
    const [records, setRecords] = useState<Record<number, { status: string; justification: string }>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const initial: Record<number, { status: string; justification: string }> = {};
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
            { preserveScroll: true, onFinish: () => setProcessing(false) },
        );
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mes présences" />
            <div className="mb-6">
                <h1 className="font-serif text-2xl font-bold text-ink-900">Présences</h1>
                <p className="mt-1 text-sm text-ink-500">Faites l'appel pour l'une de vos classes.</p>
            </div>

            <Card className="mb-6 p-6">
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

            {(!selectedClassId || !selectedSubjectId) && (
                <Card className="p-10 text-center text-ink-400">
                    Sélectionnez une classe et une matière pour commencer l'appel.
                </Card>
            )}

            {selectedClassId && selectedSubjectId && (
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
                                                            records[s.id]?.status === value
                                                                ? statusStyles[value]
                                                                : 'border-ink-200 text-ink-400 hover:bg-ink-50'
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
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-10 text-center">
                                            <div className="flex flex-col items-center gap-3 text-ink-400">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                    <Inbox className="h-6 w-6" />
                                                </span>
                                                <p className="text-sm">Aucun élève actif dans cette classe.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {students.length > 0 && (
                        <div className="flex justify-end border-t border-ink-100 p-4">
                            <button
                                onClick={save}
                                disabled={processing}
                                className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                            >
                                Enregistrer les présences
                            </button>
                        </div>
                    )}
                </Card>
            )}
        </PortalLayout>
    );
}
