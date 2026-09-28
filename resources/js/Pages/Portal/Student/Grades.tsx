import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import Card from '@/Components/Admin/Card';
import { Exam, Grade, ReportCard } from '@/types';
import { Head } from '@inertiajs/react';
import { Award, Download } from 'lucide-react';

const decisionStyles: Record<string, string> = {
    admis: 'bg-emerald-100 text-emerald-700',
    redouble: 'bg-red-100 text-red-700',
    rattrapage: 'bg-purple-100 text-purple-700',
    non_defini: 'bg-ink-100 text-ink-500',
};

const decisionLabels: Record<string, string> = {
    admis: 'Admis(e) en classe supérieure',
    redouble: 'Autorisé(e) à redoubler',
    exclu: 'Exclusion',
    rattrapage: 'Rattrapage',
    non_defini: 'Non défini',
};

interface Props {
    exams: (Exam & { subject?: { id: number; name: string } })[];
    grades: Record<number, Grade>;
    reportCards: ReportCard[];
    schoolClassId?: number | null;
}

export default function Grades({ exams, grades, reportCards, schoolClassId }: Props) {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <div className="mb-6 flex items-center justify-between gap-4">
                <Head title="Mes notes et bulletins" />
                <h1 className="font-serif text-2xl font-bold text-ink-900">Mes notes et bulletins</h1>
                {schoolClassId ? (
                    <a
                        href={`/generate_pdf.php?class_id=${schoolClassId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                    >
                        <Download className="h-4 w-4" /> Télécharger PDF
                    </a>
                ) : null}
            </div>

            <Card className="mb-6 overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">Détail des notes</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Épreuve</th>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {exams.map((exam) => {
                                const grade = grades[exam.id];
                                return (
                                    <tr key={exam.id}>
                                        <td className="px-5 py-3 font-medium text-ink-900">{exam.title}</td>
                                        <td className="px-5 py-3 text-ink-600">{exam.subject?.name}</td>
                                        <td className="px-5 py-3 text-ink-600">
                                            {new Date(exam.exam_date).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-5 py-3 font-semibold text-ink-900">
                                            {grade?.is_absent
                                                ? 'Absent(e)'
                                                : grade?.score != null
                                                  ? `${grade.score} / ${exam.max_score}`
                                                  : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {exams.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center text-ink-400">
                                        Aucune note publiée pour le moment.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="border-b border-ink-100 p-5">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">Bulletins</h2>
                </div>
                <ul className="divide-y divide-ink-100">
                    {reportCards.map((rc) => (
                        <li key={rc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-800">
                                    <Award className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-ink-900">{rc.term}</p>
                                    <p className="text-xs text-ink-500">
                                        Moyenne : {rc.average != null ? Number(rc.average).toFixed(2) : '—'} / 20
                                        {rc.rank ? ` · Rang ${rc.rank}/${rc.class_size}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${decisionStyles[rc.decision]}`}
                                >
                                    {decisionLabels[rc.decision]}
                                </span>
                                <a
                                    href={route('student.report-cards.pdf', rc.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white hover:bg-ink-800"
                                >
                                    <Download className="h-3.5 w-3.5" /> PDF
                                </a>
                            </div>
                        </li>
                    ))}
                    {reportCards.length === 0 && (
                        <li className="px-5 py-10 text-center text-ink-400">Aucun bulletin publié pour le moment.</li>
                    )}
                </ul>
            </Card>
        </PortalLayout>
    );
}
