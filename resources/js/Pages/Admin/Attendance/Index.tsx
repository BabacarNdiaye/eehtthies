import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { SchoolClass, Subject } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Inbox } from 'lucide-react';
import { useEffect, useState } from 'react';

type StudentRow = {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    qr_code?: string;
};
type ExistingRow = { student_id: number; status: string; justification?: string | null };

interface Props {
    schoolClasses: SchoolClass[];
    subjects: Subject[];
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

export default function Index({
    schoolClasses,
    subjects,
    students,
    existing,
    selectedClassId,
    selectedSubjectId,
    date,
    statuses,
}: Props) {
    const [records, setRecords] = useState<Record<number, { status: string; justification: string }>>({});
    const [qrInput, setQrInput] = useState('');
    const [qrMessage, setQrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const initial: Record<number, { status: string; justification: string }> = {};
        students.forEach((s) => {
            const ex = existing[s.id];
            initial[s.id] = {
                status: ex?.status ?? 'present',
                justification: ex?.justification ?? '',
            };
        });
        setRecords(initial);
    }, [students, existing]);

    const updateFilters = (patch: Partial<{ school_class_id: string; subject_id: string; date: string }>) => {
        router.get(
            route('admin.pointage.index'),
            {
                school_class_id: selectedClassId ?? '',
                subject_id: selectedSubjectId ?? '',
                date,
                ...patch,
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

    const handleQrPayload = (payload: string) => {
        const cleanPayload = payload.trim();

        if (!cleanPayload) {
            setQrMessage({ type: 'error', text: 'Le contenu du QR est vide.' });
            return;
        }

        try {
            let studentId: number | null = null;
            let schoolClassId: number | null = selectedClassId;

            if (cleanPayload.startsWith('{')) {
                const parsed = JSON.parse(cleanPayload) as { student_id?: number; studentId?: number; school_class_id?: number; schoolClassId?: number };
                studentId = Number(parsed.student_id ?? parsed.studentId ?? null);
                schoolClassId = Number(parsed.school_class_id ?? parsed.schoolClassId ?? selectedClassId ?? null);
            } else if (cleanPayload.startsWith('http')) {
                const parsed = new URL(cleanPayload);
                studentId = Number(parsed.searchParams.get('student_id') ?? parsed.searchParams.get('studentId') ?? null);
                schoolClassId = Number(parsed.searchParams.get('school_class_id') ?? parsed.searchParams.get('schoolClassId') ?? selectedClassId ?? null);
            } else {
                studentId = Number(cleanPayload);
            }

            if (!studentId || !Number.isFinite(studentId)) {
                throw new Error('Identifiant élève introuvable.');
            }

            const student = students.find((item) => item.id === studentId);

            if (!student) {
                setQrMessage({ type: 'error', text: 'Cet élève n’appartient pas à la classe sélectionnée.' });
                return;
            }

            router.post(
                route('admin.pointage.scan'),
                {
                    student_id: student.id,
                    school_class_id: schoolClassId ?? selectedClassId,
                    date,
                    status: 'present',
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setStatus(student.id, 'present');
                        setQrInput('');
                        setQrMessage({ type: 'success', text: `${student.first_name} ${student.last_name} a été marqué(e) présent(e).` });
                    },
                    onError: () => {
                        setQrMessage({ type: 'error', text: 'Le pointage QR n’a pas pu être enregistré.' });
                    },
                },
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Le contenu du QR est invalide.';
            setQrMessage({ type: 'error', text: message });
        }
    };

    const [processing, setProcessing] = useState(false);

    const save = () => {
        if (!selectedClassId) return;
        setProcessing(true);
        router.post(
            route('admin.pointage.store'),
            {
                school_class_id: selectedClassId,
                subject_id: selectedSubjectId || null,
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
        <AdminLayout>
            <Head title="Pointage des élèves" />
            <PageHeader
                title="Pointage des élèves"
                subtitle="Faites l'appel pour une classe à une date donnée."
            >
                <Link
                    href={route('admin.pointage.report')}
                    className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                    Voir les statistiques
                </Link>
            </PageHeader>

            <Card className="mb-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Classe">
                        <Select
                            value={selectedClassId ?? ''}
                            onChange={(e) => updateFilters({ school_class_id: e.target.value })}
                        >
                            <option value="">Sélectionner une classe...</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Matière (optionnel)" hint="Laisser vide pour un appel quotidien général">
                        <Select
                            value={selectedSubjectId ?? ''}
                            onChange={(e) => updateFilters({ subject_id: e.target.value })}
                        >
                            <option value="">Journée entière</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Date">
                        <TextInput type="date" value={date} onChange={(e) => updateFilters({ date: e.target.value })} />
                    </Field>
                </div>
            </Card>

            {!selectedClassId && (
                <Card className="p-10 text-center text-ink-500">
                    Sélectionnez une classe pour commencer l'appel.
                </Card>
            )}

            {selectedClassId && (
                <>
                    {/* Coller le contenu d'un QR n'a de sens qu'avec un lecteur branché à un ordinateur : au téléphone, la
                        page « Scanner les cartes » du menu fait ce travail. */}
                    <Card className="mb-6 hidden p-5 md:block">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-ink-900">Pointage par QR</h3>
                                <p className="text-sm text-ink-500">Collez le contenu du QR lu depuis un téléphone ou un scanner pour valider la présence.</p>
                            </div>
                            <div className="flex w-full max-w-xl gap-2">
                                <TextInput
                                    value={qrInput}
                                    onChange={(e) => setQrInput(e.target.value)}
                                    placeholder={'Ex. {"student_id": 14, "date": "2026-08-28"}'}
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleQrPayload(qrInput)}
                                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                                >
                                    Valider
                                </button>
                            </div>
                        </div>
                        {qrMessage && (
                            <div
                                className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                                    qrMessage.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-red-200 bg-red-50 text-red-700'
                                }`}
                            >
                                {qrMessage.text}
                            </div>
                        )}
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3">Élève</th>
                                        <th data-card-hide className="px-5 py-3">QR</th>
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
                                                {s.qr_code ? (
                                                    <img
                                                        src={`data:image/svg+xml;base64,${s.qr_code}`}
                                                        alt={`QR code de ${s.first_name} ${s.last_name}`}
                                                        className="h-16 w-16 rounded-md border border-ink-100 bg-white p-1"
                                                    />
                                                ) : (
                                                    <span className="text-ink-500">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Object.entries(statuses).map(([value, label]) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => setStatus(s.id, value)}
                                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 max-md:min-h-10 max-md:px-4 max-md:text-sm ${
                                                                records[s.id]?.status === value
                                                                    ? statusStyles[value]
                                                                    : 'border-ink-200 text-ink-500 hover:bg-ink-50'
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
                                            <td colSpan={4} className="px-5 py-10 text-center">
                                                <div className="flex flex-col items-center gap-3 text-ink-500">
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
                    </Card>

                    {students.length > 0 && (
                        <FormActions className="mt-6">
                            <button
                                type="button"
                                onClick={save}
                                disabled={processing}
                                className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                            >
                                Enregistrer les présences
                            </button>
                        </FormActions>
                    )}
                </>
            )}
        </AdminLayout>
    );
}
