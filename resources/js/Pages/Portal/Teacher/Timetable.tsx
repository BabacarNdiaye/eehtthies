import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import Card from '@/Components/Admin/Card';
import { TimetableEntry } from '@/types';
import { Head } from '@inertiajs/react';
import { Clock, MapPin, Download } from 'lucide-react';

interface Props {
    entries: (TimetableEntry & { schoolClass?: { id: number; name: string } | null })[];
    days: Record<string, string>;
}

export default function Timetable({ entries, days }: Props) {
    const byDay = Object.keys(days)
        .map(Number)
        .sort((a, b) => a - b)
        .map((day) => ({
            day,
            label: days[day],
            items: entries.filter((e) => e.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time)),
        }));

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mon emploi du temps" />
            <h1 className="mb-6 font-serif text-2xl font-bold text-ink-900">Mon emploi du temps</h1>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {byDay.map(({ day, label, items }) => (
                    <Card key={day} className="p-5">
                        <h3 className="mb-3 font-serif text-base font-bold text-ink-900">{label}</h3>
                        {items.length === 0 && <p className="text-sm text-ink-400">Aucun cours programmé.</p>}
                        <ul className="space-y-2">
                            {items.map((entry) => (
                                <li key={entry.id} className="rounded-lg border border-ink-100 p-3">
                                    <p className="text-sm font-semibold text-ink-900">
                                        {entry.subject?.name} — {entry.schoolClass?.name}
                                        {entry.schoolClass?.id ? (
                                            <a
                                                href={`/generate_pdf.php?class_id=${entry.schoolClass.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="ml-3 inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold text-white bg-ink-900 hover:bg-ink-800"
                                            >
                                                <Download className="h-3.5 w-3.5" /> PDF
                                            </a>
                                        ) : null}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                        </span>
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
