import Carousel from '@/Components/Portal/Carousel';
import DayTimeline from '@/Components/Portal/DayTimeline';
import NextClassCard from '@/Components/Portal/NextClassCard';
import PortalHero from '@/Components/Portal/PortalHero';
import SectionTitle from '@/Components/Portal/SectionTitle';
import StatRing from '@/Components/Portal/StatRing';
import SubjectTile from '@/Components/Portal/SubjectTile';
import PortalLayout, { PortalNavItem } from '@/Layouts/PortalLayout';
import { FeedItem, formatAmount, NextClass, PortalEntry, SubjectSummary } from '@/lib/portal';
import { ReportCard, Student } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Wallet } from 'lucide-react';
import { useEffect } from 'react';

export const studentNav: PortalNavItem[] = [
    { label: 'Tableau de bord', href: 'student.dashboard', active: (c) => c === 'student.dashboard' },
    { label: 'Emploi du temps', href: 'student.timetable', active: (c) => c === 'student.timetable' },
    { label: 'Notes & bulletins', href: 'student.grades', active: (c) => c === 'student.grades' },
    { label: 'Présences', href: 'student.attendance', active: (c) => c === 'student.attendance' },
    { label: 'Factures', href: 'student.invoices', active: (c) => c === 'student.invoices' },
    { label: 'EEHT Connect', href: 'connect.index', active: (c) => c.startsWith('connect.') },
    { label: 'Bibliothèque', href: 'student.library', active: (c) => c === 'student.library' },
];

interface Props {
    student: Student;
    latestReportCard: ReportCard | null;
    attendanceStats: Record<string, number>;
    qrCode: string;
    nextClass: NextClass | null;
    todayEntries: PortalEntry[];
    subjects: SubjectSummary[];
    overallAverage: number | null;
    balanceDue: number;
    announcements: FeedItem[];
}

const kpiCard = 'flex flex-col items-center justify-center rounded-3xl bg-white p-4 text-center shadow-soft ring-1 ring-ink-100 transition-transform active:scale-[0.98]';

/** Accueil de l'espace élève : prochain cours, à la une, matières, journée, chiffres clés et carte. */
export default function Dashboard({
    student,
    latestReportCard,
    attendanceStats,
    qrCode,
    nextClass,
    todayEntries,
    subjects,
    overallAverage,
    balanceDue,
    announcements,
}: Props) {
    const totalAttendance = Object.values(attendanceStats).reduce((a, b) => a + b, 0);
    const absences = (attendanceStats.absent ?? 0) + (attendanceStats.absence_justifiee ?? 0);
    const average = overallAverage ?? (latestReportCard?.average != null ? Number(latestReportCard.average) : null);

    // « Ma carte » (onglet central de la barre du bas) arrive ici avec ?card=1.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).has('card')) {
            document.getElementById('carte')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mon espace" />

            <PortalHero
                name={`${student.first_name} ${student.last_name}`}
                lines={[student.formation?.name, [student.school_class?.name, student.academic_year?.label].filter(Boolean).join(' · ')]}
                avatar={student.photo ? `/storage/${student.photo}` : null}
                badge={student.matricule}
            />

            <div className="space-y-8">
                <NextClassCard next={nextClass} timetableHref={route('student.timetable')} />

                <section>
                    <SectionTitle title="À la une" />
                    <Carousel items={announcements} />
                </section>

                <section>
                    <SectionTitle title="Mes matières" href={route('student.grades')} action="Mes notes" />
                    {subjects.length === 0 ? (
                        <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-ink-400 ring-1 ring-ink-100">
                            Vos matières apparaîtront dès que l'emploi du temps de votre classe sera publié.
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
                            {subjects.map((subject) => (
                                <SubjectTile key={subject.id} name={subject.name} average={subject.average} caption={subject.teacher} href={route('student.grades')} />
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <SectionTitle title="Aujourd'hui" href={route('student.timetable')} action="Agenda" />
                    <DayTimeline entries={todayEntries} />
                </section>

                <section>
                    <SectionTitle title="En un coup d'œil" />
                    <div className="grid grid-cols-3 gap-3">
                        <div className={kpiCard}>
                            <StatRing value={average} label="Moyenne" />
                        </div>
                        <Link href={route('student.attendance')} className={kpiCard}>
                            <span
                                className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl font-bold ${
                                    absences > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                }`}
                            >
                                {absences}
                            </span>
                            <span className="mt-1.5 text-[11px] font-medium leading-tight text-ink-500">
                                Absence{absences > 1 ? 's' : ''}
                                <br />
                                sur {totalAttendance} pointage{totalAttendance > 1 ? 's' : ''}
                            </span>
                        </Link>
                        <Link href={route('student.invoices')} className={kpiCard}>
                            <span
                                className={`flex h-[72px] w-[72px] items-center justify-center rounded-full ${
                                    balanceDue > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                }`}
                            >
                                {balanceDue > 0 ? <Wallet className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
                            </span>
                            <span className="mt-1.5 text-[11px] font-medium leading-tight text-ink-500">
                                {balanceDue > 0 ? (
                                    <>
                                        À payer
                                        <br />
                                        <span className="text-xs font-bold text-red-600">{formatAmount(balanceDue)}</span>
                                    </>
                                ) : (
                                    <>
                                        Scolarité
                                        <br />
                                        <span className="text-xs font-bold text-emerald-600">À jour</span>
                                    </>
                                )}
                            </span>
                        </Link>
                    </div>
                </section>

                <section id="carte" className="scroll-mt-20">
                    <SectionTitle title="Ma carte" />
                    <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                        <img
                            src={`data:image/svg+xml;base64,${qrCode}`}
                            alt="Mon code QR de pointage"
                            className="h-28 w-28 shrink-0 rounded-2xl border border-ink-100 p-2"
                        />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Badge d'entrée</p>
                            <p className="font-serif text-lg font-bold text-ink-900">{student.matricule}</p>
                            <p className="mt-1 text-xs text-ink-500">À présenter à l'entrée de l'établissement pour le pointage.</p>
                        </div>
                    </div>
                </section>
            </div>
        </PortalLayout>
    );
}
