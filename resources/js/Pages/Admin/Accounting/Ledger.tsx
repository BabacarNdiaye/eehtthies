import AdminLayout from '@/Layouts/AdminLayout';
import AccountingTabs from '@/Components/Admin/AccountingTabs';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import ExportButtons from '@/Components/Admin/ExportButtons';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Head, router } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

interface LedgerLine {
    date: string;
    journal: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

interface Props {
    accounts: { id: number; code: string; name: string; nature: string }[];
    account: { id: number; code: string; name: string; nature: string } | null;
    openingBalance: number;
    lines: LedgerLine[];
    filters: { account_id?: number | null; from?: string | null; to?: string | null };
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function Ledger({ accounts, account, openingBalance, lines, filters }: Props) {
    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.accounting.ledger'),
            { account_id: filters.account_id ?? '', from: filters.from ?? '', to: filters.to ?? '', ...overrides },
            { preserveState: true, replace: true },
        );
    };

    const closingBalance = lines.length > 0 ? lines[lines.length - 1].balance : openingBalance;

    return (
        <AdminLayout>
            <Head title="Grand livre" />
            <PageHeader title="Grand livre" subtitle="Historique chronologique des mouvements d'un compte, avec solde progressif." />
            <AccountingTabs current="ledger" />

            <Card className="mb-6 grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
                <Field label="Compte">
                    <Select value={filters.account_id ?? ''} onChange={(e) => applyFilters({ account_id: e.target.value })}>
                        <option value="">Sélectionner un compte...</option>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                        ))}
                    </Select>
                </Field>
                <Field label="Du">
                    <TextInput type="date" value={filters.from ?? ''} onChange={(e) => applyFilters({ from: e.target.value })} />
                </Field>
                <Field label="Au">
                    <TextInput type="date" value={filters.to ?? ''} onChange={(e) => applyFilters({ to: e.target.value })} />
                </Field>
            </Card>

            {!account ? (
                <Card className="p-10 text-center text-ink-400">Choisissez un compte pour afficher son grand livre.</Card>
            ) : (
                <>
                    <Card className="mb-6 flex flex-col gap-3 p-4 text-sm text-ink-600 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="font-mono font-semibold text-ink-900">{account.code}</span> — {account.name} ·{' '}
                            Solde d'ouverture : <span className="font-medium text-ink-900">{formatFcfa(openingBalance)}</span> ·{' '}
                            Solde final : <span className="font-medium text-ink-900">{formatFcfa(closingBalance)}</span>
                        </div>
                        <ExportButtons
                            csvHref={route('admin.accounting.ledger.export', { format: 'csv', account_id: account.id, from: filters.from ?? '', to: filters.to ?? '' })}
                            pdfHref={route('admin.accounting.ledger.export', { format: 'pdf', account_id: account.id, from: filters.from ?? '', to: filters.to ?? '' })}
                        />
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Journal</th>
                                        <th className="px-5 py-3">Référence</th>
                                        <th className="px-5 py-3">Libellé</th>
                                        <th className="px-5 py-3 text-right">Débit</th>
                                        <th className="px-5 py-3 text-right">Crédit</th>
                                        <th className="px-5 py-3 text-right">Solde</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    <tr className="bg-ink-50/40">
                                        <td className="px-5 py-2 text-ink-400" colSpan={6}>Solde d'ouverture</td>
                                        <td className="px-5 py-2 text-right font-medium text-ink-900">{formatFcfa(openingBalance)}</td>
                                    </tr>
                                    {lines.map((line, i) => (
                                        <tr key={i} className="transition-colors duration-150 hover:bg-ink-50/60">
                                            <td className="px-5 py-3 text-ink-600">{new Date(line.date).toLocaleDateString('fr-FR')}</td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">{line.journal}</span>
                                            </td>
                                            <td className="px-5 py-3 font-mono text-xs text-ink-500">{line.reference}</td>
                                            <td className="px-5 py-3 text-ink-900">{line.description}</td>
                                            <td className="px-5 py-3 text-right text-ink-900">{line.debit > 0 ? formatFcfa(line.debit) : ''}</td>
                                            <td className="px-5 py-3 text-right text-ink-900">{line.credit > 0 ? formatFcfa(line.credit) : ''}</td>
                                            <td className="px-5 py-3 text-right font-medium text-ink-900">{formatFcfa(line.balance)}</td>
                                        </tr>
                                    ))}
                                    {lines.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-10 text-center">
                                                <div className="flex flex-col items-center gap-3 text-ink-400">
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                        <Inbox className="h-6 w-6" />
                                                    </span>
                                                    <p className="text-sm">Aucun mouvement sur la période.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </AdminLayout>
    );
}
