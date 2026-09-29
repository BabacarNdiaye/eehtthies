import PortalLayout, { PortalNavItem } from '@/Layouts/PortalLayout';
import Card from '@/Components/Admin/Card';
import { ReportCard, Student } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Award, Calendar, ClipboardCheck, GraduationCap, MessageCircle, QrCode, Receipt } from 'lucide-react';

export const studentNav: PortalNavItem[] = [
    { label: 'Tableau de bord', href: 'student.dashboard', active: (c) => c === 'student.dashboard' },
    { label: 'Emploi du temps', href: 'student.timetable', active: (c) => c === 'student.timetable' },
    { label: 'Notes & bulletins', href: 'student.grades', active: (c) => c === 'student.grades' },
    { label: 'Présences', href: 'student.attendance', active: (c) => c === 'student.attendance' },
    { label: 'Factures', href: 'student.invoices', active: (c) => c === 'student.invoices' },
    { label: 'EEHT Connect', href: 'connect.index', active: (c) => c.startsWith('connect.') },
    { label: 'Bibliothèque', href: 'student.library', active: (c) => c === 'student.library' },
];

const quickActions = [
    { label: 'Emploi\ndu temps', href: 'student.timetable', icon: Calendar },
    { label: 'Notes', href: 'student.grades', icon: GraduationCap },
    { label: 'Présences', href: 'student.attendance', icon: ClipboardCheck },
    { label: 'Factures', href: 'student.invoices', icon: Receipt },
    { label: 'EEHT\nConnect', href: 'connect.index', icon: MessageCircle },
];

interface Props {
    student: Student & { formation?: { id: number; name: string }; academicYear?: { id: number; label: string } };
    upcomingCount: number;
    latestReportCard: ReportCard | null;
    attendanceStats: Record<string, number>;
    qrCode: string;
}

export default function Dashboard({ student, upcomingCount, latestReportCard, attendanceStats, qrCode }: Props) {
    const totalAttendance = Object.values(attendanceStats).reduce((a, b) => a + b, 0);
    const absences = (attendanceStats.absent ?? 0) + (attendanceStats.absence_justifiee ?? 0);

    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mon espace" />

            <div className="relative -mx-4 -mt-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-ink-950 via-ink-900 to-[#6b1338] px-6 pb-14 pt-8 sm:-mx-6 sm:rounded-b-[2.5rem]">
                <div className="pointer-events-none absolute -right-8 top-4 h-32 w-32 rounded-full bg-gold-400/10 blur-2xl" />
                <p className="text-sm text-gold-300/80">Bienvenue</p>
                <h1 className="mt-1 font-serif text-2xl font-bold text-white">
                    {student.first_name} {student.last_name} 👋
                </h1>
                <p className="mt-1 text-sm text-white/60">
                    {student.formation?.name} {student.school_class ? `— ${student.school_class.name}` : ''}{' '}
                    {student.academic_year ? `· ${student.academic_year.label}` : ''}
                </p>
            </div>

            <div className="relative z-10 -mt-8 flex justify-center px-2">
                <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-lg">
                    <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink-400">
                        <QrCode className="h-3.5 w-3.5" />
                        Mon badge
                    </p>
                    <img
                        src={`data:image/svg+xml;base64,${qrCode}`}
                        alt="Mon QR code"
                        className="mx-auto mt-3 h-40 w-40 rounded-lg border border-ink-100 p-2"
                    />
                    <p className="mt-3 text-sm font-semibold text-ink-800">{student.matricule}</p>
                    <p className="mt-1 text-xs text-ink-400">À présenter à l'entrée de l'établissement pour le pointage</p>
                </div>
            </div>

            <div className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                {quickActions.map((action) => (
                    <Link
                        key={action.href}
                        href={route(action.href)}
                        className="flex flex-col items-center gap-2 rounded-2xl bg-white p-2.5 text-center shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-700 sm:h-12 sm:w-12">
                            <action.icon className="h-5 w-5" />
                        </span>
                        <span className="whitespace-pre-line text-[11px] font-medium leading-tight text-ink-700 sm:text-xs">
                            {action.label}
                        </span>
                    </Link>
                ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ink-900">{upcomingCount}</p>
                            <p className="text-sm text-ink-500">Cours cette semaine</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-100 text-gold-800">
                            <Award className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ink-900">
                                {latestReportCard?.average != null ? Number(latestReportCard.average).toFixed(2) : '—'}
                            </p>
                            <p className="text-sm text-ink-500">Dernière moyenne ({latestReportCard?.term ?? '—'})</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
                            <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ink-900">
                                {absences} / {totalAttendance}
                            </p>
                            <p className="text-sm text-ink-500">Absences enregistrées</p>
                        </div>
                    </div>
                </Card>
            </div>
        </PortalLayout>
    );
}
