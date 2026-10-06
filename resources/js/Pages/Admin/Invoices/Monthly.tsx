import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, Select } from '@/Components/Admin/Field';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { PageProps } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { fcfa } from '@/lib/money';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BellRing, CalendarCheck, HandCoins, Inbox, Settings } from 'lucide-react';
import { useState } from 'react';

interface MonthCell {
    invoice_id: number | null;
    status: 'non_genere' | 'payee' | 'partielle' | 'impayee';
    /** L'échéance est passée et il reste quelque chose à payer. */
    overdue: boolean;
    due_date: string | null;
    balance: number | null;
}

interface StudentRow {
    id: number;
    name: string;
    matricule: string;
    months: Record<string, MonthCell>;
    /** Factures échues de l'élève, toutes années : ce qu'une relance citerait. */
    overdue: { count: number; balance: number };
}

interface Props {
    students: StudentRow[];
    totals: { by_month: Record<string, number>; balance: number; overdue: number };
    formations: { id: number; name: string }[];
    academicYears: { id: number; label: string }[];
    schoolMonths: number[];
    monthLabels: Record<string, string>;
    filters: { formation_id?: string; academic_year_id?: string };
    /** Mensualités sans échéance dont la date peut se calculer. */
    missingDueDates: number;
    /** Jour du mois où une mensualité est due (réglages des paiements). */
    dueDay: number;
}

/** « 2026-09-05 » en « 05/09/2026 », sans passer par un fuseau horaire. */
const shortDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/** « Septembre » devient « Sep. » dans les cartes étroites ; « Mai » et « Juin » restent entiers. */
const abbreviate = (label: string) => (label.length > 4 ? `${label.slice(0, 3)}.` : label);

const emptyCell: MonthCell = { invoice_id: null, status: 'non_genere', overdue: false, due_date: null, balance: null };

const TONES = {
    paid: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    upcoming: 'bg-sky-100 text-sky-700',
    late: 'bg-red-100 text-red-700',
    none: 'bg-ink-50 text-ink-300',
};

/** Ce que dit la case d'un mois : « en retard » (échéance passée) se distingue de « à venir » (échéance devant nous). */
function cellState(cell: MonthCell): { label: string; tone: string } {
    if (cell.status === 'non_genere') return { label: '—', tone: TONES.none };
    if (cell.status === 'payee') return { label: 'Payée', tone: TONES.paid };
    if (cell.overdue) return { label: 'En retard', tone: TONES.late };
    if (cell.status === 'partielle') return { label: 'Partielle', tone: TONES.partial };

    return cell.due_date ? { label: 'À venir', tone: TONES.upcoming } : { label: 'Impayée', tone: TONES.partial };
}

/** Échéance et reste à payer d'une case : en infobulle et lus par les lecteurs d'écran. */
function cellDetail(cell: MonthCell): string {
    const parts: string[] = [];

    if (cell.due_date) parts.push(`échéance le ${shortDate(cell.due_date)}`);
    if (cell.balance && cell.balance > 0) parts.push(`reste ${fcfa(cell.balance)}`);

    return parts.join(', ');
}

function Chip({ cell, compact = false }: { cell: MonthCell; compact?: boolean }) {
    const state = cellState(cell);
    const detail = cellDetail(cell);
    const badge = (
        <span
            title={detail ? `${state.label} : ${detail}` : undefined}
            className={`inline-flex whitespace-nowrap rounded-full font-medium ${compact ? 'px-1.5 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'} ${state.tone}`}
        >
            {state.label}
            {detail && <span className="sr-only">, {detail}</span>}
        </span>
    );

    return cell.invoice_id ? <Link href={route('admin.invoices.show', cell.invoice_id)}>{badge}</Link> : badge;
}

function StudentActions({
    student,
    canCollect,
    canRemind,
    onRemind,
}: {
    student: StudentRow;
    canCollect: boolean;
    canRemind: boolean;
    onRemind: (student: StudentRow) => void;
}) {
    return (
        <>
            {canCollect && (
                <IconLink href={route('admin.cashier.create', { student: student.id })} label={`Encaisser pour ${student.name}`}>
                    <HandCoins className="h-4 w-4" />
                </IconLink>
            )}
            {canRemind && student.overdue.count > 0 && (
                <IconButton onClick={() => onRemind(student)} label={`Relancer la famille de ${student.name}`}>
                    <BellRing className="h-4 w-4" />
                </IconButton>
            )}
        </>
    );
}

export default function Monthly({ students, totals, formations, academicYears, schoolMonths, monthLabels, filters, missingDueDates, dueDay }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canEdit = permissions.includes('modifier_comptabilite');
    const canCollect = permissions.includes('ajouter_comptabilite');
    const [onlyLate, setOnlyLate] = useState(false);

    const late = students.filter((student) => student.overdue.count > 0);
    const rows = onlyLate ? late : students;
    const hasFilters = Boolean(filters.formation_id && filters.academic_year_id);

    const fixDueDates = async () => {
        const message = `Fixer l'échéance de ${missingDueDates} mensualité(s) au ${dueDay} de leur mois ? Les dates déjà saisies ne sont pas modifiées.`;

        if (await confirmAction(message)) {
            router.post(route('admin.invoices.fixDueDates'), {}, { preserveScroll: true });
        }
    };

    const remind = async (student: StudentRow) => {
        const count = student.overdue.count;
        const confirmed = await confirmAction({
            title: 'Relancer la famille',
            message: `Envoyer une relance à la famille de ${student.name} pour ${count} facture${count > 1 ? 's' : ''} en retard (${fcfa(student.overdue.balance)}) ? Le message part par e-mail, notification et EEHT Connect, selon ses contacts.`,
            confirmLabel: 'Envoyer la relance',
        });

        if (confirmed) {
            router.post(route('admin.invoices.remind'), { student_id: student.id }, { preserveScroll: true });
        }
    };

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.invoices.monthly'),
            { formation_id: filters.formation_id ?? '', academic_year_id: filters.academic_year_id ?? '', ...overrides },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AdminLayout>
            <Head title="Suivi des mensualités" />
            <PageHeader
                title="Suivi des mensualités"
                subtitle="Visualisez, mois par mois, quels élèves sont à jour de leurs mensualités."
            >
                {canEdit && (
                    <Link
                        href={route('admin.finance.settings')}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
                    >
                        <Settings className="h-4 w-4" aria-hidden="true" /> Réglages des paiements
                    </Link>
                )}
            </PageHeader>

            {canEdit && missingDueDates > 0 && (
                <div role="status" className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 text-amber-900">
                        <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                        <p className="text-sm">
                            <strong>{missingDueDates} mensualité(s) sans date d'échéance.</strong> Sans échéance, une mensualité n'est jamais « en retard » et n'est
                            pas relancée. Elles peuvent être fixées au {dueDay} de leur mois.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fixDueDates}
                        className="shrink-0 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                        Fixer les échéances
                    </button>
                </div>
            )}

            <Card className="mb-6 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <Field label="Formation">
                    <Select
                        value={filters.formation_id ?? ''}
                        onChange={(e) => applyFilters({ formation_id: e.target.value })}
                    >
                        <option value="">Sélectionner une formation...</option>
                        {formations.map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Année académique">
                    <Select
                        value={filters.academic_year_id ?? ''}
                        onChange={(e) => applyFilters({ academic_year_id: e.target.value })}
                    >
                        <option value="">Sélectionner une année...</option>
                        {academicYears.map((y) => (
                            <option key={y.id} value={y.id}>
                                {y.label}
                            </option>
                        ))}
                    </Select>
                </Field>
            </Card>

            {!hasFilters ? (
                <Card className="p-10 text-center text-ink-500">
                    Choisissez une formation et une année académique pour afficher le suivi des mensualités.
                </Card>
            ) : (
                <>
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Card className="p-4">
                            <p className="text-xs text-ink-500">Reste à encaisser</p>
                            <p className="font-serif text-2xl font-bold text-ink-900">{fcfa(totals.balance)}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="text-xs text-ink-500">Dont en retard</p>
                            <p className={`font-serif text-2xl font-bold ${totals.overdue > 0 ? 'text-red-600' : 'text-ink-900'}`}>{fcfa(totals.overdue)}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="text-xs text-ink-500">Familles à relancer</p>
                            <p className={`font-serif text-2xl font-bold ${late.length > 0 ? 'text-red-600' : 'text-ink-900'}`}>{late.length}</p>
                        </Card>
                    </div>

                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <ul className="flex flex-wrap items-center gap-2 text-xs" aria-label="Légende des couleurs">
                            {[
                                ['Payée', TONES.paid],
                                ['Partielle', TONES.partial],
                                ['À venir', TONES.upcoming],
                                ['En retard', TONES.late],
                            ].map(([label, tone]) => (
                                <li key={label} className={`rounded-full px-2.5 py-1 font-medium ${tone}`}>
                                    {label}
                                </li>
                            ))}
                        </ul>
                        <label className="flex items-center gap-2 text-sm text-ink-700">
                            <Checkbox checked={onlyLate} onChange={(e) => setOnlyLate(e.target.checked)} />
                            Seulement les élèves en retard
                        </label>
                    </div>

                    {rows.length === 0 ? (
                        <Card className="px-5 py-10 text-center">
                            <div className="flex flex-col items-center gap-3 text-ink-500">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                    <Inbox className="h-6 w-6" />
                                </span>
                                <p className="text-sm">{onlyLate ? 'Aucun élève en retard dans cette formation.' : 'Aucun élève actif dans cette formation.'}</p>
                            </div>
                        </Card>
                    ) : (
                        <>
                            {/* Téléphone : une carte par élève, les dix mois en grille. */}
                            <ul className="space-y-3 md:hidden">
                                {rows.map((student) => (
                                    <li key={student.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-ink-900">{student.name}</p>
                                                <p className="text-xs text-ink-500">{student.matricule}</p>
                                                {student.overdue.count > 0 && (
                                                    <p className="mt-1 text-xs font-medium text-red-700">
                                                        {student.overdue.count} en retard · {fcfa(student.overdue.balance)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                <StudentActions student={student} canCollect={canCollect} canRemind={canEdit} onRemind={remind} />
                                            </div>
                                        </div>
                                        <ul className="mt-3 grid grid-cols-5 gap-x-1.5 gap-y-3">
                                            {schoolMonths.map((month) => (
                                                <li key={month} className="min-w-0">
                                                    <p className="mb-1 text-[10px] uppercase tracking-wide text-ink-500">
                                                        <span aria-hidden="true">{abbreviate(monthLabels[month])}</span>
                                                        <span className="sr-only">{monthLabels[month]}</span>
                                                    </p>
                                                    <Chip cell={student.months[month] ?? emptyCell} compact />
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>

                            {/* Tablette et ordinateur : la matrice élève × mois. */}
                            <Card className="hidden overflow-hidden md:block">
                                <div className="overflow-x-auto">
                                    <table data-table="scroll" className="w-full text-left text-sm">
                                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                            <tr>
                                                <th className="sticky left-0 z-10 bg-ink-50 px-5 py-3">Élève</th>
                                                {schoolMonths.map((month) => (
                                                    <th key={month} className="px-3 py-3 text-center">
                                                        {monthLabels[month]}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-ink-100">
                                            {rows.map((student) => (
                                                <tr key={student.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                                    <td className="sticky left-0 z-10 bg-white px-5 py-3">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="whitespace-nowrap font-medium text-ink-900">{student.name}</p>
                                                                <p className="text-xs text-ink-500">{student.matricule}</p>
                                                                {student.overdue.count > 0 && (
                                                                    <p className="whitespace-nowrap text-xs font-medium text-red-700">
                                                                        {student.overdue.count} en retard · {fcfa(student.overdue.balance)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex shrink-0 gap-1">
                                                                <StudentActions student={student} canCollect={canCollect} canRemind={canEdit} onRemind={remind} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {schoolMonths.map((month) => (
                                                        <td key={month} className="px-3 py-3 text-center">
                                                            <Chip cell={student.months[month] ?? emptyCell} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t-2 border-ink-100 bg-ink-50 text-xs">
                                            <tr>
                                                <th scope="row" className="sticky left-0 z-10 bg-ink-50 px-5 py-3 text-left font-semibold text-ink-700">
                                                    Reste à encaisser (toute la classe)
                                                </th>
                                                {schoolMonths.map((month) => (
                                                    <td key={month} className="px-3 py-3 text-center font-semibold text-ink-700">
                                                        {(totals.by_month[month] ?? 0) > 0 ? fcfa(totals.by_month[month]) : '—'}
                                                    </td>
                                                ))}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}
                </>
            )}
        </AdminLayout>
    );
}
