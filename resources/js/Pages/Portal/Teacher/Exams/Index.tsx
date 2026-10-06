import Card from '@/Components/Admin/Card';
import Pagination from '@/Components/Admin/Pagination';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import useMediaQuery from '@/hooks/useMediaQuery';
import PortalLayout from '@/Layouts/PortalLayout';
import { subjectStyle } from '@/lib/portal';
import { Exam, Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { teacherNav } from '../Dashboard';

interface Props {
    exams: Paginated<Exam>;
    types: Record<string, string>;
}

export default function Index({ exams, types }: Props) {
    const isWide = useMediaQuery('(min-width: 768px)');

    const destroy = (exam: Exam) => {
        if (confirm(`Supprimer le devoir "${exam.title}" ? Les notes associées seront également supprimées.`)) {
            router.delete(route('teacher.exams.destroy', exam.id));
        }
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Devoirs" />

            <PortalPageHeader
                title="Devoirs"
                subtitle="Programmez vos devoirs, interrogations et contrôles pour vos classes."
                action={
                    <Link
                        href={route('teacher.exams.create')}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition-colors active:bg-ink-800 lg:hover:bg-ink-800"
                    >
                        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Programmer un devoir</span>
                        <span className="sm:hidden">Nouveau</span>
                    </Link>
                }
            />

            {!isWide ? (
                <>
                    {exams.data.length === 0 ? (
                        <p className="rounded-3xl bg-white px-4 py-10 text-center text-sm text-ink-400 ring-1 ring-ink-100">Aucun devoir programmé.</p>
                    ) : (
                        <ul className="space-y-3">
                            {exams.data.map((exam) => {
                                const { icon: Icon, gradient } = subjectStyle(exam.subject?.name ?? '');

                                return (
                                    <li key={exam.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                                        <div className="flex items-start gap-3">
                                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white`}>
                                                <Icon className="h-5 w-5" strokeWidth={1.9} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-ink-900">{exam.title}</p>
                                                <p className="truncate text-xs text-ink-500">
                                                    {[exam.school_class?.name, exam.subject?.name].filter(Boolean).join(' · ')}
                                                </p>
                                                <p className="mt-0.5 text-xs text-ink-400">
                                                    {types[exam.type] ?? exam.type} · {new Date(exam.exam_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            {exam.can_grade && (
                                                <Link
                                                    href={route('teacher.exams.grades', exam.id)}
                                                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-ink-900 text-sm font-semibold text-white transition-colors active:bg-ink-800"
                                                >
                                                    <ClipboardList className="h-4 w-4" /> Saisir les notes
                                                </Link>
                                            )}
                                            {exam.is_mine ? (
                                                <>
                                                    <Link
                                                        href={route('teacher.exams.edit', exam.id)}
                                                        aria-label={`Modifier ${exam.title}`}
                                                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-ink-200 text-ink-600 transition-colors active:bg-ink-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => destroy(exam)}
                                                        aria-label={`Supprimer ${exam.title}`}
                                                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 text-red-600 transition-colors active:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                !exam.can_grade && <span className="self-center text-xs italic text-ink-500">Créé par un autre enseignant</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <div className="mt-4">
                        <Pagination data={exams} />
                    </div>
                </>
            ) : (
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
                                        <td className="px-5 py-3 text-ink-600">{exam.school_class?.name ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{exam.subject?.name ?? '—'}</td>
                                        <td className="px-5 py-3 text-ink-600">{new Date(exam.exam_date).toLocaleDateString('fr-FR')}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {exam.can_grade && (
                                                    <Link href={route('teacher.exams.grades', exam.id)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" title="Saisir les notes">
                                                        <ClipboardList className="h-4 w-4" />
                                                    </Link>
                                                )}
                                                {exam.is_mine ? (
                                                    <>
                                                        <Link href={route('teacher.exams.edit', exam.id)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100">
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                        <button onClick={() => destroy(exam)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    !exam.can_grade && <span className="text-xs italic text-ink-500">Créé par un autre enseignant</span>
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
            )}
        </PortalLayout>
    );
}
