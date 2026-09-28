import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import Card from '@/Components/Admin/Card';
import Pagination from '@/Components/Admin/Pagination';
import StatusBadge from '@/Components/Admin/StatusBadge';
import { Attendance as AttendanceType, Paginated } from '@/types';
import { Head } from '@inertiajs/react';

const statusLabels: Record<string, string> = {
    present: 'Présent',
    absent: 'Absent',
    retard: 'Retard',
    absence_justifiee: 'Absence justifiée',
};

interface Props {
    records: Paginated<AttendanceType & { subject?: { id: number; name: string } | null }>;
    stats: Record<string, number>;
}

export default function Attendance({ records, stats }: Props) {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mes présences" />
            <h1 className="mb-6 font-serif text-2xl font-bold text-ink-900">Mes présences</h1>

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Object.entries(statusLabels).map(([key, label]) => (
                    <Card key={key} className="p-4 text-center">
                        <p className="text-2xl font-bold text-ink-900">{stats[key] ?? 0}</p>
                        <p className="text-xs text-ink-500">{label}</p>
                    </Card>
                ))}
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3">Justification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {records.data.map((r) => (
                                <tr key={r.id}>
                                    <td className="px-5 py-3 text-ink-700">
                                        {new Date(r.date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{r.subject?.name ?? 'Journée entière'}</td>
                                    <td className="px-5 py-3">
                                        <StatusBadge status={r.status} label={statusLabels[r.status]} />
                                    </td>
                                    <td className="px-5 py-3 text-ink-500">{r.justification ?? '—'}</td>
                                </tr>
                            ))}
                            {records.data.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center text-ink-400">
                                        Aucun enregistrement de présence pour le moment.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={records} />
            </Card>
        </PortalLayout>
    );
}
