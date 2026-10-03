import Carousel from '@/Components/Portal/Carousel';
import DayTimeline from '@/Components/Portal/DayTimeline';
import NextClassCard from '@/Components/Portal/NextClassCard';
import PortalHero from '@/Components/Portal/PortalHero';
import SectionTitle from '@/Components/Portal/SectionTitle';
import useOfflineSnapshot from '@/hooks/useOfflineSnapshot';
import PortalLayout, { PortalNavItem } from '@/Layouts/PortalLayout';
import { toSnapshotEntries } from '@/lib/offline';
import { FeedItem, gradientFor, navIcon, NextClass, PortalEntry } from '@/lib/portal';
import { Exam, PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Users } from 'lucide-react';

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

// Raccourcis de l'accueil : les rubriques d'usage quotidien, en grille d'icônes.
const shortcuts = [
    { label: 'Devoirs', href: 'teacher.exams.index' },
    { label: 'Cahier de texte', href: 'teacher.lesson-log.index' },
    { label: 'Présences', href: 'teacher.attendance.index' },
    { label: 'Congés', href: 'teacher.leave.index' },
    { label: 'Compétences', href: 'teacher.skills.index' },
    { label: 'Bibliothèque', href: 'teacher.library.index' },
];

interface Props {
    teacher: { first_name: string; last_name: string; subjects?: { id: number; name: string }[] };
    classes: { id: number; name: string; students_count: number }[];
    // Laravel sérialise les relations en snake_case (`school_class`), pas en camelCase.
    upcomingExams: (Exam & { school_class?: { id: number; name: string } | null; subject?: { id: number; name: string } | null })[];
    entriesToday: PortalEntry[];
    weekEntries: PortalEntry[];
    nextClass: NextClass | null;
    announcements: FeedItem[];
}

/** Accueil de l'espace enseignant : prochain cours et appel, à la une, classes, raccourcis et journée. */
export default function Dashboard({ teacher, classes, upcomingExams, entriesToday, weekEntries, nextClass, announcements }: Props) {
    const { auth, portalProfile } = usePage<PageProps>().props;

    // Mode hors ligne : l'emploi du temps de la semaine reste consultable sans réseau.
    useOfflineSnapshot({
        userId: auth.user?.id ?? 0,
        role: 'teacher',
        name: `${teacher.first_name} ${teacher.last_name}`,
        subtitle: portalProfile?.subtitle ?? null,
        week: toSnapshotEntries(weekEntries, true),
    });

    // « Faire l'appel » ouvre directement la classe et la matière du cours affiché, à la date du cours.
    const attendanceHref =
        nextClass?.entry.school_class_id && nextClass.entry.subject_id
            ? route('teacher.attendance.index', {
                  school_class_id: nextClass.entry.school_class_id,
                  subject_id: nextClass.entry.subject_id,
                  date: nextClass.starts_at.slice(0, 10),
              })
            : route('teacher.attendance.index');

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Mon espace" />

            <PortalHero
                name={`${teacher.first_name} ${teacher.last_name}`}
                lines={[teacher.subjects?.map((subject) => subject.name).join(', ') || 'Aucune matière assignée']}
                avatar={portalProfile?.photo}
                badge={portalProfile?.matricule}
            />

            <div className="space-y-8">
                <NextClassCard next={nextClass} attendanceHref={attendanceHref} timetableHref={route('teacher.timetable')} />

                <section>
                    <SectionTitle title="À la une" />
                    <Carousel items={announcements} />
                </section>

                <section>
                    <SectionTitle title="Mes classes" href={route('teacher.classes')} />
                    {classes.length === 0 ? (
                        <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-ink-400 ring-1 ring-ink-100">
                            Vos classes apparaîtront dès que votre emploi du temps sera publié.
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
                            {classes.map((schoolClass) => (
                                <Link key={schoolClass.id} href={route('teacher.classes')} className="group flex flex-col items-center gap-2 rounded-3xl text-center outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
                                    <span
                                        className={`relative flex aspect-square w-full max-w-[104px] items-center justify-center rounded-3xl bg-gradient-to-br ${gradientFor(schoolClass.name)} text-white shadow-md transition-transform duration-200 group-active:scale-95`}
                                    >
                                        <Users className="h-9 w-9" strokeWidth={1.9} />
                                        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink-800 shadow">
                                            {schoolClass.students_count}
                                        </span>
                                    </span>
                                    <span className="line-clamp-2 text-xs font-semibold leading-tight text-ink-800">{schoolClass.name}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <SectionTitle title="Raccourcis" />
                    <ul className="grid grid-cols-3 gap-x-3 gap-y-5 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-ink-100 lg:grid-cols-6">
                        {shortcuts.map((shortcut) => {
                            const Icon = navIcon(shortcut.href);

                            return (
                                <li key={shortcut.href}>
                                    <Link href={route(shortcut.href)} className="flex flex-col items-center gap-2 rounded-2xl text-center outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-gold-500">
                                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-leaf-200 bg-leaf-50 text-leaf-800">
                                            <Icon className="h-6 w-6" />
                                        </span>
                                        <span className="text-xs font-medium leading-tight text-ink-700">{shortcut.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section>
                    <SectionTitle title="Aujourd'hui" href={route('teacher.timetable')} action="Agenda" />
                    <DayTimeline entries={entriesToday} showClass />
                </section>

                <section>
                    <SectionTitle title="Prochaines épreuves" href={route('teacher.exams.index')} />
                    {upcomingExams.length === 0 ? (
                        <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-ink-400 ring-1 ring-ink-100">Aucune épreuve programmée.</p>
                    ) : (
                        <ul className="space-y-2.5">
                            {upcomingExams.map((exam) => (
                                <li key={exam.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink-900">{exam.title}</p>
                                        <p className="text-xs text-ink-500">
                                            {exam.school_class?.name} · {new Date(exam.exam_date).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <Link
                                        href={route('teacher.exams.grades', exam.id)}
                                        className="shrink-0 rounded-xl bg-ink-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors active:bg-ink-800"
                                    >
                                        Saisir les notes
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </PortalLayout>
    );
}
