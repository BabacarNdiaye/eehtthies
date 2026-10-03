import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Select } from '@/Components/Admin/Field';
import { Exam, Paginated, SchoolClass } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CheckSquare, ClipboardList, Pencil, Square, Trash2 } from 'lucide-react';

interface Props {
    exams: Paginated<Exam>;
    schoolClasses: SchoolClass[];
    types: Record<string, string>;
    filters: { school_class_id?: string | number; type?: string };
}

export default function Index({ exams, schoolClasses, types, filters }: Props) {
    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.exams.index'),
            {
                school_class_id: filters.school_class_id ?? '',
                type: filters.type ?? '',
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    const destroy = (exam: Exam) => {
        if (confirm(`Supprimer l'épreuve "${exam.title}" ? Les notes associées seront également supprimées.`)) {
            router.delete(route('admin.exams.destroy', exam.id));
        }
    };

    const togglePublish = (exam: Exam) => {
        router.patch(route('admin.exams.publish', exam.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Examens & devoirs" />
            <PageHeader
                title="Examens & devoirs"
                subtitle="Planifiez les devoirs, contrôles et examens, puis saisissez les notes."
                action={{ label: 'Nouvelle épreuve', href: route('admin.exams.create') }}
            />

            <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Select
                    value={filters.school_class_id ?? ''}
                    onChange={(e) => applyFilters({ school_class_id: e.target.value })}
                    className="sm:w-64"
                >
                    <option value="">Toutes les classes</option>
                    {schoolClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </Select>
                <Select
                    value={filters.type ?? ''}
                    onChange={(e) => applyFilters({ type: e.target.value })}
                    className="sm:w-56"
                >
                    <option value="">Tous les types</option>
                    {Object.entries(types).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>

                {/* Bouton Télécharger PDF (conserve les filtres actuels) */}
                <a
                    href={`/admin/exams/pdf?school_class_id=${filters.school_class_id ?? ''}&type=${filters.type ?? ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Télécharger PDF
                </a>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Épreuve</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Publié</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {exams.data.map((exam) => (
                                <tr key={exam.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{exam.title}</p>
                                        <p className="text-xs text-ink-500">{types[exam.type]}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{exam.school_class?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">{exam.subject?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {new Date(exam.exam_date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-5 py-3">
                                        <button
                                            onClick={() => togglePublish(exam)}
                                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                                exam.is_published ? 'text-emerald-600' : 'text-ink-400'
                                            }`}
                                        >
                                            {exam.is_published ? (
                                                <CheckSquare className="h-4 w-4" />
                                            ) : (
                                                <Square className="h-4 w-4" />
                                            )}
                                            {exam.is_published ? 'Publié' : 'Non publié'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={route('admin.exams.grades', exam.id)}
                                                className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                                title="Saisir les notes"
                                            >
                                                <ClipboardList className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={route('admin.exams.edit', exam.id)}
                                                className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => destroy(exam)}
                                                className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {exams.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <ClipboardList className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune épreuve enregistrée.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={exams} />
            </Card>
        </AdminLayout>
    );
}
