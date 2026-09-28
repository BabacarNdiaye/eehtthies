import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import Card from '@/Components/Admin/Card';
import { SchoolClass, Student } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { MessageSquare } from 'lucide-react';

type ClassWithStudents = SchoolClass & {
    formation?: { id: number; name: string } | null;
    students: Student[];
};

export default function Classes({ classes }: { classes: ClassWithStudents[] }) {
    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mes classes" />
            <h1 className="mb-6 font-serif text-2xl font-bold text-ink-900">Mes classes</h1>

            <div className="space-y-6">
                {classes.map((c) => (
                    <Card key={c.id} className="overflow-hidden">
                        <div className="flex items-center justify-between border-b border-ink-100 p-5">
                            <div>
                                <h2 className="font-serif text-lg font-semibold text-ink-900">{c.name}</h2>
                                <p className="text-sm text-ink-500">
                                    {c.formation?.name} · {c.students.length} élève(s)
                                </p>
                            </div>
                            <Link
                                href={route('teacher.class-discussion', c.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
                            >
                                <MessageSquare className="h-4 w-4" /> Discussion
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3">Matricule</th>
                                        <th className="px-5 py-3">Nom</th>
                                        <th className="px-5 py-3">Contact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {c.students.map((s) => (
                                        <tr key={s.id}>
                                            <td className="px-5 py-3 text-ink-600">{s.matricule}</td>
                                            <td className="px-5 py-3 font-medium text-ink-900">
                                                {s.first_name} {s.last_name}
                                            </td>
                                            <td className="px-5 py-3 text-ink-500">{s.phone ?? s.email ?? '—'}</td>
                                        </tr>
                                    ))}
                                    {c.students.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-8 text-center text-ink-400">
                                                Aucun élève actif dans cette classe.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ))}
                {classes.length === 0 && (
                    <Card className="p-10 text-center text-ink-400">
                        Aucune classe ne vous est encore assignée dans l'emploi du temps.
                    </Card>
                )}
            </div>
        </PortalLayout>
    );
}
