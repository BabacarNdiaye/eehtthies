import Carousel from '@/Components/Portal/Carousel';
import DayTimeline from '@/Components/Portal/DayTimeline';
import NextClassCard from '@/Components/Portal/NextClassCard';
import { usePortal } from '@/Components/Portal/PortalContext';
import PortalHero from '@/Components/Portal/PortalHero';
import SectionTitle from '@/Components/Portal/SectionTitle';
import StatRing from '@/Components/Portal/StatRing';
import SubjectTile from '@/Components/Portal/SubjectTile';
import useOfflineSnapshot from '@/hooks/useOfflineSnapshot';
import PortalLayout, { PortalNavItem } from '@/Layouts/PortalLayout';
import { toSnapshotEntries } from '@/lib/offline';
import { FeedItem, formatAmount, NextClass, PortalEntry, SubjectSummary } from '@/lib/portal';
import { PageProps, ReportCard, Student } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckCircle2, Maximize2, Wallet } from 'lucide-react';

export const studentNav: PortalNavItem[] = [
    { label: 'Tableau de bord', href: 'student.dashboard', active: (c) => c === 'student.dashboard' },
    { label: 'Emploi du temps', href: 'student.timetable', active: (c) => c === 'student.timetable' },
    { label: 'Notes & bulletins', href: 'student.grades', active: (c) => c === 'student.grades' },
    { label: 'Travaux maison', href: 'student.assignments', active: (c) => c === 'student.assignments' },
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
    weekEntries: PortalEntry[];
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
    weekEntries,
    subjects,
    overallAverage,
    balanceDue,
    announcements,
}: Props) {
    const totalAttendance = Object.values(attendanceStats).reduce((a, b) => a + b, 0);
    const absences = (attendanceStats.absent ?? 0) + (attendanceStats.absence_justifiee ?? 0);
    const average = overallAverage ?? (latestReportCard?.average != null ? Number(latestReportCard.average) : null);
    const { auth } = usePage<PageProps>().props;
    const name = `${student.first_name} ${student.last_name}`;

    // Mode hors ligne : l'emploi du temps de la semaine et la carte restent consultables sans réseau.
    useOfflineSnapshot({
        userId: auth.user?.id ?? 0,
        role: 'student',
        name,
        subtitle: [student.formation?.name, student.school_class?.name].filter(Boolean).join(' — ') || null,
        week: toSnapshotEntries(weekEntries, false),
        card: {
            name,
            matricule: student.matricule,
            formation: student.formation?.name ?? null,
            class_name: student.school_class?.name ?? null,
            academic_year: student.academic_year?.label ?? null,
            photo: student.photo ? `/storage/${student.photo}` : null,
            qr: qrCode,
        },
    });

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
                                        <span className="text-xs font-bold text-red-700">{formatAmount(balanceDue)}</span>
                                    </>
                                ) : (
                                    <>
                                        Scolarité
                                        <br />
                                        <span className="text-xs font-bold text-emerald-700">À jour</span>
                                    </>
                                )}
                            </span>
                        </Link>
                    </div>
                </section>

                <CardSection qrCode={qrCode} matricule={student.matricule} />
            </div>
        </PortalLayout>
    );
}

/** Aperçu de la carte d'étudiant ; le bouton l'ouvre en plein écran (carte retournable, écran maintenu allumé). */
function CardSection({ qrCode, matricule }: { qrCode: string; matricule: string }) {
    const { openCard } = usePortal();

    return (
        <section id="carte">
            <SectionTitle title="Ma carte" />
            <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                <div className="flex items-center gap-4">
                    <img src={`data:image/svg+xml;base64,${qrCode}`} alt="Mon code QR de pointage" className="h-28 w-28 shrink-0 rounded-2xl border border-ink-100 p-2" />
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Badge d'entrée</p>
                        <p className="font-serif text-lg font-bold text-ink-900">{matricule}</p>
                        <p className="mt-1 text-xs text-ink-500">À présenter à l'entrée de l'établissement pour le pointage.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={openCard}
                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink-900 text-sm font-semibold text-white transition-colors active:bg-ink-800 lg:w-auto lg:px-8"
                >
                    <Maximize2 className="h-4 w-4" /> Afficher en plein écran
                </button>
            </div>
        </section>
    );
}
