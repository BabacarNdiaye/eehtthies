import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Exam, Grade } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';
import { useState } from 'react';

type StudentRow = { id: number; matricule: string; first_name: string; last_name: string };

interface Props {
    exam: Exam;
    students: StudentRow[];
    grades: Record<number, Grade>;
}

export default function Grades({ exam, students, grades }: Props) {
    const [entries, setEntries] = useState<Record<number, { score: string; is_absent: boolean; comment: string }>>(
        () => {
            const initial: Record<number, { score: string; is_absent: boolean; comment: string }> = {};
            students.forEach((s) => {
                const g = grades[s.id];
                initial[s.id] = {
                    score: g?.score != null ? String(g.score) : '',
                    is_absent: g?.is_absent ?? false,
                    comment: g?.comment ?? '',
                };
            });
            return initial;
        },
    );
    const [processing, setProcessing] = useState(false);

    const setField = (studentId: number, field: 'score' | 'is_absent' | 'comment', value: string | boolean) => {
        setEntries((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
    };

    const save = () => {
        setProcessing(true);
        router.post(
            route('admin.exams.grades.store', exam.id),
            {
                grades: students.map((s) => ({
                    student_id: s.id,
                    score: entries[s.id]?.is_absent ? null : entries[s.id]?.score || null,
                    is_absent: entries[s.id]?.is_absent ?? false,
                    comment: entries[s.id]?.comment || null,
                })),
            },
            { preserveScroll: true, onFinish: () => setProcessing(false) },
        );
    };

    return (
        <AdminLayout>
            <Head title={`Notes — ${exam.title}`} />
            <PageHeader
                title={`Saisie des notes — ${exam.title}`}
                subtitle={`${exam.school_class?.name ?? ''} · ${exam.subject?.name ?? ''} · Barème /${exam.max_score}`}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Note / {exam.max_score}</th>
                                <th className="px-5 py-3">Absent</th>
                                <th className="px-5 py-3">Commentaire</th>
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
                                        <TextInput
                                            aria-label={`Note de ${s.first_name} ${s.last_name}`}
                                            type="number"
                                            step="0.25"
                                            min={0}
                                            max={Number(exam.max_score)}
                                            disabled={entries[s.id]?.is_absent}
                                            value={entries[s.id]?.score ?? ''}
                                            onChange={(e) => setField(s.id, 'score', e.target.value)}
                                            className="w-24"
                                        />
                                    </td>
                                    <td className="px-5 py-3">
                                        <Checkbox
                                            aria-label={`Absent : ${s.first_name} ${s.last_name}`}
                                            checked={entries[s.id]?.is_absent ?? false}
                                            onChange={(e) => setField(s.id, 'is_absent', e.target.checked)}
                                        />
                                    </td>
                                    <td className="px-5 py-3">
                                        <TextInput
                                            value={entries[s.id]?.comment ?? ''}
                                            onChange={(e) => setField(s.id, 'comment', e.target.value)}
                                            placeholder="Appréciation (optionnel)"
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
                        Enregistrer les notes
                    </button>
                </FormActions>
            )}
        </AdminLayout>
    );
}
