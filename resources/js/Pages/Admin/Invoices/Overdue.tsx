import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FinanceTabs from '@/Components/Admin/FinanceTabs';
import PageHeader from '@/Components/Admin/PageHeader';
import { SearchField } from '@/Components/Admin/FilterBar';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { fcfa } from '@/lib/money';
import { Invoice, PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BellRing, Eye, HandCoins, Inbox, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';

type OverdueInvoice = Invoice & {
    student: { id: number; first_name: string; last_name: string; matricule: string; phone?: string | null; email?: string | null };
    computed_balance: number;
    /** Jours depuis l'échéance : négatif avant, null sans échéance. */
    days_past_due: number | null;
    reminders_count: number;
    last_reminder_at: string | null;
};

interface Props {
    invoices: OverdueInvoice[];
    totalOutstanding: number;
    totalOverdue: number;
    familiesOverdue: number;
}

type Bucket = 'all' | 'upcoming' | 'b30' | 'b60' | 'b90' | 'b90p';

/** Tranches d'ancienneté d'une facture à régler (jours de retard). */
const BUCKETS: { key: Exclude<Bucket, 'all'>; label: string; tone: string; bar: string; test: (d: number | null) => boolean }[] = [
    { key: 'upcoming', label: 'À venir', tone: 'text-sky-700', bar: 'bg-sky-400', test: (d) => d === null || d <= 0 },
    { key: 'b30', label: '1 – 30 j', tone: 'text-amber-700', bar: 'bg-amber-400', test: (d) => d !== null && d >= 1 && d <= 30 },
    { key: 'b60', label: '31 – 60 j', tone: 'text-orange-700', bar: 'bg-orange-500', test: (d) => d !== null && d >= 31 && d <= 60 },
    { key: 'b90', label: '61 – 90 j', tone: 'text-rose-700', bar: 'bg-rose-500', test: (d) => d !== null && d >= 61 && d <= 90 },
    { key: 'b90p', label: '+ de 90 j', tone: 'text-rose-900', bar: 'bg-rose-800', test: (d) => d !== null && d > 90 },
];

const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function Age({ days }: { days: number | null }) {
    const pill = 'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold';

    if (days === null) return <span className="text-xs text-ink-500">Sans échéance</span>;
    if (days > 0) return <span className={`${pill} ${days > 60 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{days} j de retard</span>;
    if (days === 0) return <span className={`${pill} bg-amber-100 text-amber-800`}>Échéance aujourd'hui</span>;

    return <span className={`${pill} bg-sky-100 text-sky-700`}>Dans {-days} j</span>;
}

export default function Overdue({ invoices, totalOutstanding, totalOverdue, familiesOverdue }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canCollect = permissions.includes('ajouter_comptabilite');
    const canRemind = permissions.includes('modifier_comptabilite');
    const [bucket, setBucket] = useState<Bucket>('all');
    const [q, setQ] = useState('');

    const totals = useMemo(
        () => BUCKETS.map((b) => ({ ...b, count: invoices.filter((i) => b.test(i.days_past_due)).length, sum: invoices.filter((i) => b.test(i.days_past_due)).reduce((a, i) => a + i.computed_balance, 0) })),
        [invoices],
    );
    const maxSum = Math.max(1, ...totals.map((t) => t.sum));

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const test = BUCKETS.find((b) => b.key === bucket)?.test;

        return invoices
            .filter((i) => !test || test(i.days_past_due))
            .filter((i) => !needle || `${i.student.first_name} ${i.student.last_name} ${i.student.matricule} ${i.reference}`.toLowerCase().includes(needle))
            .sort((a, b) => (b.days_past_due ?? -9999) - (a.days_past_due ?? -9999));
    }, [invoices, bucket, q]);

    const remind = async (invoice: OverdueInvoice) => {
        const name = `${invoice.student.first_name} ${invoice.student.last_name}`;
        const confirmed = await confirmAction({
            title: 'Relancer la famille',
            message: `Envoyer une relance à la famille de ${name} pour ses factures en retard ? Le message part par e-mail, notification et EEHT Connect, selon ses contacts.`,
            confirmLabel: 'Envoyer la relance',
        });

        if (confirmed) {
            router.post(route('admin.invoices.remind'), { student_id: invoice.student.id }, { preserveScroll: true });
        }
    };

    const actions = (inv: OverdueInvoice) => (
        <div className="flex justify-end gap-1">
            <IconLink href={route('admin.invoices.show', inv.id)} label="Consulter">
                <Eye className="h-4 w-4" />
            </IconLink>
            {canCollect && (
                <IconLink href={route('admin.cashier.create', { student: inv.student.id, invoice: inv.id })} label={`Encaisser pour ${inv.student.first_name} ${inv.student.last_name}`}>
                    <HandCoins className="h-4 w-4" />
                </IconLink>
            )}
            {canRemind && (inv.days_past_due ?? 0) > 0 && (
                <IconButton onClick={() => remind(inv)} label={`Relancer la famille de ${inv.student.first_name} ${inv.student.last_name}`}>
                    <BellRing className="h-4 w-4" />
                </IconButton>
            )}
        </div>
    );

    return (
        <AdminLayout>
            <Head title="Impayés" />
            <PageHeader title="Situation des impayés" subtitle="Ce qui reste à percevoir, classé par ancienneté, avec la dernière relance envoyée à chaque famille." />
            <FinanceTabs current="overdue" />

            <section aria-label="Synthèse des impayés" className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-6 text-white shadow-elevated">
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Total des impayés</p>
                    <p className="mt-2 font-serif text-4xl font-bold tabular-nums">{fcfa(totalOutstanding)}</p>
                    <dl className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Dont en retard</dt>
                            <dd className={`mt-0.5 text-lg font-bold tabular-nums ${totalOverdue > 0 ? 'text-amber-300' : ''}`}>{fcfa(totalOverdue)}</dd>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                            <dt className="text-xs text-white/60">Familles en retard</dt>
                            <dd className="mt-0.5 text-lg font-bold tabular-nums">{familiesOverdue}</dd>
                        </div>
                    </dl>
                </div>
                <Card className="p-6">
                    <h2 className="font-serif text-lg font-semibold text-ink-900">Ancienneté des impayés</h2>
                    <ul className="mt-4 space-y-3">
                        {totals.map((t) => (
                            <li key={t.key}>
                                <div className="mb-1 flex items-baseline justify-between text-sm">
                                    <span className={`font-medium ${t.tone}`}>{t.label}</span>
                                    <span className="tabular-nums text-ink-500">
                                        {fcfa(t.sum)} <span className="ml-1 text-xs text-ink-400">· {t.count} facture(s)</span>
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                                    <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${(t.sum / maxSum) * 100}%` }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </section>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div role="tablist" aria-label="Filtrer par ancienneté" className="inline-flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1">
                    {[{ key: 'all' as Bucket, label: 'Toutes', count: invoices.length }, ...totals.map((t) => ({ key: t.key as Bucket, label: t.label, count: t.count }))].map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={bucket === t.key}
                            onClick={() => setBucket(t.key)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${bucket === t.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                        >
                            {t.label}
                            <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${bucket === t.key ? 'bg-ink-900 text-white' : 'bg-ink-200/70 text-ink-600'}`}>{t.count}</span>
                        </button>
                    ))}
                </div>
                <div className="min-w-[14rem] flex-1">
                    <SearchField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un élève, un matricule, une référence…" />
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Facture</th>
                                <th className="px-5 py-3">Échéance</th>
                                <th className="px-5 py-3 text-right">Solde dû</th>
                                <th className="px-5 py-3">Relances</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {rows.map((inv) => (
                                <tr key={inv.id} className="transition-colors hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 font-serif text-xs font-bold text-gold-300">
                                                {`${inv.student.first_name[0] ?? ''}${inv.student.last_name[0] ?? ''}`.toUpperCase()}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium text-ink-900">{inv.student.first_name} {inv.student.last_name}</span>
                                                <span className="flex items-center gap-1.5 text-xs text-ink-500">
                                                    {inv.student.matricule}
                                                    {(inv.student.phone ?? inv.student.email) && (
                                                        <>
                                                            <span aria-hidden="true">·</span>
                                                            <Phone className="h-3 w-3" aria-hidden="true" />
                                                            {inv.student.phone ?? inv.student.email}
                                                        </>
                                                    )}
                                                </span>
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="block text-ink-800">{inv.label}</span>
                                        <span className="font-mono text-xs text-ink-500">{inv.reference}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="block text-ink-600">{inv.due_date ? dateFr(inv.due_date) : '—'}</span>
                                        <span className="mt-1 inline-block"><Age days={inv.days_past_due} /></span>
                                    </td>
                                    <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-rose-700">{fcfa(inv.computed_balance)}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {inv.reminders_count > 0 ? (
                                            <>
                                                {inv.reminders_count} envoyée{inv.reminders_count > 1 ? 's' : ''}
                                                {inv.last_reminder_at && <span className="block text-xs text-ink-500">dernière le {dateFr(inv.last_reminder_at)}</span>}
                                            </>
                                        ) : (
                                            <span className="text-ink-400">Aucune</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">{actions(inv)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <ul className="divide-y divide-ink-100 md:hidden">
                    {rows.map((inv) => (
                        <li key={inv.id} className="px-4 py-3.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-ink-900">{inv.student.first_name} {inv.student.last_name}</p>
                                    <p className="truncate text-xs text-ink-500">{inv.label}</p>
                                </div>
                                <p className="shrink-0 font-bold tabular-nums text-rose-700">{fcfa(inv.computed_balance)}</p>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <Age days={inv.days_past_due} />
                                {actions(inv)}
                            </div>
                        </li>
                    ))}
                </ul>

                {rows.length === 0 && (
                    <div className="flex flex-col items-center gap-3 px-5 py-12 text-ink-500">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <p className="text-sm">{invoices.length === 0 ? 'Aucun impayé : toutes les factures sont réglées.' : 'Aucune facture ne correspond à ces filtres.'}</p>
                    </div>
                )}
            </Card>
        </AdminLayout>
    );
}
