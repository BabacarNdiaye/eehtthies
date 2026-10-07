import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { SearchField } from '@/Components/Admin/FilterBar';
import FinanceTabs from '@/Components/Admin/FinanceTabs';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { IconLink } from '@/Components/Admin/IconButton';
import { Invoice, Paginated } from '@/types';
import { MONTH_LABELS, SCHOOL_MONTHS } from '@/lib/months';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertCircle, CalendarClock, ChevronDown, Eye, HandCoins, Inbox, Plus, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Stats {
    total: number;
    invoiced: number;
    collected: number;
    outstanding: number;
    payee: number;
    partielle: number;
    impayee: number;
}

type Row = Invoice & { days_late?: number };

interface Props {
    invoices: Paginated<Row>;
    stats: Stats;
    can: { collect: boolean };
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

export default function Index({ invoices, stats, can, formations, academicYears, types, filters }: Props) {
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

    const rate = stats.invoiced > 0 ? Math.min(100, Math.round((stats.collected / stats.invoiced) * 100)) : 0;
    const tabs = [
        { key: '', label: 'Toutes', count: stats.total },
        { key: 'impayee', label: 'Impayées', count: stats.impayee },
        { key: 'partielle', label: 'Partielles', count: stats.partielle },
        { key: 'payee', label: 'Payées', count: stats.payee },
    ];

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
            <PageHeader title="Factures" subtitle="Suivez ce qui est facturé, encaissé et restant à payer pour chaque élève.">
                <Link
                    href={route('admin.invoices.overdue')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 outline-none transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    <AlertCircle className="h-4 w-4" aria-hidden="true" /> Impayés
                </Link>
                <ToolsMenu
                    onGenerate={() => {
                        setShowGenerate((v) => !v);
                        setShowGenerateMonthly(false);
                    }}
                    onMonthly={() => {
                        setShowGenerateMonthly((v) => !v);
                        setShowGenerate(false);
                    }}
                />
                {can.collect && (
                    <Link
                        href={route('admin.cashier.create')}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-ink-900 shadow-sm outline-none transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                    >
                        <HandCoins className="h-4 w-4" aria-hidden="true" /> Encaisser
                    </Link>
                )}
                <Link
                    href={route('admin.invoices.create')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Nouvelle facture
                </Link>
            </PageHeader>
            <FinanceTabs current="invoices" />

            <section aria-label="Synthèse des factures" className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-6 text-white shadow-elevated">
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Recouvrement</p>
                    <p className="mt-2 font-serif text-4xl font-bold tabular-nums">{rate} %</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${rate} % encaissé`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300" style={{ width: `${rate}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-white/60">
                        {fcfa(stats.collected)} encaissés sur {fcfa(stats.invoiced)} facturés
                    </p>
                </div>
                <Card className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Reste à payer</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-rose-700">{fcfa(stats.outstanding)}</p>
                    <p className="mt-1 text-sm text-ink-500">{stats.impayee + stats.partielle} facture(s) ouverte(s)</p>
                </Card>
                <Card className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Factures</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-ink-900">{stats.total}</p>
                    <p className="mt-1 text-sm text-ink-500">{stats.payee} payée(s) · {stats.partielle} partielle(s) · {stats.impayee} impayée(s)</p>
                </Card>
            </section>

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

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div role="tablist" aria-label="Filtrer par statut" className="inline-flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1">
                    {tabs.map((t) => {
                        const active = (filters.status ?? '') === t.key;

                        return (
                            <button
                                key={t.key || 'all'}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => applyFilters({ status: t.key })}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                            >
                                {t.label}
                                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-ink-900 text-white' : 'bg-ink-200/70 text-ink-600'}`}>{t.count}</span>
                            </button>
                        );
                    })}
                </div>
                <Select aria-label="Filtrer par type" value={filters.type ?? ''} onChange={(e) => applyFilters({ type: e.target.value })} className="max-w-[12rem]">
                    <option value="">Tous les types</option>
                    {Object.entries(types).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
                <div className="min-w-[14rem] flex-1">
                    <SearchField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                        placeholder="Rechercher un élève ou un matricule…"
                    />
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Facture</th>
                                <th className="px-5 py-3">Règlement</th>
                                <th className="px-5 py-3 text-right">Solde</th>
                                <th className="px-5 py-3">Échéance</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {invoices.data.map((inv) => {
                                const st = inv.computed_status ?? 'impayee';
                                const net = Number(inv.amount) - Number(inv.discount);
                                const pct = net > 0 ? Math.min(100, Math.round(((inv.computed_paid ?? 0) / net) * 100)) : 100;

                                return (
                                    <tr key={inv.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <Link href={route('admin.invoices.show', inv.id)} className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 font-serif text-xs font-bold text-gold-300">{initials(inv)}</span>
                                                <span className="min-w-0">
                                                    <span className="block truncate font-medium text-ink-900">
                                                        {inv.student?.first_name} {inv.student?.last_name}
                                                    </span>
                                                    <span className="block text-xs text-ink-500">{inv.student?.matricule}</span>
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="block font-medium text-ink-800">{inv.label}</span>
                                            <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
                                                {inv.label !== (types[inv.type] ?? inv.type) && <span className="rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-600">{types[inv.type] ?? inv.type}</span>}
                                                <span className="font-mono">{inv.reference}</span>
                                            </span>
                                        </td>
                                        <td className="min-w-[11rem] px-5 py-3">
                                            <div className="flex items-baseline justify-between text-xs text-ink-500">
                                                <span className="tabular-nums">{fcfa(inv.computed_paid ?? 0)}</span>
                                                <span className="tabular-nums">/ {fcfa(net)}</span>
                                            </div>
                                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                                                <div className={`h-full rounded-full ${st === 'payee' ? 'bg-emerald-500' : st === 'partielle' ? 'bg-amber-500' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </td>
                                        <td className={`px-5 py-3 text-right font-semibold tabular-nums ${(inv.computed_balance ?? 0) > 0 ? 'text-ink-900' : 'text-emerald-700'}`}>{fcfa(inv.computed_balance ?? 0)}</td>
                                        <td className="px-5 py-3 text-ink-600">
                                            {inv.due_date ? dateFr(inv.due_date) : <span className="text-ink-400">—</span>}
                                            {(inv.days_late ?? 0) > 0 && <span className="mt-0.5 block text-xs font-semibold text-rose-600">{inv.days_late} j de retard</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[st]}`}>{statusLabels[st]}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {can.collect && st !== 'payee' && (
                                                    <IconLink href={route('admin.cashier.create', { student: inv.student_id, invoice: inv.id })} label="Encaisser">
                                                        <HandCoins className="h-4 w-4" />
                                                    </IconLink>
                                                )}
                                                <IconLink href={route('admin.invoices.show', inv.id)} label="Consulter">
                                                    <Eye className="h-4 w-4" />
                                                </IconLink>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <ul className="divide-y divide-ink-100 md:hidden">
                    {invoices.data.map((inv) => {
                        const st = inv.computed_status ?? 'impayee';

                        return (
                            <li key={inv.id}>
                                <Link href={route('admin.invoices.show', inv.id)} className="block px-4 py-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-ink-900">
                                                {inv.student?.first_name} {inv.student?.last_name}
                                            </p>
                                            <p className="truncate text-xs text-ink-500">
                                                {inv.label === (types[inv.type] ?? inv.type) ? inv.reference : `${inv.label} · ${types[inv.type] ?? inv.type}`}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[st]}`}>{statusLabels[st]}</span>
                                    </div>
                                    <div className="mt-2 flex items-baseline justify-between text-sm">
                                        <span className="text-ink-500">Solde</span>
                                        <span className="font-bold tabular-nums text-ink-900">{fcfa(inv.computed_balance ?? 0)}</span>
                                    </div>
                                    {(inv.days_late ?? 0) > 0 && <p className="mt-0.5 text-right text-xs font-semibold text-rose-600">{inv.days_late} j de retard</p>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {invoices.data.length === 0 && (
                    <div className="flex flex-col items-center gap-3 px-5 py-12 text-ink-500">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <p className="text-sm">Aucune facture ne correspond à ces filtres.</p>
                    </div>
                )}
                <Pagination data={invoices} />
            </Card>
        </AdminLayout>
    );
}

const initials = (inv: Invoice) => `${inv.student?.first_name?.[0] ?? ''}${inv.student?.last_name?.[0] ?? ''}`.toUpperCase() || '—';

const dateFr = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);

    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Menu « Générer » : regroupe les générations en masse et l'échéancier, pour ne garder que l'essentiel dans l'en-tête. */
function ToolsMenu({ onGenerate, onMonthly }: { onGenerate: () => void; onMonthly: () => void }) {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
        };

        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);

        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 outline-none hover:bg-ink-50 focus-visible:bg-ink-50';

    return (
        <div ref={box} className="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 outline-none transition hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
            >
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Générer
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-ink-100 bg-white p-1.5 shadow-elevated">
                    <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onGenerate(); }}>
                        <Sparkles className="h-4 w-4 text-gold-700" aria-hidden="true" /> Factures d'une formation
                    </button>
                    <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onMonthly(); }}>
                        <CalendarClock className="h-4 w-4 text-gold-700" aria-hidden="true" /> Mensualités d'une formation
                    </button>
                    <Link role="menuitem" href={route('admin.payment-plans.create')} className={item}>
                        <CalendarClock className="h-4 w-4 text-gold-700" aria-hidden="true" /> Créer un échéancier
                    </Link>
                    <Link role="menuitem" href={route('admin.invoices.monthly')} className={item}>
                        <CalendarClock className="h-4 w-4 text-gold-700" aria-hidden="true" /> Suivi des mensualités
                    </Link>
                </div>
            )}
        </div>
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
