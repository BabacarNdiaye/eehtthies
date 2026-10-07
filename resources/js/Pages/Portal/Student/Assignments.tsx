import Card from '@/Components/Admin/Card';
import RichTextView from '@/Components/RichText/RichTextView';
import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import { Head } from '@inertiajs/react';
import { Home } from 'lucide-react';

interface Assignment {
    id: number;
    title: string;
    instructions: string | null;
    given_on: string;
    due_date: string;
    subject?: { name: string } | null;
    teacher?: { first_name: string; last_name: string } | null;
}

const day = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });

export default function Assignments({ assignments }: { assignments: Assignment[] }) {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = assignments.filter((a) => a.due_date.slice(0, 10) >= today).reverse();
    const past = assignments.filter((a) => a.due_date.slice(0, 10) < today);

    const list = (items: Assignment[], late = false) =>
        items.map((a) => (
            <Card key={a.id} className={`p-4 ${late ? 'opacity-70' : ''}`}>
                <p className="flex items-center gap-2 font-semibold text-ink-900">
                    <Home className="h-4 w-4 shrink-0 text-gold-600" /> {a.title}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                    {[a.subject?.name, a.teacher ? `${a.teacher.first_name} ${a.teacher.last_name}` : null].filter(Boolean).join(' · ')} · pour le {day(a.due_date)}
                </p>
                <RichTextView html={a.instructions} className="mt-2 text-sm" />
            </Card>
        ));

    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Travaux à la maison" />
            <div className="mb-6">
                <h1 className="hidden font-serif text-2xl font-bold text-ink-900 lg:block">Travaux à la maison</h1>
                <p className="mt-1 text-sm text-ink-500">Les travaux donnés par vos enseignants.</p>
            </div>

            {assignments.length === 0 && <Card className="p-8 text-center text-sm text-ink-400">Aucun travail à faire à la maison.</Card>}
            <div className="space-y-3">{list(upcoming)}</div>
            {past.length > 0 && (
                <>
                    <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-500">Échéances passées</h2>
                    <div className="space-y-3">{list(past, true)}</div>
                </>
            )}
        </PortalLayout>
    );
}
