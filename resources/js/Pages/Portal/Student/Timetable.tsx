import DayPager from '@/Components/Portal/DayPager';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import PortalLayout from '@/Layouts/PortalLayout';
import { PortalEntry } from '@/lib/portal';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import { Head } from '@inertiajs/react';
import { Download } from 'lucide-react';

interface Props {
    entries: PortalEntry[];
    days: Record<string, string>;
    schoolClassName?: string | null;
    schoolClassId?: number | null;
}

export default function Timetable({ entries, days, schoolClassName, schoolClassId }: Props) {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mon emploi du temps" />

            <PortalPageHeader
                title="Mon emploi du temps"
                subtitle={schoolClassName ?? 'Aucune classe assignée pour le moment.'}
                action={
                    schoolClassId ? (
                        <a
                            href={route('student.timetable.pdf')}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Télécharger l'emploi du temps en PDF"
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition-colors active:bg-ink-800 lg:hover:bg-ink-800"
                        >
                            <Download className="h-4 w-4" /> PDF
                        </a>
                    ) : undefined
                }
            />

            <DayPager entries={entries} days={days} />
        </PortalLayout>
    );
}
