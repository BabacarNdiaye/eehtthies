import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, TextInput } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CircleCheck, Download, Search, Send } from 'lucide-react';
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';

interface OpenInvoice {
    id: number;
    reference: string;
    label: string;
    due_date: string | null;
    amount: number;
    paid: number;
    balance: number;
    status: 'en_retard' | 'a_venir';
    late_days: number | null;
}

interface Contacts {
    mail: boolean;
    push: boolean;
    connect: boolean;
}

interface Selected {
    student: { id: number; name: string; matricule: string; class: string | null; status: string };
    total_due: number;
    invoices: OpenInvoice[];
    contacts: Contacts;
}

interface Done {
    token: string;
    receipt_number: string;
    total: number;
    channel: string;
    paid_at: string;
    payments: { id: number; invoice_id: number; label: string; amount: number; balance_after: number | null }[];
    receipt_url: string;
    contacts: Contacts;
}

interface StudentResult {
    id: number;
    name: string;
    matricule: string;
    class: string | null;
    balance: number;
}

interface Props {
    selected: Selected | null;
    focus_invoice: number | null;
    done: Done | null;
    channels: Record<string, string>;
    today: string;
}

const fcfa = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;

/** Montant saisi en centimes entiers : 0,1 + 0,2 ne laisse pas de miettes, et la virgule française est acceptée. */
const cents = (value: string | number | null | undefined) => Math.round((Number(String(value ?? '').replace(',', '.')) || 0) * 100);

/** « 2026-10-05 » ou « 2026-10-05T00:00:00Z » en jj/mm/aaaa, sans décalage de fuseau. */
const dateFr = (iso: string) => {
    const [year, month, day] = iso.slice(0, 10).split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
};

/** Même règle que App\Services\PaymentAllocator (les plus anciennes d'abord, jamais plus que le solde) ; le serveur revérifie tout. */
function allocate(invoices: OpenInvoice[], amountCents: number): Record<number, string> {
    let remaining = amountCents;
    const rows: Record<number, string> = {};

    for (const invoice of invoices) {
        if (remaining <= 0) break;

        const part = Math.min(cents(invoice.balance), remaining);

        if (part > 0) {
            rows[invoice.id] = String(part / 100);
            remaining -= part;
        }
    }

    return rows;
}

function contactSummary(contacts: Contacts): string {
    const parts = [contacts.mail && 'e-mail avec le reçu en PDF', contacts.push && 'notification', contacts.connect && 'message EEHT Connect'].filter(Boolean);

    return parts.length > 0 ? `Par ${parts.join(', ')}.` : 'Aucun contact enregistré pour cette famille : remettez le reçu imprimé.';
}

const chip =
    'inline-flex min-h-11 items-center rounded-full border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 outline-none transition hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500';

export default function Index({ selected, focus_invoice, done, channels, today }: Props) {
    return (
        <AdminLayout>
            <Head title="Encaisser un paiement" />
            <PageHeader title="Encaisser un paiement" subtitle="Une somme, une ou plusieurs mensualités, un seul reçu." />

            {done ? (
                <Success done={done} selected={selected} />
            ) : selected ? (
                <PaymentForm key={selected.student.id} selected={selected} focusInvoice={focus_invoice} channels={channels} today={today} />
            ) : (
                <StudentSearch />
            )}
        </AdminLayout>
    );
}

function StudentSearch() {
    const inputId = useId();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<StudentResult[]>([]);
    const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

    useEffect(() => {
        const term = query.trim();

        if (term.length < 2) {
            setResults([]);
            setState('idle');

            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setState('loading');

            try {
                const response = await window.axios.get<StudentResult[]>(route('admin.cashier.students'), { params: { q: term }, signal: controller.signal });

                setResults(response.data);
                setState('done');
            } catch {
                // Requête annulée par une frappe plus récente, ou réseau coupé : l'écran reste tel quel.
            }
        }, 250);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    return (
        <Card className="p-5 sm:p-6">
            <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">
                Rechercher un élève
            </label>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input
                    id={inputId}
                    type="search"
                    autoFocus
                    autoComplete="off"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nom, prénom ou matricule"
                    aria-describedby={`${inputId}-status`}
                    className="w-full rounded-lg border-ink-200 py-3 pl-10 text-base text-ink-900 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                />
            </div>
            <p id={`${inputId}-status`} role="status" className="mt-2 min-h-5 text-xs text-ink-500">
                {state === 'loading'
                    ? 'Recherche…'
                    : state === 'done'
                      ? results.length === 0
                          ? 'Aucun élève trouvé.'
                          : `${results.length} élève(s) trouvé(s).`
                      : 'Tapez au moins deux lettres.'}
            </p>

            {results.length > 0 && (
                <ul className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-100">
                    {results.map((student) => (
                        <li key={student.id}>
                            <button
                                type="button"
                                onClick={() => router.get(route('admin.cashier.create'), { student: student.id })}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-ink-900">{student.name}</span>
                                    <span className="block truncate text-xs text-ink-500">{[student.matricule, student.class].filter(Boolean).join(' · ')}</span>
                                </span>
                                <span
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${student.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}
                                >
                                    {student.balance > 0 ? `${fcfa(student.balance)} dû` : 'À jour'}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function PaymentForm({ selected, focusInvoice, channels, today }: { selected: Selected; focusInvoice: number | null; channels: Record<string, string>; today: string }) {
    const { student, invoices, total_due: totalDue, contacts } = selected;
    const canSend = contacts.mail || contacts.push || contacts.connect;

    // Ordre de règlement : la facture visée (bouton « Encaisser » d'une fiche) d'abord, puis les plus anciennes.
    const order = useMemo(() => {
        const focus = invoices.find((invoice) => invoice.id === focusInvoice);

        return focus ? [focus, ...invoices.filter((invoice) => invoice.id !== focus.id)] : invoices;
    }, [invoices, focusInvoice]);

    const focus = invoices.find((invoice) => invoice.id === focusInvoice);
    const [amount, setAmount] = useState(focus ? String(focus.balance) : '');
    const [rows, setRows] = useState<Record<number, string>>(focus ? allocate(order, cents(focus.balance)) : {});

    const form = useForm({
        student_id: student.id,
        channel: 'especes',
        reference: '',
        paid_at: today,
        send_receipt: canSend,
        allocations: [] as { invoice_id: number; amount: number }[],
    });

    const totalCents = Object.values(rows).reduce((sum, value) => sum + cents(value), 0);
    const overTotal = cents(amount) > cents(totalDue);
    const overRow = (invoice: OpenInvoice) => cents(rows[invoice.id]) > cents(invoice.balance);
    const anyRowOver = order.some(overRow);

    const changeAmount = (value: string) => {
        setAmount(value);
        setRows(allocate(order, cents(value)));
    };

    const changeRow = (id: number, value: string) => {
        const next = { ...rows, [id]: value };

        setRows(next);

        const sum = Object.values(next).reduce((total, item) => total + cents(item), 0);
        setAmount(sum > 0 ? String(sum / 100) : '');
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            send_receipt: data.send_receipt && canSend,
            allocations: order
                .filter((invoice) => cents(rows[invoice.id]) > 0)
                .map((invoice) => ({ invoice_id: invoice.id, amount: cents(rows[invoice.id]) / 100 })),
        }));
        form.post(route('admin.cashier.store'), { preserveScroll: true });
    };

    return (
        // noValidate : les dépassements sont signalés par la page elle-même (et revérifiés par le serveur), pas par la bulle du navigateur.
        <form onSubmit={submit} noValidate className="space-y-6">
            <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="font-serif text-xl font-bold text-ink-900">{student.name}</h2>
                        <p className="text-sm text-ink-500">{[student.matricule, student.class].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-ink-500">Reste à payer</p>
                        <p className={`text-2xl font-bold ${totalDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fcfa(totalDue)}</p>
                    </div>
                </div>
                <Link href={route('admin.cashier.create')} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Changer d'élève
                </Link>
            </Card>

            {invoices.length === 0 ? (
                <Card className="p-8 text-center text-sm text-ink-500">Aucune facture à régler : cet élève est à jour.</Card>
            ) : (
                <>
                    <Card className="p-5 sm:p-6">
                        <Field label="Montant reçu (FCFA)" required>
                            <TextInput
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={totalDue}
                                step="any"
                                placeholder="0"
                                value={amount}
                                onChange={(event) => changeAmount(event.target.value)}
                                className="text-2xl font-bold"
                            />
                        </Field>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => changeAmount(String(totalDue))} className={chip}>
                                Solde total · {fcfa(totalDue)}
                            </button>
                            <button type="button" onClick={() => changeAmount(String(order[0].balance))} className={chip}>
                                {order[0].label} · {fcfa(order[0].balance)}
                            </button>
                        </div>
                        {overTotal && (
                            <p role="alert" className="mt-3 text-sm text-red-700">
                                Le montant dépasse ce qui est dû ({fcfa(totalDue)}).
                            </p>
                        )}
                        {form.errors.allocations && (
                            <p role="alert" className="mt-3 text-sm text-red-700">
                                {form.errors.allocations}
                            </p>
                        )}
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="border-b border-ink-100 px-5 py-4">
                            <h2 className="font-serif text-lg font-semibold text-ink-900">Répartition</h2>
                            <p className="mt-0.5 text-xs text-ink-500">Les échéances les plus anciennes sont réglées d'abord ; vous pouvez ajuster chaque montant.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-3">Facture</th>
                                        <th className="px-5 py-3">Échéance</th>
                                        <th className="px-5 py-3 text-right">Solde dû</th>
                                        <th className="px-5 py-3 text-right">À encaisser</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {order.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-ink-900">{invoice.label}</p>
                                                <p className="text-xs text-ink-500">{invoice.reference}</p>
                                            </td>
                                            <td className="px-5 py-3 text-ink-600">
                                                {invoice.due_date ? dateFr(invoice.due_date) : '—'}
                                                {invoice.status === 'en_retard' && (
                                                    <span className="ml-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                                        En retard de {invoice.late_days} j
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right font-medium text-ink-900">{fcfa(invoice.balance)}</td>
                                            <td className="px-5 py-3 text-right">
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    min={0}
                                                    max={invoice.balance}
                                                    step="any"
                                                    placeholder="0"
                                                    value={rows[invoice.id] ?? ''}
                                                    onChange={(event) => changeRow(invoice.id, event.target.value)}
                                                    aria-label={`Montant encaissé pour ${invoice.label}`}
                                                    aria-invalid={overRow(invoice) || undefined}
                                                    className={`w-full max-w-[9rem] rounded-lg text-right text-sm shadow-sm focus:ring-gold-500 ${overRow(invoice) ? 'border-red-400 focus:border-red-500' : 'border-ink-200 focus:border-gold-500'}`}
                                                />
                                                {overRow(invoice) && <p className="mt-1 text-xs text-red-700">Dépasse le solde</p>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-5 py-3 text-sm">
                            <span className="text-ink-600">Total réparti</span>
                            <strong className="text-ink-900">{fcfa(totalCents / 100)}</strong>
                        </div>
                    </Card>

                    <Card className="space-y-5 p-5 sm:p-6">
                        <fieldset>
                            <legend className="mb-1.5 text-sm font-medium text-ink-700">
                                Mode de paiement <span className="text-red-600">*</span>
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(channels).map(([key, label]) => (
                                    <label
                                        key={key}
                                        className={`${chip} relative cursor-pointer focus-within:ring-2 focus-within:ring-gold-500 ${form.data.channel === key ? 'border-gold-500 bg-gold-50 text-ink-900 ring-1 ring-gold-500' : ''}`}
                                    >
                                        {/* Le champ recouvre toute la pastille (invisible mais cliquable, au clavier comme au doigt). */}
                                        <input
                                            type="radio"
                                            name="channel"
                                            value={key}
                                            checked={form.data.channel === key}
                                            onChange={() => form.setData('channel', key)}
                                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                            {form.errors.channel && <p className="mt-1 text-xs text-red-600">{form.errors.channel}</p>}
                        </fieldset>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <Field label="Référence" hint="Numéro de transaction, de chèque ou de virement : il sert au rapprochement." error={form.errors.reference}>
                                <TextInput value={form.data.reference} onChange={(event) => form.setData('reference', event.target.value)} />
                            </Field>
                            <Field label="Date du paiement" required error={form.errors.paid_at}>
                                <TextInput type="date" max={today} value={form.data.paid_at} onChange={(event) => form.setData('paid_at', event.target.value)} />
                            </Field>
                        </div>

                        <label className="flex items-start gap-3">
                            <Checkbox
                                className="mt-0.5"
                                checked={form.data.send_receipt && canSend}
                                disabled={!canSend}
                                onChange={(event) => form.setData('send_receipt', event.target.checked)}
                            />
                            <span>
                                <span className="block text-sm font-medium text-ink-800">Envoyer le reçu à la famille</span>
                                <span className="block text-xs text-ink-500">{contactSummary(contacts)}</span>
                            </span>
                        </label>
                    </Card>

                    <FormActions>
                        <button
                            type="submit"
                            disabled={form.processing || totalCents <= 0 || overTotal || anyRowOver}
                            className="rounded-lg bg-gold-500 px-6 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50"
                        >
                            {totalCents > 0 ? `Encaisser ${fcfa(totalCents / 100)}` : 'Encaisser'}
                        </button>
                    </FormActions>
                </>
            )}
        </form>
    );
}

function Success({ done, selected }: { done: Done; selected: Selected | null }) {
    const heading = useRef<HTMLHeadingElement>(null);
    const canSend = done.contacts.mail || done.contacts.push || done.contacts.connect;
    const remaining = selected?.total_due ?? 0;

    // Annonce le résultat aux lecteurs d'écran et ramène le regard en haut de la page.
    useEffect(() => {
        heading.current?.focus();
    }, []);

    return (
        <Card className="p-6 text-center sm:p-8">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CircleCheck className="h-8 w-8" aria-hidden="true" />
            </span>
            <h2 ref={heading} tabIndex={-1} className="font-serif text-2xl font-bold text-ink-900 outline-none">
                Encaissement enregistré
            </h2>
            <p className="mt-2 text-3xl font-bold text-ink-900">{fcfa(done.total)}</p>
            <p className="mt-1 text-sm text-ink-500">
                {done.channel} · reçu n° {done.receipt_number} · {dateFr(done.paid_at)}
            </p>

            <ul className="mx-auto mt-6 max-w-lg divide-y divide-ink-100 rounded-lg border border-ink-100 text-left text-sm">
                {done.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="min-w-0 truncate text-ink-700">{payment.label}</span>
                        <span className="shrink-0 text-right">
                            <span className="block font-semibold text-ink-900">{fcfa(payment.amount)}</span>
                            {payment.balance_after !== null && (
                                <span className="block text-xs text-ink-500">{payment.balance_after > 0 ? `reste ${fcfa(payment.balance_after)}` : 'soldée'}</span>
                            )}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                    href={done.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink-900 px-5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    <Download className="h-4 w-4" aria-hidden="true" /> Télécharger le reçu
                </a>
                <button
                    type="button"
                    disabled={!canSend}
                    onClick={() => router.post(route('admin.cashier.resend'), { batch_token: done.token }, { preserveScroll: true })}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-ink-200 bg-white px-5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
                >
                    <Send className="h-4 w-4" aria-hidden="true" /> Renvoyer à la famille
                </button>
                {selected && remaining > 0 && (
                    <Link
                        href={route('admin.cashier.create', { student: selected.student.id })}
                        className="inline-flex min-h-11 items-center rounded-lg border border-ink-200 bg-white px-5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    >
                        Encore {fcfa(remaining)} dû · encaisser la suite
                    </Link>
                )}
                <Link
                    href={route('admin.cashier.create')}
                    className="inline-flex min-h-11 items-center rounded-lg bg-gold-500 px-5 text-sm font-semibold text-ink-900 hover:bg-gold-400"
                >
                    Nouvel encaissement
                </Link>
            </div>

            <p className="mt-4 text-xs text-ink-500">{contactSummary(done.contacts)}</p>
        </Card>
    );
}
