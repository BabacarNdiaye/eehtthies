import AdminLayout from '@/Layouts/AdminLayout';
import RichTextView from '@/Components/RichText/RichTextView';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { LessonLog, Paginated, SchoolClass } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Download, Inbox } from 'lucide-react';
import { TeachingTabs } from '@/Components/Admin/ClusterTabs';

interface TeacherOption {
    id: number;
    first_name: string;
    last_name: string;
}

interface Props {
    logs: Paginated<LessonLog>;
    schoolClasses: SchoolClass[];
    teachers: TeacherOption[];
    selectedClassId: number | null;
    selectedTeacherId: number | null;
    from: string;
    to: string;
}

export default function Index({ logs, schoolClasses, teachers, selectedClassId, selectedTeacherId, from, to }: Props) {
    const updateFilters = (patch: Partial<{ school_class_id: string; teacher_id: string; from: string; to: string }>) => {
        router.get(
            route('admin.lesson-logs.index'),
            {
                school_class_id: selectedClassId ?? '',
                teacher_id: selectedTeacherId ?? '',
                from,
                to,
                ...patch,
            },
            { preserveState: true },
        );
    };

    const pdfHref = route('admin.lesson-logs.pdf', {
        school_class_id: selectedClassId ?? '',
        teacher_id: selectedTeacherId ?? '',
        from,
        to,
    });

    return (
        <AdminLayout>
            <Head title="Cahier de texte" />
            <PageHeader
                title="Cahier de texte"
                subtitle="Suivi des séances enregistrées par les enseignants depuis leur espace."
            >
                <a
                    href={pdfHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    <Download className="h-4 w-4" /> Exporter en PDF
                </a>
            </PageHeader>
            <TeachingTabs current="lesson-log" />

            <Card className="mb-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <Field label="Classe">
                        <Select
                            value={selectedClassId ?? ''}
                            onChange={(e) => updateFilters({ school_class_id: e.target.value })}
                        >
                            <option value="">Toutes les classes</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Enseignant">
                        <Select
                            value={selectedTeacherId ?? ''}
                            onChange={(e) => updateFilters({ teacher_id: e.target.value })}
                        >
                            <option value="">Tous les enseignants</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.first_name} {t.last_name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Du">
                        <TextInput type="date" value={from} onChange={(e) => updateFilters({ from: e.target.value })} />
                    </Field>
                    <Field label="Au">
                        <TextInput type="date" value={to} onChange={(e) => updateFilters({ to: e.target.value })} />
                    </Field>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Enseignant</th>
                                <th className="px-5 py-3">Contenu de la séance</th>
                                <th className="px-5 py-3">Devoirs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {logs.data.map((log) => (
                                <tr key={log.id} className="align-top transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 text-ink-700">
                                        {new Date(log.date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-5 py-3 text-ink-700">{log.school_class?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-700">{log.subject?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-700">
                                        {log.teacher ? `${log.teacher.first_name} ${log.teacher.last_name}` : '—'}
                                    </td>
                                    <td className="max-w-sm px-5 py-3 text-ink-600"><RichTextView html={log.content} /></td>
                                    <td className="max-w-xs px-5 py-3 text-ink-500">{log.homework ? <RichTextView html={log.homework} /> : '—'}</td>
                                </tr>
                            ))}
                            {logs.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune séance enregistrée sur cette période.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={logs} />
            </Card>
        </AdminLayout>
    );
}
