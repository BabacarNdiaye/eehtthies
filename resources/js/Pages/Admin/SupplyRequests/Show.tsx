import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { confirmAction } from '@/lib/confirm';
import { dateFr, qty, REQUEST_TONES } from '@/lib/economat';
import { PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Check, PackageCheck, X } from 'lucide-react';

interface Props {
    supplyRequest: {
        id: number;
        number: string;
        status: string;
        purpose: string;
        notes: string | null;
        requester: string | null;
        class: string | null;
        needed_at: string | null;
        reviewed_at: string | null;
        delivered_at: string | null;
        lines: { id: number; product: string; unit: string; quantity: number; stock: number; enough: boolean }[];
    };
    statuses: Record<string, string>;
}

export default function Show({ supplyRequest: r, statuses }: Props) {
    const { props } = usePage<PageProps & { errors: Record<string, string> }>();
    const canEdit = props.auth.permissions.includes('modifier_stocks');
    const missing = r.lines.filter((l) => !l.enough);

    const act = async (name: 'approve' | 'refuse' | 'deliver', message: string, label: string) => {
        if (await confirmAction({ title: label, message, confirmLabel: label })) {
            router.post(route(`admin.supply-requests.${name}`, r.id), {}, { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title={r.number} />
            <PageHeader title={r.purpose} subtitle={`Demande ${r.number} · ${[r.class, r.requester].filter(Boolean).join(' · ') || '—'}`}>
                {canEdit && r.status === 'en_attente' && (
                    <>
                        <button type="button" onClick={() => act('refuse', 'Refuser cette demande ?', 'Refuser')} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                            <X className="h-4 w-4" aria-hidden="true" /> Refuser
                        </button>
                        <button type="button" onClick={() => act('approve', 'Approuver cette demande ?', 'Approuver')} className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
                            <Check className="h-4 w-4" aria-hidden="true" /> Approuver
                        </button>
                    </>
                )}
                {canEdit && r.status === 'approuvee' && (
                    <button type="button" onClick={() => act('deliver', 'Les articles sortent du stock. Confirmer la livraison ?', 'Livrer le matériel')} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-ink-900 hover:bg-gold-400">
                        <PackageCheck className="h-4 w-4" aria-hidden="true" /> Livrer le matériel
                    </button>
                )}
            </PageHeader>

            {props.errors?.status && (
                <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
                    {props.errors.status}
                </div>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Statut</p>
                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${REQUEST_TONES[r.status]}`}>{statuses[r.status]}</span>
                    {r.delivered_at && <p className="mt-2 text-xs text-ink-500">livrée le {dateFr(r.delivered_at)}</p>}
                </Card>
                <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Nécessaire pour le</p>
                    <p className="mt-2 text-xl font-bold text-ink-900">{dateFr(r.needed_at)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Disponibilité</p>
                    <p className={`mt-2 text-xl font-bold ${missing.length ? 'text-rose-700' : 'text-emerald-700'}`}>{missing.length ? `${missing.length} article(s) manquant(s)` : 'Tout est en stock'}</p>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                        <tr>
                            <th className="px-5 py-3">Article</th>
                            <th className="px-5 py-3 text-right">Demandé</th>
                            <th className="px-5 py-3 text-right">En stock</th>
                            <th className="px-5 py-3">Disponibilité</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {r.lines.map((l) => (
                            <tr key={l.id}>
                                <td className="px-5 py-3 font-medium text-ink-900">{l.product}</td>
                                <td className="px-5 py-3 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td>
                                <td className="px-5 py-3 text-right tabular-nums text-ink-600">{qty(l.stock)} {l.unit}</td>
                                <td className="px-5 py-3">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${l.enough ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{l.enough ? 'Disponible' : 'Insuffisant'}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {r.notes && (
                <Card className="mt-6 p-5">
                    <h2 className="mb-1 text-sm font-semibold text-ink-700">Précisions</h2>
                    <p className="whitespace-pre-line text-sm text-ink-600">{r.notes}</p>
                </Card>
            )}
        </AdminLayout>
    );
}
