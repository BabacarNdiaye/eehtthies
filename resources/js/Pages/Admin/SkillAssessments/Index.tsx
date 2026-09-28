import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Select } from '@/Components/Admin/Field';
import Pagination from '@/Components/Admin/Pagination';
import { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FileDown, Inbox } from 'lucide-react';

type AssessmentRow = {
    id: number;
    level: number;
    assessed_at: string;
    student: { id: number; first_name: string; last_name: string; matricule: string; school_class_id: number | null };
    skill: { id: number; name: string };
    teacher: { id: number; first_name: string; last_name: string } | null;
};

interface Props {
    assessments: Paginated<AssessmentRow>;
    schoolClasses: { id: number; name: string }[];
    levels: Record<number, string>;
    selectedClassId: number | null;
    selectedStudentId: number | null;
}

const levelStyles: Record<number, string> = {
    1: 'bg-ink-100 text-ink-500 border-ink-200',
    2: 'bg-amber-100 text-amber-700 border-amber-200',
    3: 'bg-blue-100 text-blue-700 border-blue-200',
    4: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function Index({ assessments, schoolClasses, levels, selectedClassId }: Props) {
    const changeClass = (value: string) => {
        router.get(route('admin.skill-assessments.index'), value ? { school_class_id: value } : {}, { preserveState: true });
    };

    return (
        <AdminLayout>
            <Head title="Évaluations de compétences" />
            <PageHeader
                title="Évaluations de compétences"
                subtitle="Supervision des évaluations réalisées par les enseignants."
            />

            <Card className="mb-6 p-6">
                <div className="max-w-xs">
                    <Select value={selectedClassId ?? ''} onChange={(e) => changeClass(e.target.value)}>
                        <option value="">Toutes les classes</option>
                        {schoolClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Compétence</th>
                                <th className="px-5 py-3">Niveau</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Évalué par</th>
                                <th className="px-5 py-3 text-right">Fiche</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {assessments.data.map((a) => (
                                <tr key={a.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">
                                        {a.student.last_name} {a.student.first_name}
                                        <span className="ml-2 text-xs font-normal text-ink-400">{a.student.matricule}</span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-700">{a.skill.name}</td>
                                    <td className="px-5 py-3">
                                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${levelStyles[a.level] ?? ''}`}>
                                            {levels[a.level] ?? a.level}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{new Date(a.assessed_at).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {a.teacher ? `${a.teacher.first_name} ${a.teacher.last_name}` : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <a
                                            href={route('admin.students.skills.pdf', a.student.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                                        >
                                            <FileDown className="h-3.5 w-3.5" /> PDF
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {assessments.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune évaluation enregistrée.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={assessments} />
            </Card>
        </AdminLayout>
    );
}
