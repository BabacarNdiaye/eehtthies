import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import Card from '@/Components/Admin/Card';
import { TimetableEntry } from '@/types';
import { Head } from '@inertiajs/react';
import { Clock, MapPin, User, Download } from 'lucide-react';

interface Props {
    entries: TimetableEntry[];
    days: Record<string, string>;
    schoolClassName?: string | null;
    schoolClassId?: number | null;
}

export default function Timetable({ entries, days, schoolClassName, schoolClassId }: Props) {
    const byDay = Object.keys(days)
        .map(Number)
        .sort((a, b) => a - b)
        .map((day) => ({
            day,
            label: days[day],
            items: entries.filter((e) => e.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time)),
        }));

    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mon emploi du temps" />
            <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                    <h1 className="mb-1 font-serif text-2xl font-bold text-ink-900">Mon emploi du temps</h1>
                    <p className="text-sm text-ink-500">{schoolClassName ?? 'Aucune classe assignée pour le moment.'}</p>
                </div>
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {byDay.map(({ day, label, items }) => (
                    <Card key={day} className="p-5">
                        <h3 className="mb-3 font-serif text-base font-bold text-ink-900">{label}</h3>
                        {items.length === 0 && <p className="text-sm text-ink-400">Aucun cours programmé.</p>}
                        <ul className="space-y-2">
                            {items.map((entry) => (
                                <li key={entry.id} className="rounded-lg border border-ink-100 p-3">
                                    <p className="text-sm font-semibold text-ink-900">{entry.subject?.name}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                        </span>
                                        {entry.teacher && (
                                            <span className="inline-flex items-center gap-1">
                                                <User className="h-3.5 w-3.5" />
                                                {entry.teacher.first_name} {entry.teacher.last_name}
                                            </span>
                                        )}
                                        {entry.room && (
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {entry.room.name}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                ))}
            </div>
        </PortalLayout>
    );
}
