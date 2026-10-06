import Card from '@/Components/Admin/Card';
import { Select } from '@/Components/Admin/Field';
import PageHeader from '@/Components/Admin/PageHeader';
import CouncilStatusBadge from '@/Components/Council/CouncilStatusBadge';
import useCompactChart, { axisLabel } from '@/hooks/useCompactChart';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Indicators {
    examined: number;
    evaluated: number;
    average: number | null;
    pass_rate: number | null;
    red: number;
    orange: number;
    unjustified_hours: number;
}

interface Props {
    filters: { academic_year_id: number | null; formation_id: number | null; school_class_id: number | null; term: string };
    statuses: { programmed: number; held: number; to_validate: number; closed: number };
    indicators: Indicators;
    decisions: { label: string; category: string; color: string; count: number }[];
    byClass: (Indicators & { label: string })[];
    byFormation: { label: string; green: number; orange: number; red: number }[];
    byTerm: (Indicators & { label: string })[];
    followUps: { total: number; done: number; open: number; overdue: number; abandoned: number; rate: number | null; statuses: Record<string, number> };
    councils: (Indicators & { id: number; class: string | null; formation: string | null; term: string; year: string | null; status: string; status_label: string; decisions: number; follow_ups: number; follow_ups_done: number })[];
    years: { id: number; label: string }[];
    formations: { id: number; name: string }[];
    classes: { id: number; name: string }[];
    terms: string[];
}

// Teintes des types de décision (DecisionType::TONES), lisibles sur fond blanc.
const TONE_FILL: Record<string, string> = { emerald: '#059669', sky: '#0284c7', violet: '#7c3aed', amber: '#d97706', orange: '#ea580c', red: '#dc2626', ink: '#475569' };
const FOLLOW_UP_LABELS: Record<string, string> = { todo: 'À faire', in_progress: 'En cours', done: 'Réalisées', not_done: 'Non réalisées', abandoned: 'Abandonnées' };
const fr = (value: number | null, digits = 2) => (value === null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: digits }));

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <Card className="p-4">
            <p className="text-xs text-ink-500">{label}</p>
            <p className="font-serif text-2xl font-bold text-ink-900">{value}</p>
            {hint && <p className="text-xs text-ink-500">{hint}</p>}
        </Card>
    );
}

/** Graphique avec titre et, pour les lecteurs d'écran, le même contenu en tableau. */
function Chart({ title, empty, rows, children }: { title: string; empty: boolean; rows: [string, string][]; children: ReactNode }) {
    return (
        <Card className="p-5">
            <h2 className="mb-3 font-serif text-base font-bold text-ink-900">{title}</h2>
            {empty ? (
                <p className="text-sm text-ink-500">Aucune donnée pour ces filtres.</p>
            ) : (
                <>
                    <div aria-hidden="true">{children}</div>
                    {/* Réservé aux lecteurs d'écran (sr-only) : jamais affiché, donc pas de mise en cartes. */}
                    <table className="sr-only" data-table="scroll">
                        <caption>{title}</caption>
                        <tbody>
                            {rows.map(([label, value]) => (
                                <tr key={label}>
                                    <th scope="row">{label}</th>
                                    <td>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </Card>
    );
}

/** Tableau de bord Direction des conseils de classe (E11, DIR-01 à DIR-05). */
export default function Dashboard(props: Props) {
    const { filters, statuses, indicators, decisions, byClass, byFormation, byTerm, followUps, councils } = props;
    const compact = useCompactChart();
    const query = Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value ?? '']));
    const go = (overrides: Partial<Record<keyof Props['filters'], string>>) =>
        router.get(route('admin.council-dashboard.index'), { ...query, ...overrides }, { preserveState: true, preserveScroll: true, replace: true });

    return (
        <AdminLayout>
            <Head title="Tableau de bord des conseils" />
            <PageHeader title="Tableau de bord des conseils" subtitle="Avancement des conseils de classe, résultats figés au moment de chaque conseil, décisions et actions de suivi.">
                <a href={route('admin.council-dashboard.export', query)} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                    <Download className="h-4 w-4" aria-hidden="true" /> Exporter (Excel)
                </a>
            </PageHeader>

            <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select aria-label="Année scolaire" value={filters.academic_year_id ?? ''} onChange={(e) => go({ academic_year_id: e.target.value, school_class_id: '' })}>
                    <option value="">Toutes les années</option>
                    {props.years.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.label}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Formation" value={filters.formation_id ?? ''} onChange={(e) => go({ formation_id: e.target.value, school_class_id: '' })}>
                    <option value="">Toutes les formations</option>
                    {props.formations.map((formation) => (
                        <option key={formation.id} value={formation.id}>
                            {formation.name}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Classe" value={filters.school_class_id ?? ''} onChange={(e) => go({ school_class_id: e.target.value })}>
                    <option value="">Toutes les classes</option>
                    {props.classes.map((schoolClass) => (
                        <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Période" value={filters.term} onChange={(e) => go({ term: e.target.value })}>
                    <option value="">Toutes les périodes</option>
                    {props.terms.map((term) => (
                        <option key={term} value={term}>
                            {term}
                        </option>
                    ))}
                </Select>
            </Card>

            <h2 className="sr-only">Avancement des conseils</h2>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Programmés" value={String(statuses.programmed)} hint="brouillons et programmés" />
                <Kpi label="Réalisés" value={String(statuses.held)} hint="en séance ou PV en rédaction" />
                <Kpi label="À valider" value={String(statuses.to_validate)} />
                <Kpi label="Clôturés" value={String(statuses.closed)} />
            </div>

            <h2 className="sr-only">Indicateurs académiques</h2>
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Kpi label="Élèves examinés" value={String(indicators.examined)} hint={`${indicators.evaluated} avec une moyenne`} />
                <Kpi label="Taux ≥ 10" value={indicators.pass_rate === null ? '—' : `${fr(indicators.pass_rate, 1)} %`} hint={`moyenne ${fr(indicators.average)}`} />
                <Kpi label="Attention" value={String(indicators.red)} hint="pastille rouge" />
                <Kpi label="Vigilance" value={String(indicators.orange)} hint="pastille orange" />
                <Kpi label="Absences non justifiées" value={`${fr(indicators.unjustified_hours, 1)} h`} />
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
                <Chart title="Répartition des décisions" empty={decisions.length === 0} rows={decisions.map((row) => [row.label, String(row.count)])}>
                    <ResponsiveContainer width="100%" height={Math.max(180, decisions.length * 34)}>
                        <BarChart data={decisions} layout="vertical" margin={{ left: 8, right: 16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <YAxis type="category" dataKey="label" width={compact ? 110 : 170} tick={{ fontSize: 11 }} stroke="#6c86a3" tickFormatter={(value) => axisLabel(value, compact, 16)} />
                            <Tooltip />
                            <Bar dataKey="count" name="Décisions" radius={[0, 4, 4, 0]}>
                                {decisions.map((row) => (
                                    <Cell key={row.label} fill={TONE_FILL[row.color] ?? '#475569'} aria-label={`${row.label} : ${row.count}`} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Chart>

                <Chart title="Taux ≥ 10 par classe" empty={byClass.length === 0} rows={byClass.map((row) => [row.label, row.pass_rate === null ? '—' : `${fr(row.pass_rate, 1)} %`])}>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={byClass}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#6c86a3" interval={0} tickFormatter={(value) => axisLabel(value, compact, 12)} angle={compact ? -40 : -15} textAnchor="end" height={compact ? 80 : 60} />
                            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip formatter={(value: number) => `${fr(value, 1)} %`} />
                            <Bar dataKey="pass_rate" name="Taux ≥ 10" fill="#059669" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Chart>

                <Chart
                    title="Pastilles par formation"
                    empty={byFormation.length === 0}
                    rows={byFormation.map((row) => [row.label, `${row.green} favorable(s), ${row.orange} vigilance, ${row.red} attention`])}
                >
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={byFormation}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#6c86a3" interval={0} tickFormatter={(value) => axisLabel(value, compact, 14)} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="green" name="Favorable" stackId="a" fill="#059669" />
                            <Bar dataKey="orange" name="Vigilance" stackId="a" fill="#d97706" />
                            <Bar dataKey="red" name="Attention" stackId="a" fill="#dc2626" />
                        </BarChart>
                    </ResponsiveContainer>
                </Chart>

                <Chart title="Comparaison des périodes" empty={byTerm.length === 0} rows={byTerm.map((row) => [row.label, `${row.pass_rate === null ? '—' : `${fr(row.pass_rate, 1)} %`} ; ${row.red} en attention`])}>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={byTerm}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaef" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#6c86a3" />
                            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6c86a3" />
                            <Tooltip formatter={(value: number) => `${fr(value, 1)} %`} />
                            <Bar dataKey="pass_rate" name="Taux ≥ 10" fill="#243a52" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Chart>
            </div>

            <Card className="mb-6 p-5">
                <h2 className="font-serif text-base font-bold text-ink-900">Actions de suivi</h2>
                {followUps.total === 0 ? (
                    <p className="mt-2 text-sm text-ink-500">Aucune action de suivi pour ces filtres.</p>
                ) : (
                    <>
                        <p className="mt-1 text-sm text-ink-600">
                            <strong className="font-serif text-2xl text-ink-900">{followUps.rate === null ? '—' : `${fr(followUps.rate, 1)} %`}</strong> réalisées ({followUps.done} sur{' '}
                            {followUps.total - followUps.abandoned}, hors abandonnées) · {followUps.overdue} en retard
                        </p>
                        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`Taux de réalisation : ${followUps.rate ?? 0} %`}>
                            <div className="bg-emerald-600" style={{ width: `${followUps.rate ?? 0}%` }} />
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-700">
                            {Object.entries(followUps.statuses).map(([key, count]) => (
                                <li key={key}>
                                    {FOLLOW_UP_LABELS[key] ?? key} : <strong>{count}</strong>
                                </li>
                            ))}
                        </ul>
                        <Link href={route('admin.follow-ups.index')} className="mt-3 inline-block text-sm font-semibold text-ink-900 underline">
                            Voir les actions de suivi
                        </Link>
                    </>
                )}
            </Card>

            <Card className="overflow-hidden">
                <h2 className="border-b border-ink-100 px-5 py-3 font-serif text-base font-bold text-ink-900">Conseils ({councils.length})</h2>
                {councils.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-ink-500">Aucun conseil pour ces filtres.</p>
                ) : (
                    <ul className="divide-y divide-ink-100">
                        {councils.map((council) => (
                            <li key={council.id}>
                                <Link href={route('admin.councils.show', council.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-ink-50">
                                    <span className="min-w-0 flex-1 basis-48">
                                        <span className="block font-semibold text-ink-900">
                                            {council.class} · {council.term}
                                        </span>
                                        <span className="text-xs text-ink-500">
                                            {council.formation} · {council.year}
                                        </span>
                                    </span>
                                    <CouncilStatusBadge status={council.status} label={council.status_label} />
                                    <span className="text-ink-700">{council.pass_rate === null ? '—' : `${fr(council.pass_rate, 1)} % ≥ 10`}</span>
                                    <span className="text-ink-700">
                                        {council.red} attention · {council.orange} vigilance
                                    </span>
                                    <span className="text-ink-700">
                                        {council.follow_ups_done}/{council.follow_ups} actions
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </AdminLayout>
    );
}
