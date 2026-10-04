import AdminLayout from '@/Layouts/AdminLayout';
import AccountingTabs from '@/Components/Admin/AccountingTabs';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { IconButton } from '@/Components/Admin/IconButton';
import FormActions from '@/Components/Admin/FormActions';
import { Head, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';

interface Line {
    account_id: string;
    label: string;
    debit: string;
    credit: string;
}

interface Props {
    journals: { id: number; code: string; name: string }[];
    accounts: { id: number; code: string; name: string }[];
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function Form({ journals, accounts }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        journal_id: String(journals.find((j) => j.code === 'OD')?.id ?? journals[0]?.id ?? ''),
        entry_date: new Date().toISOString().slice(0, 10),
        description: '',
        lines: [
            { account_id: '', label: '', debit: '', credit: '' },
            { account_id: '', label: '', debit: '', credit: '' },
        ] as Line[],
    });

    const updateLine = (index: number, field: keyof Line, value: string) => {
        const lines = [...data.lines];
        lines[index] = { ...lines[index], [field]: value };
        setData('lines', lines);
    };

    const addLine = () => setData('lines', [...data.lines, { account_id: '', label: '', debit: '', credit: '' }]);
    const removeLine = (index: number) => setData('lines', data.lines.filter((_, i) => i !== index));

    const totalDebit = data.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = data.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.accounting.journal-entries.store'));
    };

    return (
        <AdminLayout>
            <Head title="Nouvelle écriture" />
            <PageHeader title="Nouvelle écriture" subtitle="Saisissez une écriture manuelle en partie double (total débit = total crédit)." />
            <AccountingTabs current="journal-entries" />

            <form onSubmit={submit} className="space-y-6">
                <Card className="p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Field label="Journal" required error={errors.journal_id}>
                            <Select value={data.journal_id} onChange={(e) => setData('journal_id', e.target.value)}>
                                {journals.map((j) => (
                                    <option key={j.id} value={j.id}>{j.code} — {j.name}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Date" required error={errors.entry_date}>
                            <TextInput type="date" value={data.entry_date} onChange={(e) => setData('entry_date', e.target.value)} />
                        </Field>
                        <Field label="Libellé de l'écriture" required error={errors.description}>
                            <TextInput value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Ex : Régularisation..." />
                        </Field>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table data-table="scroll" className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-4 py-3">Compte</th>
                                    <th className="px-4 py-3">Libellé</th>
                                    <th className="px-4 py-3 text-right">Débit</th>
                                    <th className="px-4 py-3 text-right">Crédit</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {data.lines.map((line, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2">
                                            <Select aria-label={`Compte, ligne ${index + 1}`} value={line.account_id} onChange={(e) => updateLine(index, 'account_id', e.target.value)}>
                                                <option value="">Sélectionner...</option>
                                                {accounts.map((a) => (
                                                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                                                ))}
                                            </Select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <TextInput aria-label={`Libellé, ligne ${index + 1}`} value={line.label} onChange={(e) => updateLine(index, 'label', e.target.value)} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="1"
                                                className="text-right"
                                                aria-label={`Débit, ligne ${index + 1}`}
                                                value={line.debit}
                                                onChange={(e) => updateLine(index, 'debit', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="1"
                                                className="text-right"
                                                aria-label={`Crédit, ligne ${index + 1}`}
                                                value={line.credit}
                                                onChange={(e) => updateLine(index, 'credit', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {data.lines.length > 2 && (
                                                <IconButton type="button" onClick={() => removeLine(index)} label="Supprimer" tone="danger">
                                                    <Trash2 className="h-4 w-4" />
                                                </IconButton>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-ink-100 bg-ink-50/60">
                                <tr>
                                    <td className="px-4 py-3" colSpan={2}>
                                        <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                                            <Plus className="h-4 w-4" /> Ajouter une ligne
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-ink-900">{formatFcfa(totalDebit)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-ink-900">{formatFcfa(totalCredit)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {errors.lines && <p className="text-sm text-red-600">{errors.lines}</p>}
                {!balanced && (
                    <p className="text-sm text-amber-600">
                        L'écriture doit être équilibrée : le total débit doit être égal au total crédit et supérieur à zéro.
                    </p>
                )}

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing || !balanced}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        Enregistrer l'écriture
                    </button>
                </FormActions>
            </form>
        </AdminLayout>
    );
}
