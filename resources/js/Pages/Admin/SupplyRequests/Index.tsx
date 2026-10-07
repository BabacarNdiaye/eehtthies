import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { dateFr, REQUEST_TONES } from '@/lib/economat';
import { Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

interface Row {
    id: number;
    number: string;
    status: string;
    purpose: string;
    requester: string | null;
    class: string | null;
    needed_at: string | null;
    lines: number;
    created_at: string;
}

interface Props {
    requests: Paginated<Row>;
    counts: Record<string, number>;
    statuses: Record<string, string>;
    filters: { status?: string };
}

export default function Index({ requests, counts, statuses, filters }: Props) {
    const total = Object.values(counts).reduce((a, b) => a + Number(b), 0);
    const tabs = [{ key: '', label: 'Toutes', count: total }, ...Object.entries(statuses).map(([key, label]) => ({ key, label, count: Number(counts[key] ?? 0) }))];

    return (
        <AdminLayout>
            <Head title="Demandes de matériel" />
            <PageHeader title="Demandes de matériel" subtitle="Les ateliers et les classes demandent le matériel et les denrées dont ils ont besoin ; l'économe approuve puis livre." action={{ label: 'Nouvelle demande', href: route('admin.supply-requests.create') }} />

            <div role="tablist" aria-label="Filtrer par statut" className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1">
                {tabs.map((t) => {
                    const active = (filters.status ?? '') === t.key;

                    return (
                        <button
                            key={t.key || 'all'}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => router.get(route('admin.supply-requests.index'), { status: t.key }, { preserveState: true, replace: true })}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${active ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                        >
                            {t.label}
                            <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-ink-900 text-white' : 'bg-ink-200/70 text-ink-600'}`}>{t.count}</span>
                        </button>
                    );
                })}
            </div>

            <Card className="overflow-hidden">
                <ul className="divide-y divide-ink-100">
                    {requests.data.map((r) => (
                        <li key={r.id}>
                            <Link href={route('admin.supply-requests.show', r.id)} className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-ink-50/70">
                                <div className="min-w-0 flex-1 basis-60">
                                    <p className="truncate font-semibold text-ink-900">{r.purpose}</p>
                                    <p className="truncate text-xs text-ink-500">
                                        <span className="font-mono">{r.number}</span> · {[r.class, r.requester].filter(Boolean).join(' · ') || '—'} · {r.lines} article(s)
                                    </p>
                                </div>
                                <p className="text-sm text-ink-600">{r.needed_at ? `Pour le ${dateFr(r.needed_at)}` : `Demandée le ${dateFr(r.created_at)}`}</p>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REQUEST_TONES[r.status]}`}>{statuses[r.status]}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
                {requests.data.length === 0 && (
                    <div className="flex flex-col items-center gap-3 px-5 py-12 text-ink-500">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <p className="text-sm">Aucune demande.</p>
                    </div>
                )}
                <Pagination data={requests} />
            </Card>
        </AdminLayout>
    );
}
