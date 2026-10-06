import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select } from '@/Components/Admin/Field';
import { IconLink } from '@/Components/Admin/IconButton';
import { fcfa } from '@/lib/money';
import { PageProps } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { CalendarPlus, Coins, Eye, Inbox } from 'lucide-react';

interface Run {
    id: number;
    period_year: number;
    period_month: number;
    label: string;
    /** « d'octobre 2026 » : pour les phrases (« la paie d'octobre 2026 »). */
    of_label: string;
    status: 'brouillon' | 'validee';
    lines_count: number;
    payroll: number;
    paid: number;
    remaining: number;
}

interface Props {
    runs: Run[];
    monthLabels: Record<string, string>;
    defaultYear: number;
    defaultMonth: number;
}

/** Où en est un cycle : brouillon (à vérifier), validé (à payer) ou entièrement payé. */
function RunState({ run }: { run: Run }) {
    const pill = 'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium';

    if (run.status === 'brouillon') return <span className={`${pill} bg-amber-100 text-amber-800`}>Brouillon</span>;
    if (run.lines_count > 0 && run.remaining <= 0) return <span className={`${pill} bg-emerald-100 text-emerald-700`}>Payée</span>;

    return <span className={`${pill} bg-sky-100 text-sky-700`}>Validée · à payer</span>;
}

export default function Index({ runs, monthLabels, defaultYear, defaultMonth }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canPrepare = permissions.includes('ajouter_salaires');

    const form = useForm({ period_year: String(defaultYear), period_month: String(defaultMonth) });
    const years = Array.from({ length: 4 }, (_, index) => defaultYear - 2 + index);

    const prepare = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(route('admin.payroll.store'));
    };

    return (
        <AdminLayout>
            <Head title="Paie mensuelle" />
            <PageHeader
                title="Paie mensuelle"
                subtitle="Préparez la paie du mois, vérifiez-la, validez-la, puis versez les salaires. Rien n'est versé avant la validation."
            >
                <Link
                    href={route('admin.salaries.index')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                    <Coins className="h-4 w-4" aria-hidden="true" /> Registre des salaires
                </Link>
            </PageHeader>

            {canPrepare && (
                <Card className="mb-6 p-5">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">Préparer un mois</h2>
                    <p className="mt-1 max-w-3xl text-sm text-ink-500">
                        Une ligne est créée pour chaque personne rémunérée. Les heures des enseignants payés à l'heure viennent du cahier de texte ; primes,
                        retenues et mode de versement se règlent ensuite ligne par ligne.
                    </p>
                    <form onSubmit={prepare} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <Field label="Mois" error={form.errors.period_month}>
                            <Select value={form.data.period_month} onChange={(e) => form.setData('period_month', e.target.value)}>
                                {Object.entries(monthLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Année" error={form.errors.period_year}>
                            <Select value={form.data.period_year} onChange={(e) => form.setData('period_year', e.target.value)}>
                                {years.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-50"
                        >
                            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Préparer la paie
                        </button>
                    </form>
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Période</th>
                                <th className="px-5 py-3">État</th>
                                <th className="px-5 py-3 text-right">Personnes</th>
                                <th className="px-5 py-3 text-right">Masse salariale</th>
                                <th className="px-5 py-3 text-right">Déjà versé</th>
                                <th className="px-5 py-3 text-right">Reste à verser</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {runs.map((run) => (
                                <tr key={run.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">
                                        <Link href={route('admin.payroll.show', run.id)} className="hover:underline">
                                            {run.label}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3">
                                        <RunState run={run} />
                                    </td>
                                    <td className="px-5 py-3 text-right text-ink-700">{run.lines_count}</td>
                                    <td className="whitespace-nowrap px-5 py-3 text-right text-ink-900">{fcfa(run.payroll)}</td>
                                    <td className="whitespace-nowrap px-5 py-3 text-right text-emerald-700">{fcfa(run.paid)}</td>
                                    <td className={`whitespace-nowrap px-5 py-3 text-right font-medium ${run.remaining > 0 ? 'text-ink-900' : 'text-ink-500'}`}>
                                        {fcfa(run.remaining)}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <IconLink href={route('admin.payroll.show', run.id)} label={`Ouvrir la paie ${run.of_label}`}>
                                            <Eye className="h-4 w-4" />
                                        </IconLink>
                                    </td>
                                </tr>
                            ))}
                            {runs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">
                                                {canPrepare ? 'Aucune paie pour le moment : préparez le premier mois ci-dessus.' : 'Aucune paie pour le moment.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
