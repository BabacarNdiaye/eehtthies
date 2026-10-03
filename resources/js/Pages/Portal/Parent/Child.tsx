import Avatar from '@/Components/Connect/Avatar';
import AttendanceRecords, { AttendanceRow, AttendanceStats } from '@/Components/Portal/AttendanceRecords';
import DayPager from '@/Components/Portal/DayPager';
import GradeList, { GradedExam } from '@/Components/Portal/GradeList';
import InvoiceList from '@/Components/Portal/InvoiceList';
import ReportCardList from '@/Components/Portal/ReportCardList';
import SectionTitle from '@/Components/Portal/SectionTitle';
import Segmented from '@/Components/Portal/Segmented';
import PortalLayout from '@/Layouts/PortalLayout';
import { formatAmount, formatAverage, PortalEntry } from '@/lib/portal';
import { parentNav } from '@/Pages/Portal/Parent/Dashboard';
import { Grade, Invoice, ReportCard, Student } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CalendarDays, ClipboardCheck, GraduationCap, Receipt } from 'lucide-react';
import { useState } from 'react';

type Tab = 'notes' | 'presences' | 'factures' | 'emploi';

const TABS: Tab[] = ['notes', 'presences', 'factures', 'emploi'];

interface Props {
    student: Student;
    attendanceStats: Record<string, number>;
    attendanceRecords: AttendanceRow[];
    reportCards: ReportCard[];
    exams: GradedExam[];
    grades: Record<number, Grade>;
    timetable: PortalEntry[];
    days: Record<string, string>;
    invoices: Invoice[];
    summary: { average: number | null; balance_due: number };
}

/** Onglet demandé par l'adresse (?tab=factures, depuis les raccourcis de l'accueil), « notes » par défaut. */
function initialTab(): Tab {
    const requested = new URLSearchParams(window.location.search).get('tab');

    return TABS.includes(requested as Tab) ? (requested as Tab) : 'notes';
}

function Kpi({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur">
            <p className={`whitespace-nowrap font-bold leading-tight ${value.length > 8 ? 'text-sm' : 'text-lg'}`}>{value}</p>
            <p className="mt-0.5 text-[11px] text-white/70">{label}</p>
        </div>
    );
}

export default function Child({ student, attendanceStats, attendanceRecords, reportCards, exams, grades, timetable, days, invoices, summary }: Props) {
    const [tab, setTab] = useState<Tab>(initialTab);
    const absences = (attendanceStats.absent ?? 0) + (attendanceStats.absence_justifiee ?? 0);
    const name = `${student.first_name} ${student.last_name}`;
    const owing = summary.balance_due > 0;

    return (
        <PortalLayout title="Espace Parent" nav={parentNav}>
            <Head title={name} />

            <Link href={route('parent.dashboard')} className="mb-3 hidden text-sm font-medium text-ink-500 hover:text-ink-800 lg:inline-block">
                ← Mes enfants
            </Link>

            <div className="mb-5 rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-800 p-5 text-white shadow-soft">
                <div className="flex items-center gap-4">
                    <Avatar name={name} src={student.photo ? `/storage/${student.photo}` : null} size="md" />
                    <div className="min-w-0">
                        <h1 className="truncate font-serif text-xl font-bold leading-tight">{name}</h1>
                        <p className="truncate text-sm text-white/70">
                            {[student.formation?.name, student.school_class?.name].filter(Boolean).join(' — ')}
                            {student.academic_year ? ` · ${student.academic_year.label}` : ''}
                        </p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <Kpi value={summary.average != null ? formatAverage(Number(summary.average)) : '—'} label="Moyenne / 20" />
                    <Kpi value={String(absences)} label={`Absence${absences > 1 ? 's' : ''}`} />
                    <Kpi value={owing ? formatAmount(summary.balance_due) : 'À jour'} label={owing ? 'À payer' : 'Scolarité'} />
                </div>
            </div>

            <Segmented
                label="Rubriques de la fiche"
                value={tab}
                onChange={setTab}
                tabs={[
                    { key: 'notes', label: 'Notes', icon: GraduationCap },
                    { key: 'presences', label: 'Présences', icon: ClipboardCheck },
                    { key: 'factures', label: 'Factures', icon: Receipt, badge: owing ? '!' : null },
                    { key: 'emploi', label: 'Agenda', icon: CalendarDays },
                ]}
            />

            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === 'notes' && (
                    <div className="space-y-8">
                        <section>
                            <SectionTitle title="Bulletins" />
                            <ReportCardList reportCards={reportCards} pdfHref={(reportCard) => route('parent.report-cards.pdf', [student.id, reportCard.id])} />
                        </section>
                        <section>
                            <SectionTitle title="Notes récentes" />
                            <GradeList exams={exams} grades={grades} limit={15} />
                        </section>
                    </div>
                )}

                {tab === 'presences' && (
                    <div className="space-y-6">
                        <AttendanceStats stats={attendanceStats} />
                        <section>
                            <SectionTitle title="Derniers pointages" />
                            <AttendanceRecords records={attendanceRecords} />
                        </section>
                    </div>
                )}

                {tab === 'factures' && (
                    <InvoiceList invoices={invoices} receiptHref={(invoice, payment) => route('parent.invoices.receipt', [student.id, invoice.id, payment.id])} />
                )}

                {tab === 'emploi' && <DayPager entries={timetable} days={days} />}
            </div>
        </PortalLayout>
    );
}
