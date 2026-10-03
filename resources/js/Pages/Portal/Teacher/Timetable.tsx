import DayPager from '@/Components/Portal/DayPager';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import PortalLayout from '@/Layouts/PortalLayout';
import { PortalEntry } from '@/lib/portal';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Head } from '@inertiajs/react';
import { Download } from 'lucide-react';

interface Props {
    entries: PortalEntry[];
    days: Record<string, string>;
}

export default function Timetable({ entries, days }: Props) {
    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mon emploi du temps" />

            <PortalPageHeader
                title="Mon emploi du temps"
                action={
                    <a
                        href={route('teacher.timetable.pdf')}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Télécharger l'emploi du temps en PDF"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition-colors active:bg-ink-800 lg:hover:bg-ink-800"
                    >
                        <Download className="h-4 w-4" /> PDF
                    </a>
                }
            />

            <DayPager entries={entries} days={days} showClass />
        </PortalLayout>
    );
}
