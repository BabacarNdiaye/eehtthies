import FollowUpList, { FollowUpRow } from '@/Components/Council/FollowUpList';
import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Head } from '@inertiajs/react';

/** « Mes actions » de l'enseignant (E10), utilisable au téléphone. */
export default function FollowUps({ followUps, statuses }: { followUps: FollowUpRow[]; statuses: Record<string, string> }) {
    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mes actions de suivi" />
            <h1 className="mb-2 hidden font-serif text-2xl font-bold text-ink-900 lg:block">Mes actions de suivi</h1>
            <p className="mb-6 text-sm text-ink-600">Les actions décidées en conseil de classe dont vous êtes responsable, par échéance.</p>
            <FollowUpList followUps={followUps} statuses={statuses} updateRoute="teacher.follow-ups.update" interviewRoute="teacher.follow-ups.interview" showOwner={false} />
        </PortalLayout>
    );
}
