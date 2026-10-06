import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Select, TextInput } from '@/Components/Admin/Field';
import { confirmAction } from '@/lib/confirm';
import { dateFr, ORDER_TONES, qty } from '@/lib/economat';
import { fcfa } from '@/lib/money';
import { PageProps } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Ban, Download, PackageCheck, Send, Wallet } from 'lucide-react';

interface Line {
    id: number;
    product: string;
    unit: string;
    quantity: number;
    unit_cost: number;
    received: number;
    remaining: number;
}

interface Props {
    order: {
        id: number;
        number: string;
        status: string;
        supplier: { id: number; name: string; contact_name: string | null; phone: string | null; email: string | null };
        ordered_at: string | null;
        expected_at: string | null;
        received_at: string | null;
        notes: string | null;
        creator: string | null;
        total: number;
        received_total: number;
        expense: { id: number; amount: number } | null;
        lines: Line[];
    };
    statuses: Record<string, string>;
}

export default function Show({ order, statuses }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canEdit = permissions.includes('modifier_stocks');
    const canExpense = permissions.includes('ajouter_comptabilite');
    const open = order.status === 'envoye' || order.status === 'partiel';

    const receive = useForm({ received: Object.fromEntries(order.lines.map((l) => [l.id, l.remaining])) as Record<number, number | string> });
    const expense = useForm({ payment_method: 'especes' });
    const errs = receive.errors as Record<string, string>;

    const act = async (name: 'send' | 'cancel', message: string, confirmLabel: string) => {
        if (await confirmAction({ title: confirmLabel, message, confirmLabel })) {
            router.post(route(`admin.purchase-orders.${name}`, order.id), {}, { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title={order.number} />
            <PageHeader title={`Bon de commande ${order.number}`} subtitle={`${order.supplier.name} · créé par ${order.creator ?? '—'}`}>
                <a href={route('admin.purchase-orders.pdf', order.id)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                    <Download className="h-4 w-4" aria-hidden="true" /> PDF
                </a>
                {canEdit && order.status === 'brouillon' && (
                    <button type="button" onClick={() => act('send', "Le bon passera au statut « Envoyé ». Pensez à transmettre le PDF au fournisseur.", 'Marquer comme envoyé')} className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
                        <Send className="h-4 w-4" aria-hidden="true" /> Marquer comme envoyé
                    </button>
                )}
                {canEdit && (order.status === 'brouillon' || order.status === 'envoye') && (
                    <button type="button" onClick={() => act('cancel', 'Annuler ce bon de commande ?', 'Annuler le bon')} className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                        <Ban className="h-4 w-4" aria-hidden="true" /> Annuler
                    </button>
                )}
            </PageHeader>

            <div className="mb-6 grid gap-4 sm:grid-cols-4">
                <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Statut</p>
                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${ORDER_TONES[order.status]}`}>{statuses[order.status]}</span>
                </Card>
                <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Montant commandé</p>
                    <p className="mt-2 text-xl font-bold tabular-nums text-ink-900">{fcfa(order.total)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Déjà reçu</p>
                    <p className="mt-2 text-xl font-bold tabular-nums text-emerald-700">{fcfa(order.received_total)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Livraison prévue</p>
                    <p className="mt-2 text-xl font-bold text-ink-900">{dateFr(order.expected_at)}</p>
                    {order.received_at && <p className="text-xs text-ink-500">reçu le {dateFr(order.received_at)}</p>}
                </Card>
            </div>

            <Card className="mb-6 overflow-hidden">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        receive.post(route('admin.purchase-orders.receive', order.id), { preserveScroll: true });
                    }}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Article</th>
                                    <th className="px-5 py-3 text-right">Commandé</th>
                                    <th className="px-5 py-3 text-right">Prix unitaire</th>
                                    <th className="px-5 py-3 text-right">Déjà reçu</th>
                                    {open && canEdit && <th className="px-5 py-3">Reçu aujourd'hui</th>}
                                    <th className="px-5 py-3 text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {order.lines.map((l) => (
                                    <tr key={l.id}>
                                        <td className="px-5 py-3 font-medium text-ink-900">{l.product}</td>
                                        <td className="px-5 py-3 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td>
                                        <td className="px-5 py-3 text-right tabular-nums text-ink-600">{fcfa(l.unit_cost)}</td>
                                        <td className={`px-5 py-3 text-right tabular-nums ${l.received >= l.quantity ? 'font-semibold text-emerald-700' : 'text-ink-600'}`}>{qty(l.received)}</td>
                                        {open && canEdit && (
                                            <td className="w-40 px-5 py-2">
                                                <TextInput aria-label={`Quantité reçue de ${l.product}`} type="number" min="0" max={l.remaining} step="0.01" disabled={l.remaining <= 0} value={receive.data.received[l.id] ?? ''} onChange={(e) => receive.setData('received', { ...receive.data.received, [l.id]: e.target.value })} />
                                            </td>
                                        )}
                                        <td className="px-5 py-3 text-right font-semibold tabular-nums">{fcfa(l.quantity * l.unit_cost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {errs.lines && <p role="alert" className="px-5 pt-3 text-sm font-medium text-red-600">{errs.lines}</p>}
                    {open && canEdit && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4">
                            <p className="text-sm text-ink-600">Les quantités reçues entrent en stock au prix du bon (coût moyen recalculé).</p>
                            <button type="submit" disabled={receive.processing} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-ink-900 shadow-sm hover:bg-gold-400 disabled:opacity-50">
                                <PackageCheck className="h-4 w-4" aria-hidden="true" /> Enregistrer la réception
                            </button>
                        </div>
                    )}
                </form>
            </Card>

            {order.received_total > 0 && canExpense && (
                <Card className="mb-6 p-5">
                    <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                        <Wallet className="h-5 w-5 text-gold-700" aria-hidden="true" /> Comptabilité
                    </h2>
                    {order.expense ? (
                        <p className="text-sm text-ink-600">
                            Dépense de <strong>{fcfa(order.expense.amount)}</strong> enregistrée.{' '}
                            <Link href={route('admin.expenses.index')} className="font-semibold text-gold-700 hover:underline">
                                Voir les dépenses
                            </Link>
                        </p>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                expense.post(route('admin.purchase-orders.expense', order.id), { preserveScroll: true });
                            }}
                            className="flex flex-wrap items-end gap-3"
                        >
                            <p className="basis-full text-sm text-ink-600">Enregistrez la valeur reçue ({fcfa(order.received_total)}) comme dépense « Achats ».</p>
                            <div className="w-56">
                                <Select aria-label="Mode de paiement" value={expense.data.payment_method} onChange={(e) => expense.setData('payment_method', e.target.value)}>
                                    <option value="especes">Espèces</option>
                                    <option value="virement">Virement</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="autre">Autre</option>
                                </Select>
                            </div>
                            <button type="submit" disabled={expense.processing} className="rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                                Enregistrer la dépense
                            </button>
                            {(expense.errors as Record<string, string>).expense && <p role="alert" className="basis-full text-sm font-medium text-red-600">{(expense.errors as Record<string, string>).expense}</p>}
                        </form>
                    )}
                </Card>
            )}

            {order.notes && (
                <Card className="p-5">
                    <h2 className="mb-1 text-sm font-semibold text-ink-700">Note</h2>
                    <p className="whitespace-pre-line text-sm text-ink-600">{order.notes}</p>
                </Card>
            )}
        </AdminLayout>
    );
}
