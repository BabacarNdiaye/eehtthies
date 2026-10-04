import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Attendance, Paginated, SchoolClass, Subject } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Download, Inbox } from 'lucide-react';

interface Props {
    schoolClasses: SchoolClass[];
    subjects: Subject[];
    records: Paginated<Attendance>;
    statuses: Record<string, string>;
    selectedClassId: number | null;
    selectedSubjectId: number | null;
    from: string;
    to: string;
}

const statusStyles: Record<string, string> = {
    absent: 'bg-red-100 text-red-700 border-red-200',
    retard: 'bg-amber-100 text-amber-700 border-amber-200',
    absence_justifiee: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function Register({
    schoolClasses,
    subjects,
    records,
    statuses,
    selectedClassId,
    selectedSubjectId,
    from,
    to,
}: Props) {
    const updateFilters = (patch: Partial<{ school_class_id: string; subject_id: string; from: string; to: string }>) => {
        router.get(
            route('admin.pointage.register'),
            {
                school_class_id: selectedClassId ?? '',
                subject_id: selectedSubjectId ?? '',
                from,
                to,
                ...patch,
            },
            { preserveState: true },
        );
    };

    const pdfHref = route('admin.pointage.register.pdf', {
        school_class_id: selectedClassId ?? '',
        subject_id: selectedSubjectId ?? '',
        from,
        to,
    });

    return (
        <AdminLayout>
            <Head title="Registre d'absences" />
            <PageHeader
                title="Registre d'absences"
                subtitle="Cahier d'absence chronologique — absences, retards et absences justifiées."
            >
                <div className="flex gap-2">
                    <Link
                        href={route('admin.pointage.report')}
                        className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    >
                        Voir les statistiques
                    </Link>
                    <a
                        href={pdfHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                    >
                        <Download className="h-4 w-4" /> Exporter en PDF
                    </a>
                </div>
            </PageHeader>

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
                    <Field label="Matière">
                        <Select
                            value={selectedSubjectId ?? ''}
                            onChange={(e) => updateFilters({ subject_id: e.target.value })}
                        >
                            <option value="">Toutes les matières</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
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
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3">Heure prévue</th>
                                <th className="px-5 py-3">Heure d'arrivée</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {records.data.map((record) => (
                                <tr key={record.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 text-ink-700">
                                        {new Date(record.date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">
                                            {record.student?.first_name} {record.student?.last_name}
                                        </p>
                                        <p className="text-xs text-ink-500">{record.student?.matricule}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-700">{record.school_class?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-700">{record.subject?.name ?? 'Journée entière'}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[record.status] ?? ''}`}
                                        >
                                            {statuses[record.status] ?? record.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-500">
                                        {record.timetable_entry ? record.timetable_entry.start_time.slice(0, 5) : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-ink-500">
                                        {record.checked_in_at
                                            ? new Date(record.checked_in_at).toLocaleTimeString('fr-FR', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                              })
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                            {records.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune absence ou retard sur cette période.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={records} />
            </Card>
        </AdminLayout>
    );
}
