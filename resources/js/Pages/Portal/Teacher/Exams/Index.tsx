import PortalLayout from '@/Layouts/PortalLayout';
import Card from '@/Components/Admin/Card';
import Pagination from '@/Components/Admin/Pagination';
import { Exam, Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { teacherNav } from '../Dashboard';

interface Props {
    exams: Paginated<Exam>;
    types: Record<string, string>;
}

export default function Index({ exams, types }: Props) {
    const destroy = (exam: Exam) => {
        if (confirm(`Supprimer le devoir "${exam.title}" ? Les notes associées seront également supprimées.`)) {
            router.delete(route('teacher.exams.destroy', exam.id));
        }
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Devoirs" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-ink-900">Devoirs</h1>
                    <p className="mt-1 text-sm text-ink-500">
                        Programmez vos devoirs, interrogations et contrôles pour vos classes.
                    </p>
                </div>
                <Link
                    href={route('teacher.exams.create')}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    <Plus className="h-4 w-4" /> Programmer un devoir
                </Link>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Devoir</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {exams.data.map((exam) => (
                                <tr key={exam.id} className="hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{exam.title}</p>
                                        <p className="text-xs text-ink-500">{types[exam.type] ?? exam.type}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{exam.schoolClass?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">{exam.subject?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {new Date(exam.exam_date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {exam.can_grade && (
                                                <Link
                                                    href={route('teacher.exams.grades', exam.id)}
                                                    className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                                                    title="Saisir les notes"
                                                >
                                                    <ClipboardList className="h-4 w-4" />
                                                </Link>
                                            )}
                                            {exam.is_mine ? (
                                                <>
                                                    <Link
                                                        href={route('teacher.exams.edit', exam.id)}
                                                        className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => destroy(exam)}
                                                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                !exam.can_grade && (
                                                    <span className="text-xs italic text-ink-300">
                                                        Créé par un autre enseignant
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {exams.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-ink-400">
                                        Aucun devoir programmé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={exams} />
            </Card>
        </PortalLayout>
    );
}
