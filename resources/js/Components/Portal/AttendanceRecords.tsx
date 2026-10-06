import { ClipboardCheck } from 'lucide-react';

export type AttendanceRow = {
    id: number;
    date: string;
    status: string;
    justification?: string | null;
    subject?: { id: number; name: string } | null;
};

export const attendanceLabels: Record<string, string> = {
    present: 'Présent',
    absent: 'Absent',
    retard: 'Retard',
    absence_justifiee: 'Absence justifiée',
};

const tones: Record<string, { tile: string; chip: string }> = {
    present: { tile: 'bg-emerald-50 text-emerald-700', chip: 'bg-emerald-100 text-emerald-700' },
    absent: { tile: 'bg-red-50 text-red-700', chip: 'bg-red-100 text-red-700' },
    retard: { tile: 'bg-amber-50 text-amber-700', chip: 'bg-amber-100 text-amber-700' },
    absence_justifiee: { tile: 'bg-blue-50 text-blue-700', chip: 'bg-blue-100 text-blue-700' },
};

/** Quatre tuiles : présences, absences, retards et absences justifiées. */
export function AttendanceStats({ stats }: { stats: Record<string, number> }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(attendanceLabels).map(([key, label]) => (
                <div key={key} className={`rounded-2xl p-4 text-center ${tones[key].tile}`}>
                    <p className="text-3xl font-bold leading-none">{stats[key] ?? 0}</p>
                    <p className="mt-1.5 text-xs font-medium">{label}</p>
                </div>
            ))}
        </div>
    );
}

/** Historique des pointages : cartes sur téléphone, tableau à partir de la taille tablette. */
export default function AttendanceRecords({ records }: { records: AttendanceRow[] }) {
    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-4 py-10 text-center ring-1 ring-ink-100">
                <ClipboardCheck className="h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-400">Aucun enregistrement de présence pour le moment.</p>
            </div>
        );
    }

    return (
        <>
            <ul className="space-y-2.5 md:hidden">
                {records.map((record) => (
                    <li key={record.id} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-soft ring-1 ring-ink-100">
                        <div className="w-12 shrink-0 text-center">
                            <p className="text-lg font-bold leading-none text-ink-900">{new Date(record.date).getUTCDate()}</p>
                            <p className="mt-0.5 text-[11px] font-semibold uppercase text-ink-400">
                                {new Date(record.date).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })}
                            </p>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-900">{record.subject?.name ?? 'Journée entière'}</p>
                            {record.justification && <p className="truncate text-xs text-ink-500">{record.justification}</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tones[record.status]?.chip ?? 'bg-ink-100 text-ink-600'}`}>
                            {attendanceLabels[record.status] ?? record.status}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-soft ring-1 ring-ink-100 md:block">
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
                        {records.map((record) => (
                            <tr key={record.id}>
                                <td className="px-5 py-3 text-ink-700">{new Date(record.date).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}</td>
                                <td className="px-5 py-3 text-ink-600">{record.subject?.name ?? 'Journée entière'}</td>
                                <td className="px-5 py-3">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[record.status]?.chip ?? 'bg-ink-100 text-ink-600'}`}>
                                        {attendanceLabels[record.status] ?? record.status}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-ink-500">{record.justification ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
