import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Select, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import useMediaQuery from '@/hooks/useMediaQuery';
import { gradeStatusHint, gradeStatusOf } from '@/lib/gradeStatus';
import { Exam, Grade, GradeStatus } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';
import { useState } from 'react';

type StudentRow = { id: number; matricule: string; first_name: string; last_name: string };
type Entry = { score: string; status: GradeStatus; comment: string };

interface Props {
    exam: Exam;
    students: StudentRow[];
    grades: Record<number, Grade>;
    statuses: Record<GradeStatus, string>;
}

/**
 * Sous 768 px le tableau devient une liste de cartes (voir useResponsiveTables) : la valeur n'y dispose que d'environ
 * 190 px, où « Absent(e) non justifié(e) » est tronqué. On y met des libellés courts ; ils se lisent en entier.
 */
const shortLabels: Partial<Record<GradeStatus, string>> = {
    present: 'Présent(e)',
    absent_justifie: 'Abs. justifiée',
    absent_non_justifie: 'Abs. non justifiée',
};

export default function Grades({ exam, students, grades, statuses }: Props) {
    const cards = useMediaQuery('(max-width: 767px)');
    const [entries, setEntries] = useState<Record<number, Entry>>(() => {
        const initial: Record<number, Entry> = {};
        students.forEach((s) => {
            const g = grades[s.id];
            initial[s.id] = {
                score: g?.score != null ? String(g.score) : '',
                status: gradeStatusOf(g),
                comment: g?.comment ?? '',
            };
        });
        return initial;
    });
    const [processing, setProcessing] = useState(false);

    const setField = (studentId: number, field: keyof Entry, value: string) => {
        setEntries((prev) => {
            const next = { ...prev[studentId], [field]: value } as Entry;

            // Une absence n'a pas de note : passer à « absent » efface celle qu'on avait tapée.
            if (field === 'status' && value !== 'present') next.score = '';

            return { ...prev, [studentId]: next };
        });
    };

    const save = () => {
        setProcessing(true);
        router.post(
            route('admin.exams.grades.store', exam.id),
            {
                grades: students.map((s) => {
                    const entry = entries[s.id];

                    return {
                        student_id: s.id,
                        score: entry?.status === 'present' ? entry.score || null : null,
                        status: entry?.status ?? 'present',
                        comment: entry?.comment || null,
                    };
                }),
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

            <p className="mb-4 text-sm text-ink-500">{gradeStatusHint}</p>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Note / {exam.max_score}</th>
                                <th className="px-5 py-3">Statut</th>
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
                                            disabled={entries[s.id]?.status !== 'present'}
                                            value={entries[s.id]?.score ?? ''}
                                            onChange={(e) => setField(s.id, 'score', e.target.value)}
                                            className="w-24"
                                        />
                                    </td>
                                    <td className="px-5 py-3">
                                        <Select
                                            aria-label={`Statut de ${s.first_name} ${s.last_name}`}
                                            value={entries[s.id]?.status ?? 'present'}
                                            onChange={(e) => setField(s.id, 'status', e.target.value)}
                                            className="max-w-[15rem] md:min-w-48"
                                        >
                                            {Object.entries(statuses).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {cards ? (shortLabels[value as GradeStatus] ?? label) : label}
                                                </option>
                                            ))}
                                        </Select>
                                    </td>
                                    <td className="px-5 py-3">
                                        <TextInput
                                            aria-label={`Commentaire pour ${s.first_name} ${s.last_name}`}
                                            value={entries[s.id]?.comment ?? ''}
                                            onChange={(e) => setField(s.id, 'comment', e.target.value)}
                                            placeholder={cards ? 'Appréciation' : 'Appréciation (optionnel)'}
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
