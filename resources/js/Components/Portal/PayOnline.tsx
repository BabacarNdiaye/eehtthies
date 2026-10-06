import Modal from '@/Components/Modal';
import { fcfa } from '@/lib/money';
import { Invoice, OnlinePaymentConfig } from '@/types';
import { router } from '@inertiajs/react';
import { CreditCard, Loader2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

/** « 2026-10-05 » en « 05/10/2026 », sans passer par un fuseau horaire. */
const shortDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * « Payer en ligne » : le bouton, et la feuille où l'on choisit les factures à régler, le montant (une partie suffit : il est
 * réparti sur les échéances les plus anciennes) et le mode de paiement. L'enregistrement part vers le fournisseur ; rien n'est
 * encaissé ici, seul le fournisseur confirme le paiement. `invoices` : les factures à régler, dans l'ordre où l'on paie.
 */
export default function PayOnline({ invoices, online }: { invoices: Invoice[]; online: OnlinePaymentConfig }) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<number[]>(() => invoices.map((invoice) => invoice.id));
    const [amount, setAmount] = useState<string | null>(null);
    const [channel, setChannel] = useState(() => Object.keys(online.channels)[0] ?? '');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const groupId = useId();

    const chosen = useMemo(() => invoices.filter((invoice) => selected.includes(invoice.id)), [invoices, selected]);
    const total = chosen.reduce((sum, invoice) => sum + (invoice.computed_balance ?? 0), 0);
    // Tant que le payeur n'a pas touché au montant, il suit la somme des factures cochées.
    const value = amount ?? String(total);
    const numeric = Number(value);
    const valid = chosen.length > 0 && Number.isFinite(numeric) && numeric > 0 && numeric <= total && channel !== '';

    const toggle = (id: number) => {
        setAmount(null);
        setSelected((current) => (current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]));
    };

    const pay = (event: React.FormEvent) => {
        event.preventDefault();

        if (!valid || processing) return;

        setProcessing(true);
        setError(null);

        router.post(
            online.start_url,
            { invoice_ids: selected, amount: numeric, channel },
            {
                preserveScroll: true,
                onError: (errors) => setError(Object.values(errors)[0] ?? 'Le paiement n’a pas pu démarrer.'),
                // En cas de succès le navigateur quitte la page pour le fournisseur : on ne rend pas la main avant.
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mb-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-ink-800 active:scale-[0.99]"
            >
                <CreditCard className="h-5 w-5" aria-hidden="true" /> Payer en ligne
            </button>

            <Modal show={open} onClose={() => !processing && setOpen(false)} maxWidth="md">
                <form onSubmit={pay} className="p-6">
                    <h2 className="font-serif text-xl font-bold text-ink-900">Payer en ligne</h2>
                    <p className="mt-1 text-sm text-ink-500">
                        Vous serez redirigé(e) vers le fournisseur de paiement. Le reçu vous est envoyé dès que le paiement est confirmé.
                    </p>

                    <fieldset className="mt-5">
                        <legend className="mb-2 text-sm font-medium text-ink-700">Factures à régler</legend>
                        <ul className="space-y-2">
                            {invoices.map((invoice) => {
                                const checked = selected.includes(invoice.id);

                                return (
                                    <li key={invoice.id}>
                                        <label
                                            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                                                checked ? 'border-gold-400 bg-gold-50' : 'border-ink-200 bg-white'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggle(invoice.id)}
                                                className="h-4 w-4 shrink-0 rounded border-ink-300 text-gold-600 focus:ring-gold-500"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium text-ink-900">{invoice.label}</span>
                                                {invoice.due_date && <span className="block text-xs text-ink-500">Échéance {shortDate(invoice.due_date)}</span>}
                                            </span>
                                            <span className="shrink-0 font-semibold text-ink-900">{fcfa(invoice.computed_balance ?? 0)}</span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    </fieldset>

                    <div className="mt-5">
                        <label htmlFor={`${groupId}-amount`} className="mb-1.5 block text-sm font-medium text-ink-700">
                            Montant à payer (FCFA)
                        </label>
                        <input
                            id={`${groupId}-amount`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={total}
                            step={1}
                            value={value}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full rounded-lg border-ink-200 text-sm text-ink-900 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                        />
                        <p className="mt-1 text-xs text-ink-500">
                            Vous pouvez ne payer qu’une partie : la somme est répartie sur les échéances les plus anciennes d’abord.
                        </p>
                    </div>

                    <fieldset className="mt-5">
                        <legend className="mb-2 text-sm font-medium text-ink-700">Mode de paiement</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(online.channels).map(([key, label]) => (
                                <label
                                    key={key}
                                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition focus-within:ring-2 focus-within:ring-gold-500 ${
                                        channel === key ? 'border-gold-500 bg-gold-50 text-ink-900' : 'border-ink-200 bg-white text-ink-700'
                                    }`}
                                >
                                    <input type="radio" name={`${groupId}-channel`} value={key} checked={channel === key} onChange={() => setChannel(key)} className="sr-only" />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {error && (
                        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </p>
                    )}

                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            disabled={processing}
                            className="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={!valid || processing}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            {processing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {valid ? `Payer ${fcfa(numeric)}` : 'Payer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
