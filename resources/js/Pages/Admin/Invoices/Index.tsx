import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FilterBar, { SearchField } from '@/Components/Admin/FilterBar';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { IconLink } from '@/Components/Admin/IconButton';
import { Invoice, Paginated } from '@/types';
import { MONTH_LABELS, SCHOOL_MONTHS } from '@/lib/months';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertCircle, CalendarClock, Eye, Inbox, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Props {
    invoices: Paginated<Invoice>;
    students: { id: number; first_name: string; last_name: string; matricule: string }[];
    formations: { id: number; name: string }[];
    academicYears: { id: number; label: string }[];
    types: Record<string, string>;
    filters: { student_id?: string; type?: string; status?: string; search?: string };
}

const statusStyles: Record<string, string> = {
    payee: 'bg-emerald-100 text-emerald-700',
    partielle: 'bg-amber-100 text-amber-700',
    impayee: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
    payee: 'Payée',
    partielle: 'Partielle',
    impayee: 'Impayée',
};

const fcfa = (v: number | string) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(v)))} FCFA`;

export default function Index({ invoices, students, formations, academicYears, types, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [showGenerate, setShowGenerate] = useState(false);
    const [showGenerateMonthly, setShowGenerateMonthly] = useState(false);

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.invoices.index'),
            { search, type: filters.type ?? '', status: filters.status ?? '', ...overrides },
            { preserveState: true, replace: true },
        );
    };

    const generateForm = useForm({
        formation_id: '' as number | '',
        academic_year_id: '' as number | '',
        type: 'scolarite' as 'inscription' | 'scolarite',
    });

    const monthlyForm = useForm({
        formation_id: '' as number | '',
        academic_year_id: '' as number | '',
        months: [...SCHOOL_MONTHS] as number[],
        amount: '' as number | '',
    });

    const toggleMonth = (month: number) => {
        monthlyForm.setData(
            'months',
            monthlyForm.data.months.includes(month)
                ? monthlyForm.data.months.filter((m) => m !== month)
                : [...monthlyForm.data.months, month],
        );
    };

    return (
        <AdminLayout>
            <Head title="Factures" />
            <PageHeader
                title="Factures"
                subtitle="Gérez les frais de scolarité, d'inscription et autres facturations des élèves."
                action={{ label: 'Nouvelle facture', href: route('admin.invoices.create') }}
            >
                <Link
                    href={route('admin.invoices.overdue')}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                    <AlertCircle className="h-4 w-4" /> Impayés
                </Link>
                <Link
                    href={route('admin.invoices.monthly')}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                    <CalendarClock className="h-4 w-4" /> Suivi des mensualités
                </Link>
                <Link
                    href={route('admin.payment-plans.create')}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                    <CalendarClock className="h-4 w-4" /> Créer un échéancier
                </Link>
                <button
                    onClick={() => setShowGenerate((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                    <Sparkles className="h-4 w-4" /> Générer par formation
                </button>
                <button
                    onClick={() => setShowGenerateMonthly((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                    <Sparkles className="h-4 w-4" /> Générer les mensualités
                </button>
            </PageHeader>

            {showGenerate && (
                <Card className="mb-6 p-6">
                    <p className="mb-4 text-sm text-ink-500">
                        Crée automatiquement une facture pour chaque élève actif de la formation choisie, à partir des
                        frais définis sur la formation.
                    </p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            generateForm.post(route('admin.invoices.generateForFormation'), {
                                preserveScroll: true,
                                onSuccess: () => setShowGenerate(false),
                            });
                        }}
                        className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end"
                    >
                        <GenerateFields form={generateForm} formations={formations} academicYears={academicYears} />
                        <button
                            type="submit"
                            disabled={generateForm.processing}
                            className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50"
                        >
                            Générer
                        </button>
                    </form>
                </Card>
            )}

            {showGenerateMonthly && (
                <Card className="mb-6 p-6">
                    <p className="mb-4 text-sm text-ink-500">
                        Crée une facture « Mensualité » pour chaque élève actif de la formation, pour chacun des mois
                        cochés ci-dessous (les mois déjà générés pour un élève sont ignorés). Si aucun montant n'est
                        précisé, il est calculé automatiquement à partir des frais de scolarité de la formation divisés
                        par le nombre de mois sélectionnés.
                    </p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            monthlyForm.post(route('admin.invoices.generateMonthly'), {
                                preserveScroll: true,
                                onSuccess: () => setShowGenerateMonthly(false),
                            });
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Field label="Formation" required error={monthlyForm.errors.formation_id}>
                                <Select
                                    value={monthlyForm.data.formation_id}
                                    onChange={(e) =>
                                        monthlyForm.setData('formation_id', e.target.value ? Number(e.target.value) : '')
                                    }
                                >
                                    <option value="">Sélectionner...</option>
                                    {formations.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Année académique" required error={monthlyForm.errors.academic_year_id}>
                                <Select
                                    value={monthlyForm.data.academic_year_id}
                                    onChange={(e) =>
                                        monthlyForm.setData('academic_year_id', e.target.value ? Number(e.target.value) : '')
                                    }
                                >
                                    <option value="">Sélectionner...</option>
                                    {academicYears.map((y) => (
                                        <option key={y.id} value={y.id}>
                                            {y.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field
                                label="Montant / mois (FCFA)"
                                error={monthlyForm.errors.amount}
                                hint="Laisser vide pour un calcul automatique"
                            >
                                <TextInput
                                    type="number"
                                    value={monthlyForm.data.amount}
                                    onChange={(e) =>
                                        monthlyForm.setData('amount', e.target.value ? Number(e.target.value) : '')
                                    }
                                />
                            </Field>
                        </div>
                        <Field label="Mois à générer" required error={monthlyForm.errors.months}>
                            <div className="flex flex-wrap gap-2">
                                {SCHOOL_MONTHS.map((month) => (
                                    <label
                                        key={month}
                                        className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium ${
                                            monthlyForm.data.months.includes(month)
                                                ? 'border-gold-500 bg-gold-50 text-gold-700'
                                                : 'border-ink-200 text-ink-500 hover:bg-ink-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={monthlyForm.data.months.includes(month)}
                                            onChange={() => toggleMonth(month)}
                                            className="sr-only"
                                        />
                                        {MONTH_LABELS[month]}
                                    </label>
                                ))}
                            </div>
                        </Field>
                        <button
                            type="submit"
                            disabled={monthlyForm.processing}
                            className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50"
                        >
                            Générer les mensualités
                        </button>
                    </form>
                </Card>
            )}

            <FilterBar
                search={
                    <SearchField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                        placeholder="Rechercher un élève..."
                    />
                }
                activeCount={[filters.type, filters.status].filter(Boolean).length}
            >
                <Select aria-label="Filtrer par type" value={filters.type ?? ''} onChange={(e) => applyFilters({ type: e.target.value })}>
                    <option value="">Tous les types</option>
                    {Object.entries(types).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Filtrer par statut" value={filters.status ?? ''} onChange={(e) => applyFilters({ status: e.target.value })}>
                    <option value="">Tous les statuts</option>
                    <option value="impayee">Impayée</option>
                    <option value="partielle">Partielle</option>
                    <option value="payee">Payée</option>
                </Select>
            </FilterBar>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Référence</th>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Libellé</th>
                                <th className="px-5 py-3">Montant</th>
                                <th className="px-5 py-3">Solde</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {invoices.data.map((inv) => (
                                <tr key={inv.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{inv.reference}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {inv.student?.first_name} {inv.student?.last_name}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{inv.label}</td>
                                    <td className="px-5 py-3 text-ink-600">{fcfa(inv.amount)}</td>
                                    <td className="px-5 py-3 font-medium text-ink-900">
                                        {fcfa(inv.computed_balance ?? 0)}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[inv.computed_status ?? 'impayee']}`}
                                        >
                                            {statusLabels[inv.computed_status ?? 'impayee']}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end">
                                            <IconLink href={route('admin.invoices.show', inv.id)} label="Consulter">
                                                <Eye className="h-4 w-4" />
                                            </IconLink>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invoices.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune facture trouvée.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={invoices} />
            </Card>
        </AdminLayout>
    );
}

function GenerateFields({
    form,
    formations,
    academicYears,
}: {
    form: ReturnType<typeof useForm<{ formation_id: number | ''; academic_year_id: number | ''; type: 'inscription' | 'scolarite' }>>;
    formations: { id: number; name: string }[];
    academicYears: { id: number; label: string }[];
}) {
    return (
        <>
            <Field label="Type" required>
                <Select value={form.data.type} onChange={(e) => form.setData('type', e.target.value as 'inscription' | 'scolarite')}>
                    <option value="scolarite">Frais de scolarité</option>
                    <option value="inscription">Frais d'inscription</option>
                </Select>
            </Field>
            <Field label="Formation" required error={form.errors.formation_id}>
                <Select
                    value={form.data.formation_id}
                    onChange={(e) => form.setData('formation_id', e.target.value ? Number(e.target.value) : '')}
                >
                    <option value="">Sélectionner...</option>
                    {formations.map((f) => (
                        <option key={f.id} value={f.id}>
                            {f.name}
                        </option>
                    ))}
                </Select>
            </Field>
            <Field label="Année académique" required error={form.errors.academic_year_id}>
                <Select
                    value={form.data.academic_year_id}
                    onChange={(e) => form.setData('academic_year_id', e.target.value ? Number(e.target.value) : '')}
                >
                    <option value="">Sélectionner...</option>
                    {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                            {y.label}
                        </option>
                    ))}
                </Select>
            </Field>
        </>
    );
}
