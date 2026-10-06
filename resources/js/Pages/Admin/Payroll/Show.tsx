import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import PayoutFields from '@/Components/Admin/PayoutFields';
import { Field, Select, TextInput, Textarea } from '@/Components/Admin/Field';
import { IconAnchor, IconButton } from '@/Components/Admin/IconButton';
import Modal from '@/Components/Modal';
import { PageProps } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { fcfa } from '@/lib/money';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Banknote, Check, CheckCircle2, FileText, HandCoins, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Adjustment {
    type: 'prime' | 'retenue';
    label: string;
    amount: number;
}

interface Line {
    id: number;
    person_type: 'staff' | 'teacher';
    name: string;
    position: string | null;
    payment_type: 'fixe' | 'horaire';
    base_amount: number;
    hours: number | null;
    hourly_rate: number | null;
    adjustments: Adjustment[];
    net_amount: number;
    payout_channel: string | null;
    payout_channel_label: string | null;
    /** « •••• 4567 » : le numéro complet ne sort que pour celui qui peut le corriger. */
    payout_account_masked: string | null;
    payout_account: string | null;
    unmatched_sessions: number | null;
    notes: string | null;
    is_paid: boolean;
    paid_at: string | null;
    reference: string;
}

interface Props {
    run: {
        id: number;
        period_year: number;
        period_month: number;
        label: string;
        /** « d'octobre 2026 » : pour les phrases (« la paie d'octobre 2026 »). */
        of_label: string;
        status: 'brouillon' | 'validee';
        validated_at: string | null;
        validated_by: string | null;
    };
    lines: Line[];
    totals: { payroll: number; paid: number; remaining: number; count: number; paid_count: number };
    /** Personnes qu'on ne peut pas mettre dans le cycle faute de rémunération renseignée. */
    missing: { name: string; reason: string }[];
    channels: Record<string, string>;
}

type PayTarget = { kind: 'line'; line: Line } | { kind: 'all' };

const hoursText = (value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h`;
/** « 2026-10-30 » en « 30/10/2026 », sans passer par un fuseau horaire. */
const shortDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const today = () => new Date().toISOString().slice(0, 10);

const pill = 'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium';
const secondaryButton =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50';
const primaryButton =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-50';
const dangerButton =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50';

/** Préparer → Vérifier → Valider → Payer : l'étape en cours est signalée, celles qui sont derrière sont cochées. */
function Steps({ validated, allPaid }: { validated: boolean; allPaid: boolean }) {
    const steps = [
        { label: 'Préparer', done: true },
        { label: 'Vérifier', done: validated },
        { label: 'Valider', done: validated },
        { label: 'Payer', done: allPaid },
    ];
    const current = steps.findIndex((step) => !step.done);

    return (
        <ol aria-label="Étapes de la paie" className="mb-6 grid grid-cols-4 gap-2">
            {steps.map((step, index) => {
                const state = step.done ? 'done' : index === current ? 'current' : 'todo';

                return (
                    <li
                        key={step.label}
                        aria-current={state === 'current' ? 'step' : undefined}
                        className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-2"
                    >
                        <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                state === 'done' ? 'bg-emerald-700 text-white' : state === 'current' ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600'
                            }`}
                        >
                            {state === 'done' ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                        </span>
                        <span className={`text-xs sm:text-sm ${state === 'todo' ? 'text-ink-600' : 'font-semibold text-ink-900'}`}>
                            {step.label}
                            {state === 'done' && <span className="sr-only"> (terminé)</span>}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

/** Le calcul d'une ligne : base (ou heures × taux), primes, retenues, séances à vérifier. */
function Breakdown({ line }: { line: Line }) {
    const hourly = line.payment_type === 'horaire';
    const row = 'flex items-baseline justify-between gap-4';

    return (
        <div className="min-w-[15rem] space-y-0.5">
            <p className={`${row} text-ink-900`}>
                <span>{hourly ? `${hoursText(line.hours ?? 0)} × ${fcfa(line.hourly_rate ?? 0)}` : 'Salaire de base'}</span>
                <span className="font-medium">{fcfa(line.base_amount)}</span>
            </p>
            {line.adjustments.map((adjustment, index) => (
                <p key={index} className={`${row} ${adjustment.type === 'prime' ? 'text-emerald-700' : 'text-red-700'}`}>
                    <span>
                        {adjustment.type === 'prime' ? '+' : '−'} {adjustment.label}
                    </span>
                    <span>{fcfa(adjustment.amount)}</span>
                </p>
            ))}
            {line.unmatched_sessions ? (
                <p className="flex items-center gap-1 text-xs text-amber-800">
                    <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {line.unmatched_sessions} séance(s) sans créneau : à vérifier
                </p>
            ) : null}
        </div>
    );
}

function LineState({ line, validated }: { line: Line; validated: boolean }) {
    if (line.is_paid) {
        return <span className={`${pill} bg-emerald-100 text-emerald-700`}>Payé{line.paid_at ? ` le ${shortDate(line.paid_at)}` : ''}</span>;
    }

    if (line.net_amount <= 0) return <span className={`${pill} bg-ink-100 text-ink-600`}>Net nul</span>;

    return validated ? (
        <span className={`${pill} bg-sky-100 text-sky-700`}>À payer</span>
    ) : (
        <span className={`${pill} bg-amber-100 text-amber-800`}>À vérifier</span>
    );
}

/** Heures, primes, retenues, mode de versement et notes d'une ligne du brouillon, avec le net recalculé sous les yeux. */
function EditLineModal({ run, line, channels, onClose }: { run: Props['run']; line: Line; channels: Record<string, string>; onClose: () => void }) {
    const hourly = line.payment_type === 'horaire';
    const form = useForm({
        hours: line.hours != null ? String(line.hours) : '',
        adjustments: line.adjustments.map((adjustment) => ({ type: adjustment.type, label: adjustment.label, amount: String(adjustment.amount) })),
        payout_channel: line.payout_channel ?? '',
        payout_account: line.payout_account ?? '',
        notes: line.notes ?? '',
    });

    const base = hourly ? Math.round(Number(form.data.hours || 0) * (line.hourly_rate ?? 0) * 100) / 100 : line.base_amount;
    const sum = (type: Adjustment['type']) =>
        form.data.adjustments.filter((adjustment) => adjustment.type === type).reduce((total, adjustment) => total + Number(adjustment.amount || 0), 0);
    const net = Math.round((base + sum('prime') - sum('retenue')) * 100) / 100;
    const errors = form.errors as Record<string, string | undefined>;

    const setAdjustment = (index: number, patch: Partial<(typeof form.data.adjustments)[number]>) =>
        form.setData(
            'adjustments',
            form.data.adjustments.map((adjustment, position) => (position === index ? { ...adjustment, ...patch } : adjustment)),
        );

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        // Les heures ne concernent que les enseignants payés à l'heure : le serveur refuse de les voir sur un salaire fixe.
        form.transform((data) => ({ ...data, hours: hourly ? data.hours : undefined }));
        form.put(route('admin.payroll.lines.update', [run.id, line.id]), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <form onSubmit={submit} className="p-6">
            <div className="mb-5">
                <h2 className="font-serif text-lg font-bold text-ink-900">Modifier la ligne de {line.name}</h2>
                <p className="text-sm text-ink-500">
                    {line.position} · {run.label}
                </p>
            </div>

            <div className="space-y-5">
                {hourly && (
                    <Field
                        label="Heures travaillées"
                        required
                        error={form.errors.hours}
                        hint={`Calculées d'après le cahier de texte, à ${fcfa(line.hourly_rate ?? 0)} l'heure.${
                            line.unmatched_sessions ? ` ${line.unmatched_sessions} séance(s) n'ont pas de créneau : ajoutez leurs heures à la main.` : ''
                        }`}
                    >
                        <TextInput required type="number" min="0" max="744" step="0.25" inputMode="decimal" value={form.data.hours} onChange={(e) => form.setData('hours', e.target.value)} />
                    </Field>
                )}

                <fieldset>
                    <legend className="mb-1.5 text-sm font-medium text-ink-700">Primes et retenues</legend>
                    {form.data.adjustments.length === 0 ? (
                        <p className="text-sm text-ink-500">Aucune prime ni retenue. Les montants sont ceux que vous saisissez : rien n'est calculé automatiquement.</p>
                    ) : (
                        <ul className="space-y-3">
                            {form.data.adjustments.map((adjustment, index) => (
                                <li key={index}>
                                    <div className="flex flex-wrap items-start gap-2">
                                        <div className="w-32 shrink-0">
                                            <Select
                                                aria-label={`Type de la ligne ${index + 1}`}
                                                value={adjustment.type}
                                                onChange={(e) => setAdjustment(index, { type: e.target.value as Adjustment['type'] })}
                                            >
                                                <option value="prime">Prime</option>
                                                <option value="retenue">Retenue</option>
                                            </Select>
                                        </div>
                                        <div className="min-w-[10rem] flex-1">
                                            <TextInput
                                                aria-label={`Libellé de la ligne ${index + 1}`}
                                                placeholder="Libellé (ex. prime de rendement)"
                                                maxLength={120}
                                                value={adjustment.label}
                                                onChange={(e) => setAdjustment(index, { label: e.target.value })}
                                            />
                                        </div>
                                        <div className="w-36 shrink-0">
                                            <TextInput
                                                aria-label={`Montant de la ligne ${index + 1}, en FCFA`}
                                                placeholder="Montant"
                                                type="number"
                                                min="1"
                                                step="1"
                                                inputMode="decimal"
                                                value={adjustment.amount}
                                                onChange={(e) => setAdjustment(index, { amount: e.target.value })}
                                            />
                                        </div>
                                        <IconButton
                                            label={`Retirer la ligne ${index + 1}`}
                                            tone="danger"
                                            onClick={() => form.setData('adjustments', form.data.adjustments.filter((_, position) => position !== index))}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </IconButton>
                                    </div>
                                    {(errors[`adjustments.${index}.label`] || errors[`adjustments.${index}.amount`] || errors[`adjustments.${index}.type`]) && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors[`adjustments.${index}.label`] ?? errors[`adjustments.${index}.amount`] ?? errors[`adjustments.${index}.type`]}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {errors.adjustments && <p className="mt-1 text-xs text-red-600">{errors.adjustments}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => form.setData('adjustments', [...form.data.adjustments, { type: 'prime', label: '', amount: '' }])}
                            className={`${secondaryButton} !py-2`}
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter une prime ou une retenue
                        </button>
                    </div>
                </fieldset>

                <PayoutFields
                    channel={form.data.payout_channel}
                    account={form.data.payout_account}
                    options={channels}
                    errors={form.errors}
                    onChange={(field, value) => form.setData(field, value)}
                />

                <Field label="Notes" error={form.errors.notes} hint="Visible seulement par ceux qui gèrent la paie.">
                    <Textarea rows={2} maxLength={500} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                </Field>

                <div className={`rounded-lg px-4 py-3 text-sm ${net < 0 ? 'bg-red-50 text-red-800' : 'bg-ink-50 text-ink-800'}`} role="status">
                    <div className="flex items-baseline justify-between gap-4">
                        <span>Net à payer</span>
                        <strong className="font-serif text-lg">{fcfa(net)}</strong>
                    </div>
                    {net < 0 && <p className="mt-1 text-xs">Les retenues dépassent le salaire : le net ne peut pas être négatif.</p>}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">
                    Annuler
                </button>
                <button type="submit" disabled={form.processing || net < 0} className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                    Enregistrer la ligne
                </button>
            </div>
        </form>
    );
}

/** Verser un salaire ou tous ceux qui restent : la date, le mode (celui de la personne prime), puis une confirmation explicite. */
function PayModal({
    run,
    target,
    unpaid,
    channels,
    onClose,
}: {
    run: Props['run'];
    target: PayTarget;
    unpaid: Line[];
    channels: Record<string, string>;
    onClose: () => void;
}) {
    const line = target.kind === 'line' ? target.line : null;
    const form = useForm({ paid_at: today(), channel: line?.payout_channel ?? '' });

    const payable = line ? [line] : unpaid;
    const total = payable.reduce((sum, candidate) => sum + candidate.net_amount, 0);
    const withoutChannel = payable.filter((candidate) => !candidate.payout_channel);
    const needsChannel = withoutChannel.length > 0 && form.data.channel === '';

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const url = line ? route('admin.payroll.lines.pay', [run.id, line.id]) : route('admin.payroll.pay', run.id);

        form.post(url, { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <form onSubmit={submit} className="p-6">
            <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-800">
                    <Banknote className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                    <h2 className="font-serif text-lg font-bold text-ink-900">{line ? `Verser le salaire de ${line.name}` : 'Verser les salaires restants'}</h2>
                    <p className="text-sm text-ink-500">
                        {line ? `${run.label} · ${fcfa(line.net_amount)}` : `${payable.length} salaire(s) · ${fcfa(total)}`}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <Field label="Date du versement" required error={form.errors.paid_at}>
                    <TextInput type="date" max={today()} value={form.data.paid_at} onChange={(e) => form.setData('paid_at', e.target.value)} />
                </Field>
                <Field
                    label={line ? 'Mode de versement' : 'Mode de versement par défaut'}
                    required={Boolean(line)}
                    error={form.errors.channel}
                    hint={line ? undefined : 'Le mode propre à chaque personne est utilisé en priorité ; celui-ci sert pour les autres.'}
                >
                    <Select value={form.data.channel} onChange={(e) => form.setData('channel', e.target.value)}>
                        <option value="">{line ? 'Choisir un mode…' : 'Aucun (ignorer les personnes sans mode)'}</option>
                        {Object.entries(channels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </Field>
                {!line && needsChannel && (
                    <p role="status" className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                            {withoutChannel.length} personne(s) n'ont pas de mode de versement : choisissez-en un ci-dessus, sinon elles seront ignorées ({withoutChannel
                                .slice(0, 3)
                                .map((candidate) => candidate.name)
                                .join(', ')}
                            {withoutChannel.length > 3 ? '…' : ''}).
                        </span>
                    </p>
                )}
                <p className="text-xs text-ink-500">
                    Chaque versement est enregistré comme une dépense « salaires » avec son écriture comptable, et la personne est prévenue (sans montant) que son bulletin est disponible.
                </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">
                    Annuler
                </button>
                <button type="submit" disabled={form.processing || payable.length === 0} className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                    {line ? 'Verser le salaire' : 'Verser les salaires'}
                </button>
            </div>
        </form>
    );
}

export default function Show({ run, lines, totals, missing, channels }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const can = (permission: string) => permissions.includes(permission);

    const [editing, setEditing] = useState<Line | null>(null);
    const [paying, setPaying] = useState<PayTarget | null>(null);

    const draft = run.status === 'brouillon';
    const validated = !draft;
    const unpaid = lines.filter((line) => !line.is_paid && line.net_amount > 0);
    const allPaid = validated && totals.count > 0 && totals.remaining <= 0 && unpaid.length === 0;

    const approve = async () => {
        const confirmed = await confirmAction({
            title: 'Valider la paie',
            message: `Valider la paie ${run.of_label} :${totals.count} ligne(s), ${fcfa(totals.payroll)} au total ? Les lignes ne seront plus modifiables et les salaires pourront être versés. Vous pourrez rouvrir le cycle tant qu'aucun salaire n'est versé.`,
            confirmLabel: 'Valider la paie',
        });

        if (confirmed) router.post(route('admin.payroll.validate', run.id), {}, { preserveScroll: true });
    };

    const reopen = async () => {
        const confirmed = await confirmAction({
            title: 'Rouvrir le cycle',
            message: `Rouvrir la paie ${run.of_label} ?Elle redevient un brouillon : les lignes sont de nouveau modifiables et les versements bloqués jusqu'à une nouvelle validation.`,
            confirmLabel: 'Rouvrir le cycle',
        });

        if (confirmed) router.post(route('admin.payroll.reopen', run.id), {}, { preserveScroll: true });
    };

    const destroy = async () => {
        const confirmed = await confirmAction({
            title: 'Supprimer le brouillon',
            message: `Supprimer le brouillon de paie ${run.of_label} ?Les lignes préparées et leurs corrections (heures, primes, retenues) seront perdues. Aucun salaire n'a été versé.`,
            confirmLabel: 'Supprimer le brouillon',
            tone: 'danger',
        });

        if (confirmed) router.delete(route('admin.payroll.destroy', run.id));
    };

    const refresh = () => router.post(route('admin.payroll.refresh', run.id), {}, { preserveScroll: true });

    return (
        <AdminLayout>
            <Head title={`Paie ${run.of_label}`} />
            <PageHeader
                title={`Paie ${run.of_label}`}
                subtitle={
                    draft
                        ? 'Brouillon : vérifiez les lignes, puis validez.'
                        : `Validée${run.validated_by ? ` par ${run.validated_by}` : ''}${run.validated_at ? ` le ${shortDate(run.validated_at)}` : ''}.`
                }
            >
                <Link href={route('admin.payroll.index')} className={secondaryButton}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Toutes les paies
                </Link>
            </PageHeader>

            <Steps validated={validated} allPaid={allPaid} />

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="p-4">
                    <p className="text-xs text-ink-500">Masse salariale</p>
                    <p className="font-serif text-xl font-bold text-ink-900 sm:text-2xl">{fcfa(totals.payroll)}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-ink-500">Déjà versé</p>
                    <p className="font-serif text-xl font-bold text-emerald-700 sm:text-2xl">{fcfa(totals.paid)}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-ink-500">Reste à verser</p>
                    <p className="font-serif text-xl font-bold text-ink-900 sm:text-2xl">{fcfa(totals.remaining)}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-ink-500">Salaires versés</p>
                    <p className="font-serif text-xl font-bold text-ink-900 sm:text-2xl">
                        {totals.paid_count}/{totals.count}
                    </p>
                </Card>
            </div>

            {missing.length > 0 && (
                <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div className="text-sm">
                        <p>
                            <strong>{missing.length} personne(s) ne sont pas dans ce cycle</strong> faute de rémunération renseignée :
                        </p>
                        <ul className="mt-1 list-disc pl-5">
                            {missing.map((person) => (
                                <li key={person.name}>
                                    {person.name} — {person.reason}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-1">Renseignez leur rémunération dans leur fiche, puis choisissez « Ajouter les nouvelles personnes ».</p>
                    </div>
                </div>
            )}

            <Card className="mb-6 p-4 sm:p-5">
                {draft ? (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <p className="max-w-2xl text-sm text-ink-700">
                            <strong className="text-ink-900">Vérifiez chaque ligne</strong> (heures, primes, retenues, mode de versement), puis validez : les lignes sont alors figées
                            et les versements deviennent possibles.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            {can('modifier_salaires') && (
                                <button type="button" onClick={refresh} className={secondaryButton}>
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Ajouter les nouvelles personnes
                                </button>
                            )}
                            {can('valider_salaires') && (
                                <button type="button" onClick={approve} disabled={totals.count === 0} className={primaryButton}>
                                    <Check className="h-4 w-4" aria-hidden="true" /> Valider la paie
                                </button>
                            )}
                            {can('supprimer_salaires') && (
                                <button type="button" onClick={destroy} className={dangerButton}>
                                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Supprimer le brouillon
                                </button>
                            )}
                        </div>
                    </div>
                ) : allPaid ? (
                    <div className="flex items-center gap-3 text-emerald-800">
                        <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
                        <p className="text-sm font-medium">Tous les salaires {run.of_label} sont versés. Chaque personne retrouve son bulletin dans « Ma paie ».</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <p className="max-w-2xl text-sm text-ink-700">
                            <strong className="text-ink-900">Versez les salaires</strong> ligne par ligne, ou tous d'un coup. L'ordre de paiement liste ce qui reste à verser (mode et compte de
                            chacun) pour la banque ou les paiements mobiles ; il ne crée aucun versement.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            {can('ajouter_salaires') && (
                                <button type="button" onClick={() => setPaying({ kind: 'all' })} disabled={unpaid.length === 0} className={primaryButton}>
                                    <HandCoins className="h-4 w-4" aria-hidden="true" /> Payer tout le monde
                                </button>
                            )}
                            {can('exporter_salaires') && (
                                <>
                                    <a href={route('admin.payroll.payout.csv', run.id)} className={secondaryButton}>
                                        <FileText className="h-4 w-4" aria-hidden="true" /> Ordre de paiement (CSV)
                                    </a>
                                    <a href={route('admin.payroll.payout.pdf', run.id)} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
                                        <FileText className="h-4 w-4" aria-hidden="true" /> Ordre de paiement (PDF)
                                    </a>
                                </>
                            )}
                            {can('valider_salaires') && totals.paid_count === 0 && (
                                <button type="button" onClick={reopen} className={secondaryButton}>
                                    Rouvrir le cycle
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Bénéficiaire</th>
                                <th className="px-5 py-3">Calcul</th>
                                <th className="px-5 py-3 text-right">Net à payer</th>
                                <th className="px-5 py-3">Versement</th>
                                <th className="px-5 py-3">État</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {lines.map((line) => (
                                <tr key={line.id} className="align-top transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{line.name}</p>
                                        {line.position && <p className="text-xs text-ink-500">{line.position}</p>}
                                    </td>
                                    <td className="px-5 py-3">
                                        <Breakdown line={line} />
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3 text-right">
                                        <span className="font-serif text-base font-bold text-ink-900">{fcfa(line.net_amount)}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {line.payout_channel_label ? (
                                            <>
                                                <p className="text-ink-900">{line.payout_channel_label}</p>
                                                {line.payout_account_masked && <p className="whitespace-nowrap text-xs text-ink-500">compte {line.payout_account_masked}</p>}
                                            </>
                                        ) : (
                                            <span className="text-ink-500">À choisir</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <LineState line={line} validated={validated} />
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            {draft && can('modifier_salaires') && !line.is_paid && (
                                                <IconButton label={`Modifier la ligne de ${line.name}`} onClick={() => setEditing(line)}>
                                                    <Pencil className="h-4 w-4" />
                                                </IconButton>
                                            )}
                                            {validated && can('ajouter_salaires') && !line.is_paid && line.net_amount > 0 && (
                                                <IconButton label={`Verser le salaire de ${line.name}`} onClick={() => setPaying({ kind: 'line', line })}>
                                                    <HandCoins className="h-4 w-4" />
                                                </IconButton>
                                            )}
                                            {line.is_paid && can('exporter_salaires') && (
                                                <IconAnchor
                                                    label={`Bulletin de ${line.name}`}
                                                    href={route('admin.payroll.lines.payslip', [run.id, line.id])}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </IconAnchor>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {lines.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-500">
                                        Aucune personne dans ce cycle : renseignez les salaires dans les fiches du personnel et des enseignants, puis ajoutez-les.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal show={editing !== null} onClose={() => setEditing(null)} maxWidth="xl">
                {editing && <EditLineModal key={editing.id} run={run} line={editing} channels={channels} onClose={() => setEditing(null)} />}
            </Modal>

            <Modal show={paying !== null} onClose={() => setPaying(null)} maxWidth="md">
                {paying && <PayModal key={paying.kind === 'line' ? paying.line.id : 'all'} run={run} target={paying} unpaid={unpaid} channels={channels} onClose={() => setPaying(null)} />}
            </Modal>
        </AdminLayout>
    );
}
