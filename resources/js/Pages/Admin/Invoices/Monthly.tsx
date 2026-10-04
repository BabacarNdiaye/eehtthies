import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select } from '@/Components/Admin/Field';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

interface MonthCell {
    invoice_id: number | null;
    status: 'non_genere' | 'payee' | 'partielle' | 'impayee';
}

interface StudentRow {
    id: number;
    name: string;
    matricule: string;
    months: Record<string, MonthCell>;
}

interface Props {
    students: StudentRow[];
    formations: { id: number; name: string }[];
    academicYears: { id: number; label: string }[];
    schoolMonths: number[];
    monthLabels: Record<string, string>;
    filters: { formation_id?: string; academic_year_id?: string };
}

const statusStyles: Record<MonthCell['status'], string> = {
    payee: 'bg-emerald-100 text-emerald-700',
    partielle: 'bg-amber-100 text-amber-700',
    impayee: 'bg-red-100 text-red-700',
    non_genere: 'bg-ink-50 text-ink-300',
};

const statusLabels: Record<MonthCell['status'], string> = {
    payee: 'Payée',
    partielle: 'Partielle',
    impayee: 'Impayée',
    non_genere: '—',
};

export default function Monthly({ students, formations, academicYears, schoolMonths, monthLabels, filters }: Props) {
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
            />

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

            {!filters.formation_id || !filters.academic_year_id ? (
                <Card className="p-10 text-center text-ink-400">
                    Choisissez une formation et une année académique pour afficher le suivi des mensualités.
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
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
                                {students.map((student) => (
                                    <tr key={student.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="sticky left-0 z-10 bg-white px-5 py-3 font-medium text-ink-900">
                                            {student.name}
                                            <span className="ml-1 text-xs font-normal text-ink-500">
                                                ({student.matricule})
                                            </span>
                                        </td>
                                        {schoolMonths.map((month) => {
                                            const cell = student.months[month] ?? { invoice_id: null, status: 'non_genere' as const };
                                            const badge = (
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[cell.status]}`}
                                                >
                                                    {statusLabels[cell.status]}
                                                </span>
                                            );
                                            return (
                                                <td key={month} className="px-3 py-3 text-center">
                                                    {cell.invoice_id ? (
                                                        <Link href={route('admin.invoices.show', cell.invoice_id)}>
                                                            {badge}
                                                        </Link>
                                                    ) : (
                                                        badge
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={schoolMonths.length + 1} className="px-5 py-10 text-center">
                                            <div className="flex flex-col items-center gap-3 text-ink-500">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                    <Inbox className="h-6 w-6" />
                                                </span>
                                                <p className="text-sm">Aucun élève actif dans cette formation.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </AdminLayout>
    );
}
