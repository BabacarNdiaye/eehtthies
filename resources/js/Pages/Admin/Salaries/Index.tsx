import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import ExportButtons from '@/Components/Admin/ExportButtons';
import { Field, Select, TextInput, Textarea } from '@/Components/Admin/Field';
import Modal from '@/Components/Modal';
import { Head, router, useForm } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Clock3, Coins, Printer, Trash2, Users, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface MonthCell {
    salary_payment_id: number | null;
    amount: number | null;
    hours_worked: number | null;
    paid_at: string | null;
    status: 'payee' | 'impayee';
}

interface StaffRow {
    id: string;
    name: string;
    position: string | null;
    type: 'user' | 'teacher';
    payment_type: 'fixe' | 'horaire';
    monthly_salary: number | null;
    hourly_rate: number | null;
    months: Record<string, MonthCell>;
}

interface Props {
    staff: StaffRow[];
    year: number;
    months: number[];
    monthLabels: Record<string, string>;
    paymentMethods: Record<string, string>;
    paymentTypes: Record<string, string>;
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
}

function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function Index({ staff, year, months, monthLabels, paymentMethods, paymentTypes }: Props) {
    const [target, setTarget] = useState<{ staff: StaffRow; month: number; cell: MonthCell } | null>(null);
    const [activeTab, setActiveTab] = useState<'user' | 'teacher'>('user');

    const payForm = useForm({
        user_id: '' as number | '',
        teacher_id: '' as number | '',
        period_year: year,
        period_month: 0,
        hours_worked: '',
        amount: '',
        paid_at: new Date().toISOString().slice(0, 10),
        payment_method: 'virement',
        notes: '',
    });

    const changeYear = (newYear: string) => {
        router.get(route('admin.salaries.index'), { year: newYear }, { preserveState: true, replace: true });
    };

    const openPay = (row: StaffRow, month: number, cell: MonthCell) => {
        setTarget({ staff: row, month, cell });
        const numericId = Number(row.id.split('-')[1]);
        payForm.setData({
            user_id: row.type === 'user' ? numericId : '',
            teacher_id: row.type === 'teacher' ? numericId : '',
            period_year: year,
            period_month: month,
            hours_worked: '',
            amount: row.payment_type === 'fixe' && row.monthly_salary != null ? String(row.monthly_salary) : '',
            paid_at: new Date().toISOString().slice(0, 10),
            payment_method: 'virement',
            notes: '',
        });
    };

    // Pour les enseignants au taux horaire : recalcule le montant suggéré quand les heures changent.
    useEffect(() => {
        if (target && target.staff.payment_type === 'horaire' && target.staff.hourly_rate) {
            const hours = parseFloat(payForm.data.hours_worked);
            if (!Number.isNaN(hours) && hours >= 0) {
                payForm.setData('amount', String(Math.round(hours * target.staff.hourly_rate)));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payForm.data.hours_worked]);

    const closeModal = () => setTarget(null);

    const submitPay = (e: React.FormEvent) => {
        e.preventDefault();
        payForm.post(route('admin.salaries.store'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
        });
    };

    const cancelPayment = (row: StaffRow, salaryPaymentId: number) => {
        if (!confirm('Annuler ce paiement de salaire ? La dépense associée sera également supprimée.')) return;

        const routeName = row.type === 'teacher' ? 'admin.salaries.destroyTeacherPayment' : 'admin.salaries.destroy';
        router.delete(route(routeName, salaryPaymentId), { preserveScroll: true });
    };

    const payslipUrl = (row: StaffRow, salaryPaymentId: number) =>
        route(row.type === 'teacher' ? 'admin.salaries.payslip.teacher' : 'admin.salaries.payslip.user', salaryPaymentId);

    const yearOptions = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i);

    const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() + 1 : null;

    const kpis = useMemo(() => {
        const totalPaidYear = staff.reduce(
            (sum, row) => sum + Object.values(row.months).reduce((s, m) => s + (m.amount ?? 0), 0),
            0,
        );
        const paidThisMonth = currentMonth
            ? staff.filter((row) => row.months[currentMonth]?.status === 'payee').length
            : 0;
        const pendingThisMonth = currentMonth ? staff.length - paidThisMonth : 0;
        const monthsElapsed = currentMonth ?? 12;
        const average = monthsElapsed > 0 ? totalPaidYear / monthsElapsed : 0;

        return { totalPaidYear, paidThisMonth, pendingThisMonth, average };
    }, [staff, currentMonth]);

    const monthlyTotals = useMemo(
        () =>
            months.map((month) => ({
                month: monthLabels[month]?.slice(0, 3) ?? String(month),
                total: staff.reduce((sum, row) => sum + (row.months[month]?.amount ?? 0), 0),
            })),
        [staff, months, monthLabels],
    );

    const staffGroups: { key: 'user' | 'teacher'; label: string; rows: StaffRow[] }[] = [
        { key: 'user', label: 'Personnel administratif', rows: staff.filter((row) => row.type === 'user') },
        { key: 'teacher', label: 'Enseignants', rows: staff.filter((row) => row.type === 'teacher') },
    ];

    const activeRows = staffGroups.find((group) => group.key === activeTab)?.rows ?? [];

    return (
        <AdminLayout>
            <Head title="Salaires du personnel" />
            <PageHeader
                title="Salaires du personnel"
                subtitle="Suivez et enregistrez les paiements mensuels — personnel administratif et enseignants (salaire fixe ou taux horaire)."
            >
                <ExportButtons
                    csvHref={route('admin.salaries.export.csv', { year })}
                    pdfHref={route('admin.salaries.export.pdf', { year })}
                />
            </PageHeader>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-100 text-gold-800">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{formatFcfa(kpis.totalPaidYear)}</p>
                            <p className="text-sm text-ink-500">Masse salariale {year}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{staff.length}</p>
                            <p className="text-sm text-ink-500">Personnel suivi</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">
                                {currentMonth ? `${kpis.paidThisMonth}/${staff.length}` : '—'}
                            </p>
                            <p className="text-sm text-ink-500">Payés ce mois-ci</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                            <Clock3 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-ink-900">{currentMonth ? kpis.pendingThisMonth : '—'}</p>
                            <p className="text-sm text-ink-500">En attente ce mois-ci</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="mb-6 p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <Coins className="h-5 w-5 text-gold-600" /> Masse salariale par mois
                    </h2>
                    <Select value={year} onChange={(e) => changeYear(e.target.value)} className="sm:w-32">
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </Select>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyTotals}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6c86a3" />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            stroke="#6c86a3"
                            tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                        />
                        <Tooltip formatter={(v: number) => formatFcfa(v)} />
                        <Bar dataKey="total" fill="#c8942a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <div className="mb-4 inline-flex rounded-lg border border-ink-200 bg-white p-1">
                {staffGroups.map((group) => (
                    <button
                        key={group.key}
                        type="button"
                        onClick={() => setActiveTab(group.key)}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                            activeTab === group.key ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
                        }`}
                    >
                        {group.label} <span className="ml-1 opacity-70">({group.rows.length})</span>
                    </button>
                ))}
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="sticky left-0 z-10 bg-ink-50 px-5 py-3">Membre du personnel</th>
                                {months.map((month) => (
                                    <th
                                        key={month}
                                        className={`px-3 py-3 text-center ${month === currentMonth ? 'text-gold-700' : ''}`}
                                    >
                                        {monthLabels[month]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {activeRows.map((row) => (
                                <tr key={row.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="sticky left-0 z-10 bg-white px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                    row.type === 'teacher'
                                                        ? 'bg-gold-100 text-gold-800'
                                                        : 'bg-ink-100 text-ink-700'
                                                }`}
                                            >
                                                {initials(row.name)}
                                            </span>
                                            <div>
                                                <p className="font-medium text-ink-900">{row.name}</p>
                                                <span className="block text-xs font-normal text-ink-400">
                                                    {row.position}
                                                    {' · '}
                                                    {row.payment_type === 'horaire'
                                                        ? `${paymentTypes.horaire} (${row.hourly_rate ? formatFcfa(row.hourly_rate) : '—'}/h)`
                                                        : paymentTypes.fixe}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {months.map((month) => {
                                        const cell = row.months[month] ?? {
                                            salary_payment_id: null,
                                            amount: null,
                                            hours_worked: null,
                                            paid_at: null,
                                            status: 'impayee' as const,
                                        };
                                        return (
                                            <td
                                                key={month}
                                                className={`px-3 py-3 text-center ${month === currentMonth ? 'bg-gold-50/40' : ''}`}
                                            >
                                                {cell.status === 'payee' ? (
                                                    <div className="group relative inline-flex">
                                                        <span className="inline-flex flex-col items-center gap-0.5 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            {cell.amount != null && (
                                                                <span className="text-[10px] font-normal">{formatFcfa(cell.amount)}</span>
                                                            )}
                                                            {cell.hours_worked != null && (
                                                                <span className="text-[10px] font-normal text-emerald-600">{cell.hours_worked}h</span>
                                                            )}
                                                        </span>
                                                        <a
                                                            href={payslipUrl(row, cell.salary_payment_id!)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="absolute -left-2 -top-2 hidden rounded-full bg-white p-0.5 text-ink-500 shadow ring-1 ring-ink-100 transition-colors duration-150 hover:bg-ink-50 group-hover:block"
                                                            title="Imprimer le bulletin de salaire"
                                                        >
                                                            <Printer className="h-3 w-3" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => cancelPayment(row, cell.salary_payment_id!)}
                                                            className="absolute -right-2 -top-2 hidden rounded-full bg-white p-0.5 text-red-500 shadow ring-1 ring-ink-100 transition-colors duration-150 hover:bg-red-50 group-hover:block"
                                                            title="Annuler ce paiement"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => openPay(row, month, cell)}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-ink-100 px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:bg-gold-100 hover:text-gold-700"
                                                    >
                                                        <Clock3 className="h-3 w-3" /> Impayé
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {activeRows.length === 0 && (
                                <tr>
                                    <td colSpan={months.length + 1} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Users className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun membre du personnel dans cette catégorie.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal show={!!target} onClose={closeModal} maxWidth="md">
                {target && (
                    <form onSubmit={submitPay} className="p-6">
                        <div className="mb-5 flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-800">
                                <Coins className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="font-serif text-lg font-bold text-ink-900">Enregistrer un salaire</h2>
                                <p className="text-sm text-ink-500">
                                    {target.staff.name} — {monthLabels[target.month]} {year}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {target.staff.payment_type === 'horaire' && (
                                <Field label="Heures travaillées" required error={payForm.errors.hours_worked}>
                                    <TextInput
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={payForm.data.hours_worked}
                                        onChange={(e) => payForm.setData('hours_worked', e.target.value)}
                                    />
                                </Field>
                            )}
                            <Field
                                label="Montant"
                                required
                                error={payForm.errors.amount}
                                hint={target.staff.payment_type === 'horaire' ? 'Calculé automatiquement, modifiable si besoin.' : undefined}
                            >
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={payForm.data.amount}
                                    onChange={(e) => payForm.setData('amount', e.target.value)}
                                />
                            </Field>
                            <Field label="Date de paiement" required error={payForm.errors.paid_at}>
                                <TextInput
                                    type="date"
                                    value={payForm.data.paid_at}
                                    onChange={(e) => payForm.setData('paid_at', e.target.value)}
                                />
                            </Field>
                            <Field label="Mode de paiement" required error={payForm.errors.payment_method}>
                                <Select
                                    value={payForm.data.payment_method}
                                    onChange={(e) => payForm.setData('payment_method', e.target.value)}
                                >
                                    {Object.entries(paymentMethods).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Notes" error={payForm.errors.notes}>
                                <Textarea
                                    rows={2}
                                    value={payForm.data.notes}
                                    onChange={(e) => payForm.setData('notes', e.target.value)}
                                />
                            </Field>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-500 hover:bg-ink-100"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={payForm.processing}
                                className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                            >
                                Enregistrer le paiement
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </AdminLayout>
    );
}
