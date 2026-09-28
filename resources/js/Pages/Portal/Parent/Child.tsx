import PortalLayout from '@/Layouts/PortalLayout';
import { parentNav } from '@/Pages/Portal/Parent/Dashboard';
import Card from '@/Components/Admin/Card';
import { Exam, Grade, Invoice, ReportCard, Student, TimetableEntry } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Award, Clock, Download, MapPin, Receipt } from 'lucide-react';

const invoiceStatusStyles: Record<string, string> = {
    payee: 'bg-emerald-100 text-emerald-700',
    partielle: 'bg-amber-100 text-amber-700',
    impayee: 'bg-red-100 text-red-700',
};

const invoiceStatusLabels: Record<string, string> = {
    payee: 'Payée',
    partielle: 'Partielle',
    impayee: 'Impayée',
};

function formatAmount(value: string | number) {
    return new Intl.NumberFormat('fr-FR').format(Number(value)) + ' FCFA';
}

const decisionStyles: Record<string, string> = {
    admis: 'bg-emerald-100 text-emerald-700',
    redouble: 'bg-red-100 text-red-700',
    rattrapage: 'bg-purple-100 text-purple-700',
    non_defini: 'bg-ink-100 text-ink-500',
};

const decisionLabels: Record<string, string> = {
    admis: 'Admis(e) en classe supérieure',
    redouble: 'Autorisé(e) à redoubler',
    exclu: 'Exclusion',
    rattrapage: 'Rattrapage',
    non_defini: 'Non défini',
};

interface Props {
    student: Student;
    attendanceStats: Record<string, number>;
    reportCards: ReportCard[];
    exams: (Exam & { subject?: { id: number; name: string } })[];
    grades: Record<number, Grade>;
    timetable: TimetableEntry[];
    days: Record<string, string>;
    invoices: Invoice[];
}

export default function Child({ student, attendanceStats, reportCards, exams, grades, timetable, days, invoices }: Props) {
    const totalDue = invoices.reduce((sum, inv) => sum + (inv.computed_balance ?? 0), 0);
    const totalAttendance = Object.values(attendanceStats).reduce((a, b) => a + b, 0);
    const absences = (attendanceStats.absent ?? 0) + (attendanceStats.absence_justifiee ?? 0);

    const byDay = Object.keys(days)
        .map(Number)
        .sort((a, b) => a - b)
        .map((day) => ({
            day,
            label: days[day],
            items: timetable
                .filter((e) => e.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time)),
        }));

    return (
        <PortalLayout title="Espace Parent" nav={parentNav}>
            <Head title={`${student.first_name} ${student.last_name}`} />

            <div className="mb-6">
                <Link href={route('parent.dashboard')} className="text-sm font-medium text-ink-500 hover:text-ink-800">
                    ← Mes enfants
                </Link>
                <h1 className="mt-2 font-serif text-2xl font-bold text-ink-900">
                    {student.first_name} {student.last_name}
                </h1>
                <p className="text-sm text-ink-500">
                    {student.formation?.name} {student.school_class ? `— ${student.school_class.name}` : ''}{' '}
                    {student.academic_year ? `· ${student.academic_year.label}` : ''}
                </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-ink-900">{reportCards[0]?.average != null ? Number(reportCards[0].average).toFixed(2) : '—'}</p>
                    <p className="text-xs text-ink-500">Dernière moyenne</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-ink-900">{absences}</p>
                    <p className="text-xs text-ink-500">Absences</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-ink-900">{attendanceStats.retard ?? 0}</p>
                    <p className="text-xs text-ink-500">Retards</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-ink-900">{totalAttendance}</p>
                    <p className="text-xs text-ink-500">Jours enregistrés</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="overflow-hidden">
                    <div className="border-b border-ink-100 p-5">
                        <h2 className="font-serif text-lg font-semibold text-ink-900">Bulletins</h2>
                    </div>
                    <ul className="divide-y divide-ink-100">
                        {reportCards.map((rc) => (
                            <li key={rc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-100 text-gold-800">
                                        <Award className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-ink-900">{rc.term}</p>
                                        <p className="text-xs text-ink-500">
                                            {rc.average != null ? Number(rc.average).toFixed(2) : '—'} / 20
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${decisionStyles[rc.decision]}`}
                                    >
                                        {decisionLabels[rc.decision]}
                                    </span>
                                    <a
                                        href={route('parent.report-cards.pdf', [student.id, rc.id])}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-ink-800"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            </li>
                        ))}
                        {reportCards.length === 0 && (
                            <li className="px-5 py-8 text-center text-ink-400">Aucun bulletin publié pour le moment.</li>
                        )}
                    </ul>
                </Card>

                <Card className="overflow-hidden">
                    <div className="border-b border-ink-100 p-5">
                        <h2 className="font-serif text-lg font-semibold text-ink-900">Notes récentes</h2>
                    </div>
                    <ul className="divide-y divide-ink-100">
                        {exams.slice(0, 8).map((exam) => {
                            const grade = grades[exam.id];
                            return (
                                <li key={exam.id} className="flex items-center justify-between px-5 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-ink-900">{exam.title}</p>
                                        <p className="text-xs text-ink-500">{exam.subject?.name}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-ink-900">
                                        {grade?.is_absent ? 'Absent(e)' : grade?.score != null ? `${grade.score}/${exam.max_score}` : '—'}
                                    </p>
                                </li>
                            );
                        })}
                        {exams.length === 0 && (
                            <li className="px-5 py-8 text-center text-ink-400">Aucune note publiée pour le moment.</li>
                        )}
                    </ul>
                </Card>
            </div>

            <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">Factures</h2>
                    {totalDue > 0 && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Solde à régler : {formatAmount(totalDue)}
                        </span>
                    )}
                </div>
                {invoices.length === 0 ? (
                    <Card className="p-8 text-center text-ink-400">Aucune facture pour le moment.</Card>
                ) : (
                    <div className="space-y-3">
                        {invoices.map((invoice) => (
                            <Card key={invoice.id} className="p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{invoice.reference}</p>
                                        <p className="mt-0.5 text-sm font-semibold text-ink-900">{invoice.label}</p>
                                        {invoice.due_date && (
                                            <p className="mt-0.5 text-xs text-ink-500">
                                                Échéance {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                                            </p>
                                        )}
                                    </div>
                                    <span
                                        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                                            invoiceStatusStyles[invoice.computed_status ?? 'impayee']
                                        }`}
                                    >
                                        {invoiceStatusLabels[invoice.computed_status ?? 'impayee']}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-ink-100 pt-3">
                                    <div>
                                        <p className="text-xs text-ink-400">Montant</p>
                                        <p className="text-sm font-semibold text-ink-900">{formatAmount(invoice.amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-ink-400">Payé</p>
                                        <p className="text-sm font-semibold text-emerald-700">{formatAmount(invoice.computed_paid ?? 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-ink-400">Restant</p>
                                        <p className={`text-sm font-semibold ${(invoice.computed_balance ?? 0) > 0 ? 'text-red-700' : 'text-ink-900'}`}>
                                            {formatAmount(invoice.computed_balance ?? 0)}
                                        </p>
                                    </div>
                                </div>
                                {invoice.payments && invoice.payments.length > 0 && (
                                    <ul className="mt-3 space-y-1 border-t border-ink-100 pt-3">
                                        {invoice.payments.map((payment) => (
                                            <li key={payment.id} className="flex items-center justify-between text-xs text-ink-600">
                                                <span>
                                                    {new Date(payment.paid_at).toLocaleDateString('fr-FR')} — {formatAmount(payment.amount)}
                                                </span>
                                                <a
                                                    href={route('parent.invoices.receipt', [student.id, invoice.id, payment.id])}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 font-semibold text-gold-700 hover:text-gold-600"
                                                >
                                                    <Receipt className="h-3.5 w-3.5" /> Reçu
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-6">
                <h2 className="mb-3 font-serif text-lg font-semibold text-ink-900">Emploi du temps</h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {byDay.map(({ day, label, items }) => (
                        <Card key={day} className="p-5">
                            <h3 className="mb-3 font-serif text-base font-bold text-ink-900">{label}</h3>
                            {items.length === 0 && <p className="text-sm text-ink-400">Aucun cours programmé.</p>}
                            <ul className="space-y-2">
                                {items.map((entry) => (
                                    <li key={entry.id} className="rounded-lg border border-ink-100 p-3">
                                        <p className="text-sm font-semibold text-ink-900">{entry.subject?.name}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                            </span>
                                            {entry.room && (
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {entry.room.name}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    ))}
                </div>
            </div>
        </PortalLayout>
    );
}
