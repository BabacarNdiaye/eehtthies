import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Head, Link, router } from '@inertiajs/react';
import { Lock, Trash2 } from 'lucide-react';

interface Line {
    id: number;
    label: string | null;
    debit: string | number;
    credit: string | number;
    account: { code: string; name: string };
}

interface Entry {
    id: number;
    entry_date: string;
    reference: string;
    description: string;
    is_auto: boolean;
    journal: { code: string; name: string };
    lines: Line[];
    created_by?: { name: string } | null;
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function Show({ entry }: { entry: Entry }) {
    const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);

    const destroy = () => {
        if (confirm('Supprimer cette écriture manuelle ?')) {
            router.delete(route('admin.accounting.journal-entries.destroy', entry.id));
        }
    };

    return (
        <AdminLayout>
            <Head title={`Écriture ${entry.reference}`} />
            <PageHeader title={`Écriture ${entry.reference}`} subtitle={entry.description}>
                {!entry.is_auto && (
                    <button onClick={destroy} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" /> Supprimer
                    </button>
                )}
            </PageHeader>

            <Card className="mb-6 grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
                <div>
                    <p className="text-xs uppercase tracking-wide text-ink-500">Journal</p>
                    <p className="font-medium text-ink-900">{entry.journal.code} — {entry.journal.name}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-ink-500">Date</p>
                    <p className="font-medium text-ink-900">{new Date(entry.entry_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-ink-500">Origine</p>
                    <p className="font-medium text-ink-900">
                        {entry.is_auto ? (
                            <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Automatique</span>
                        ) : (
                            'Manuelle'
                        )}
                    </p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-ink-500">Saisie par</p>
                    <p className="font-medium text-ink-900">{entry.created_by?.name ?? '—'}</p>
                </div>
            </Card>

            {entry.is_auto && (
                <p className="mb-6 text-sm text-ink-500">
                    Cette écriture est générée automatiquement depuis une facture, un paiement ou une dépense. Pour la modifier, éditez ou supprimez l'enregistrement d'origine dans le module Finance.
                </p>
            )}

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Compte</th>
                                <th className="px-5 py-3">Libellé</th>
                                <th className="px-5 py-3 text-right">Débit</th>
                                <th className="px-5 py-3 text-right">Crédit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {entry.lines.map((line) => (
                                <tr key={line.id}>
                                    <td className="px-5 py-3 font-mono text-ink-900">{line.account.code} — {line.account.name}</td>
                                    <td className="px-5 py-3 text-ink-600">{line.label ?? '—'}</td>
                                    <td className="px-5 py-3 text-right text-ink-900">{Number(line.debit) > 0 ? formatFcfa(Number(line.debit)) : ''}</td>
                                    <td className="px-5 py-3 text-right text-ink-900">{Number(line.credit) > 0 ? formatFcfa(Number(line.credit)) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t border-ink-200 bg-ink-50/60">
                            <tr>
                                <td className="px-5 py-3 font-semibold text-ink-900" colSpan={2}>Total</td>
                                <td className="px-5 py-3 text-right font-semibold text-ink-900">{formatFcfa(totalDebit)}</td>
                                <td className="px-5 py-3 text-right font-semibold text-ink-900">{formatFcfa(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            <div className="mt-4">
                <Link href={route('admin.accounting.journal-entries.index')} className="text-sm font-medium text-brand-600 hover:underline">
                    ← Retour aux écritures
                </Link>
            </div>
        </AdminLayout>
    );
}
