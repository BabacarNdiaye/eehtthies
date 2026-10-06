import Card from '@/Components/Admin/Card';
import CouncilStatusBadge from '@/Components/Council/CouncilStatusBadge';
import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Scale } from 'lucide-react';

interface CouncilRow {
    id: number;
    class: string | null;
    term: string;
    year: string | null;
    scheduled_at: string | null;
    room: string | null;
    status: string;
    status_label: string;
    function_label: string;
}

export default function Index({ councils }: { councils: CouncilRow[] }) {
    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mes conseils de classe" />
            <h1 className="mb-6 hidden font-serif text-2xl font-bold text-ink-900 lg:block">Mes conseils de classe</h1>

            {councils.length === 0 ? (
                <Card className="flex flex-col items-center gap-3 p-10 text-center text-ink-500">
                    <Scale className="h-8 w-8" aria-hidden="true" />
                    <p className="text-sm">Vous ne siégez à aucun conseil de classe pour le moment.</p>
                </Card>
            ) : (
                <ul className="space-y-3">
                    {councils.map((council) => (
                        <li key={council.id}>
                            <Link
                                href={route('teacher.councils.show', council.id)}
                                className="flex items-center gap-4 rounded-xl border border-ink-100 bg-white p-4 shadow-soft outline-none transition hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-gold-500"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-ink-900">
                                        {council.class} · {council.term}
                                    </p>
                                    <p className="text-sm text-ink-600">
                                        {council.scheduled_at ? new Date(council.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date à fixer'}
                                        {council.room ? ` · ${council.room}` : ''}
                                    </p>
                                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                                        <CouncilStatusBadge status={council.status} label={council.status_label} />
                                        {council.function_label}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </PortalLayout>
    );
}
