import AdminLayout from '@/Layouts/AdminLayout';
import AttachmentsPanel from '@/Components/Admin/AttachmentsPanel';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { IconAnchor, IconButton } from '@/Components/Admin/IconButton';
import { Invoice } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Download, Inbox, Trash2 } from 'lucide-react';

interface Props {
    invoice: Invoice;
    methods: Record<string, string>;
}

const fcfa = (v: number | string) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(v)))} FCFA`;

export default function Show({ invoice, methods }: Props) {
    const paid = (invoice.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const net = Number(invoice.amount) - Number(invoice.discount);
    const balance = Math.max(0, round2(net - paid));

    function round2(n: number) {
        return Math.round(n * 100) / 100;
    }

    const editForm = useForm({
        label: invoice.label,
        amount: invoice.amount,
        discount: invoice.discount,
        due_date: invoice.due_date ?? '',
        notes: invoice.notes ?? '',
    });

    const paymentForm = useForm({
        amount: balance > 0 ? balance : '',
        method: 'especes',
        reference: '',
        paid_at: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.patch(route('admin.invoices.update', invoice.id), { preserveScroll: true });
    };

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        paymentForm.post(route('admin.invoices.payments.store', invoice.id), {
            preserveScroll: true,
            onSuccess: () => paymentForm.reset(),
        });
    };

    const deletePayment = (paymentId: number) => {
        if (confirm('Supprimer ce paiement ?')) {
            router.delete(route('admin.invoices.payments.destroy', [invoice.id, paymentId]), { preserveScroll: true });
        }
    };

    const deleteInvoice = () => {
        if (confirm('Supprimer cette facture ? Cette action est irréversible.')) {
            router.delete(route('admin.invoices.destroy', invoice.id));
        }
    };

    return (
        <AdminLayout>
            <Head title={`Facture ${invoice.reference}`} />
            <PageHeader title={`Facture ${invoice.reference}`} subtitle={`${invoice.student?.first_name} ${invoice.student?.last_name} (${invoice.student?.matricule})`}>
                <button onClick={deleteInvoice} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Supprimer
                </button>
            </PageHeader>

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card className="p-4 text-center">
                    <p className="text-xl font-bold text-ink-900">{fcfa(net)}</p>
                    <p className="text-xs text-ink-500">Montant net</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-xl font-bold text-emerald-700">{fcfa(paid)}</p>
                    <p className="text-xs text-ink-500">Payé</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-xl font-bold text-red-600">{fcfa(balance)}</p>
                    <p className="text-xs text-ink-500">Solde restant</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-xl font-bold text-ink-900">
                        {balance <= 0 ? 'Payée' : paid > 0 ? 'Partielle' : 'Impayée'}
                    </p>
                    <p className="text-xs text-ink-500">Statut</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="overflow-hidden">
                        <div className="border-b border-ink-100 p-5">
                            <h2 className="font-serif text-lg font-semibold text-ink-900">Paiements</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3">Reçu</th>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Mode</th>
                                        <th className="px-5 py-3">Montant</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {(invoice.payments ?? []).map((p) => (
                                        <tr key={p.id}>
                                            <td className="px-5 py-3 font-medium text-ink-900">{p.receipt_number}</td>
                                            <td className="px-5 py-3 text-ink-600">{new Date(p.paid_at).toLocaleDateString('fr-FR')}</td>
                                            <td className="px-5 py-3 text-ink-600">{methods[p.method]}</td>
                                            <td className="px-5 py-3 font-medium text-ink-900">{fcfa(p.amount)}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <IconAnchor
                                                        href={route('admin.invoices.payments.receipt', [invoice.id, p.id])}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        label="Télécharger le reçu"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </IconAnchor>
                                                    <IconButton onClick={() => deletePayment(p.id)} label="Supprimer" tone="danger">
                                                        <Trash2 className="h-4 w-4" />
                                                    </IconButton>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(invoice.payments ?? []).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-8 text-center">
                                                <div className="flex flex-col items-center gap-3 text-ink-500">
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                        <Inbox className="h-6 w-6" />
                                                    </span>
                                                    <p className="text-sm">Aucun paiement enregistré.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Modifier la facture</h2>
                        <form onSubmit={submitEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <Field label="Libellé" required error={editForm.errors.label}>
                                    <TextInput value={editForm.data.label} onChange={(e) => editForm.setData('label', e.target.value)} />
                                </Field>
                            </div>
                            <Field label="Montant (FCFA)" required error={editForm.errors.amount}>
                                <TextInput type="number" value={editForm.data.amount} onChange={(e) => editForm.setData('amount', e.target.value)} />
                            </Field>
                            <Field label="Remise (FCFA)" error={editForm.errors.discount}>
                                <TextInput type="number" value={editForm.data.discount} onChange={(e) => editForm.setData('discount', e.target.value)} />
                            </Field>
                            <Field label="Date d'échéance" error={editForm.errors.due_date}>
                                <TextInput type="date" value={editForm.data.due_date ?? ''} onChange={(e) => editForm.setData('due_date', e.target.value)} />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Notes" error={editForm.errors.notes}>
                                    <Textarea rows={2} value={editForm.data.notes ?? ''} onChange={(e) => editForm.setData('notes', e.target.value)} />
                                </Field>
                            </div>
                            <div className="sm:col-span-2">
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Enregistrer un paiement</h2>
                        {balance <= 0 ? (
                            <p className="text-sm text-emerald-700">Cette facture est entièrement payée.</p>
                        ) : (
                            <form onSubmit={submitPayment} className="space-y-4">
                                <Field label="Montant (FCFA)" required error={paymentForm.errors.amount}>
                                    <TextInput
                                        type="number"
                                        step="0.01"
                                        max={balance}
                                        value={paymentForm.data.amount}
                                        onChange={(e) => paymentForm.setData('amount', e.target.value ? Number(e.target.value) : '')}
                                    />
                                </Field>
                                <Field label="Mode de paiement" required error={paymentForm.errors.method}>
                                    <Select value={paymentForm.data.method} onChange={(e) => paymentForm.setData('method', e.target.value)}>
                                        {Object.entries(methods).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field label="Référence" error={paymentForm.errors.reference}>
                                    <TextInput value={paymentForm.data.reference} onChange={(e) => paymentForm.setData('reference', e.target.value)} />
                                </Field>
                                <Field label="Date de paiement" required error={paymentForm.errors.paid_at}>
                                    <TextInput type="date" value={paymentForm.data.paid_at} onChange={(e) => paymentForm.setData('paid_at', e.target.value)} />
                                </Field>
                                <button
                                    type="submit"
                                    disabled={paymentForm.processing}
                                    className="w-full rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50"
                                >
                                    Enregistrer le paiement
                                </button>
                            </form>
                        )}
                    </Card>

                    <AttachmentsPanel target="invoice" targetId={invoice.id} attachments={invoice.attachments} title="Pièces justificatives" hint="Preuve de paiement, reçu Wave / Orange Money, bordereau (PDF, JPG, PNG, DOC, 5 Mo maximum)." />

                    <Card className="mt-6 p-6">
                        <Link href={route('admin.invoices.index')} className="text-sm font-medium text-ink-500 hover:text-ink-800">
                            ← Retour aux factures
                        </Link>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
