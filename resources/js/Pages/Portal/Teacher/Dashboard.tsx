import PortalLayout, { PortalNavItem } from '@/Layouts/PortalLayout';
import Card from '@/Components/Admin/Card';
import { Exam, TimetableEntry } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Calendar, ClipboardList, Clock, MapPin, Users } from 'lucide-react';

export const teacherNav: PortalNavItem[] = [
    { label: 'Tableau de bord', href: 'teacher.dashboard', active: (c) => c === 'teacher.dashboard' },
    { label: 'Mes classes', href: 'teacher.classes', active: (c) => c === 'teacher.classes' },
    { label: 'Emploi du temps', href: 'teacher.timetable', active: (c) => c === 'teacher.timetable' },
    { label: 'Cahier de texte', href: 'teacher.lesson-log.index', active: (c) => c.startsWith('teacher.lesson-log') },
    { label: 'Présences', href: 'teacher.attendance.index', active: (c) => c.startsWith('teacher.attendance') },
    { label: 'Congés', href: 'teacher.leave.index', active: (c) => c.startsWith('teacher.leave') },
    { label: 'Compétences', href: 'teacher.skills.index', active: (c) => c.startsWith('teacher.skills') },
    { label: 'Bibliothèque', href: 'teacher.library.index', active: (c) => c.startsWith('teacher.library') },
    { label: 'Devoirs', href: 'teacher.exams.index', active: (c) => c.startsWith('teacher.exams') },
    { label: 'EEHT Connect', href: 'connect.index', active: (c) => c.startsWith('connect.') },
];

interface Props {
    teacher: { first_name: string; last_name: string; subjects?: { id: number; name: string }[] };
    classes: { id: number; name: string; students_count: number }[];
    upcomingExams: (Exam & { schoolClass?: { id: number; name: string }; subject?: { id: number; name: string } })[];
    entriesToday: TimetableEntry[];
}

export default function Dashboard({ teacher, classes, upcomingExams, entriesToday }: Props) {
    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mon espace" />

            <div className="mb-8">
                <h1 className="font-serif text-2xl font-bold text-ink-900">
                    Bonjour {teacher.first_name} 👋
                </h1>
                <p className="mt-1 text-sm text-ink-500">
                    {teacher.subjects?.map((s) => s.name).join(', ') || 'Aucune matière assignée'}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ink-900">{classes.length}</p>
                            <p className="text-sm text-ink-500">Classes encadrées</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-100 text-gold-800">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ink-900">{upcomingExams.length}</p>
                            <p className="text-sm text-ink-500">Épreuves à venir</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <Clock className="h-5 w-5 text-gold-600" /> Aujourd'hui
                    </h2>
                    {entriesToday.length === 0 && <p className="text-sm text-ink-400">Aucun cours aujourd'hui.</p>}
                    <ul className="space-y-2">
                        {entriesToday.map((entry) => (
                            <li key={entry.id} className="rounded-lg border border-ink-100 p-3">
                                <p className="text-sm font-semibold text-ink-900">
                                    {entry.subject?.name} — {entry.schoolClass?.name}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-500">
                                    <span>
                                        {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                    </span>
                                    {entry.room && (
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" /> {entry.room.name}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card className="p-5">
                    <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <Calendar className="h-5 w-5 text-gold-600" /> Prochaines épreuves
                    </h2>
                    {upcomingExams.length === 0 && <p className="text-sm text-ink-400">Aucune épreuve programmée.</p>}
                    <ul className="space-y-2">
                        {upcomingExams.map((exam) => (
                            <li
                                key={exam.id}
                                className="flex items-center justify-between rounded-lg border border-ink-100 p-3"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-ink-900">{exam.title}</p>
                                    <p className="text-xs text-ink-500">
                                        {exam.schoolClass?.name} · {new Date(exam.exam_date).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                                <Link
                                    href={route('teacher.exams.grades', exam.id)}
                                    className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-800"
                                >
                                    Saisir les notes
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </PortalLayout>
    );
}
