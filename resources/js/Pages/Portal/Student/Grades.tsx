import Card from '@/Components/Admin/Card';
import GradeList, { GradedExam } from '@/Components/Portal/GradeList';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import ReportCardList from '@/Components/Portal/ReportCardList';
import SectionTitle from '@/Components/Portal/SectionTitle';
import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import { Grade, ReportCard } from '@/types';
import { Head } from '@inertiajs/react';
import { Download } from 'lucide-react';

interface Props {
    exams: GradedExam[];
    grades: Record<number, Grade>;
    reportCards: ReportCard[];
    schoolClassId?: number | null;
}

export default function Grades({ exams, grades, reportCards, schoolClassId }: Props) {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mes notes et bulletins" />

            <PortalPageHeader
                title="Mes notes et bulletins"
                action={
                    schoolClassId ? (
                        <a
                            href={route('student.grades.pdf')}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Télécharger le relevé de notes en PDF"
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition-colors active:bg-ink-800 lg:hover:bg-ink-800"
                        >
                            <Download className="h-4 w-4" /> PDF
                        </a>
                    ) : undefined
                }
            />

            <section className="mb-8">
                <SectionTitle title="Détail des notes" />

                <div className="md:hidden">
                    <GradeList exams={exams} grades={grades} />
                </div>

                <Card className="hidden overflow-hidden md:block">
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
                                            <td className="px-5 py-3 text-ink-600">{new Date(exam.exam_date).toLocaleDateString('fr-FR')}</td>
                                            <td className="px-5 py-3 font-semibold text-ink-900">
                                                {grade?.is_absent ? 'Absent(e)' : grade?.score != null ? `${grade.score} / ${exam.max_score}` : '—'}
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
            </section>

            <section>
                <SectionTitle title="Bulletins" />
                <ReportCardList reportCards={reportCards} pdfHref={(reportCard) => route('student.report-cards.pdf', reportCard.id)} />
            </section>
        </PortalLayout>
    );
}
