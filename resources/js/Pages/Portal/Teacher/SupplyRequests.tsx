import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import Card from '@/Components/Admin/Card';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import LinesEditor, { EditorLine } from '@/Components/Admin/Economat/LinesEditor';
import Pagination from '@/Components/Admin/Pagination';
import { dateFr, qty, REQUEST_TONES } from '@/lib/economat';
import { confirmAction } from '@/lib/confirm';
import { Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Send, Trash2 } from 'lucide-react';

interface Row {
    id: number;
    number: string;
    status: string;
    purpose: string;
    class: string | null;
    needed_at: string | null;
    created_at: string;
    lines: { product: string; unit: string; quantity: number }[];
}

interface Props {
    requests: Paginated<Row>;
    statuses: Record<string, string>;
    products: { id: number; name: string; unit: string }[];
    classes: { id: number; name: string }[];
}

const HINTS: Record<string, string> = {
    en_attente: "L'économe n'a pas encore répondu.",
    approuvee: 'Approuvée : le matériel sera préparé et livré.',
    livree: 'Matériel livré.',
    refusee: 'Demande refusée : voyez avec l\'économat.',
};

export default function SupplyRequests({ requests, statuses, products, classes }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        purpose: '',
        school_class_id: '' as number | '',
        needed_at: '',
        notes: '',
        lines: [{ product_id: '', quantity: '' }] as EditorLine[],
    });

    const cancel = async (row: Row) => {
        if (await confirmAction({ title: 'Annuler la demande', message: `Annuler la demande ${row.number} ?`, confirmLabel: 'Annuler la demande' })) {
            router.delete(route('teacher.supplies.cancel', row.id), { preserveScroll: true });
        }
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Matériel" />
            <div className="mb-6">
                <h1 className="hidden font-serif text-2xl font-bold text-ink-900 lg:block">Matériel pour vos ateliers</h1>
                <p className="mt-1 text-sm text-ink-500">Demandez à l'économat les denrées et le matériel dont vous avez besoin pour un atelier ou un cours.</p>
            </div>

            <Card className="mb-6 p-5 sm:p-6">
                <h2 className="mb-4 text-base font-semibold text-ink-900">Nouvelle demande</h2>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        post(route('teacher.supplies.store'), { preserveScroll: true, onSuccess: () => reset() });
                    }}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-3">
                            <Field label="Pour quel atelier ou cours ?" required error={errors.purpose}>
                                <TextInput value={data.purpose} onChange={(e) => setData('purpose', e.target.value)} placeholder="Ex. Atelier pâtisserie du jeudi" />
                            </Field>
                        </div>
                        <Field label="Classe" error={errors.school_class_id}>
                            <Select value={data.school_class_id} onChange={(e) => setData('school_class_id', e.target.value ? Number(e.target.value) : '')}>
                                <option value="">Aucune</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Nécessaire pour le" error={errors.needed_at}>
                            <TextInput type="date" value={data.needed_at} onChange={(e) => setData('needed_at', e.target.value)} />
                        </Field>
                        <div className="sm:col-span-3">
                            <Field label="Précisions" error={errors.notes}>
                                <Textarea rows={2} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                            </Field>
                        </div>
                    </div>
                    <LinesEditor products={products} lines={data.lines} onChange={(lines) => setData('lines', lines)} errors={errors as Record<string, string>} />
                    <div className="flex justify-end">
                        <button type="submit" disabled={processing} className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-800 disabled:opacity-50">
                            <Send className="h-4 w-4" aria-hidden="true" /> Envoyer la demande
                        </button>
                    </div>
                </form>
            </Card>

            <h2 className="mb-3 font-serif text-lg font-semibold text-ink-900">Mes demandes</h2>
            <Card className="overflow-hidden">
                <ul className="divide-y divide-ink-100">
                    {requests.data.map((r) => (
                        <li key={r.id} className="px-5 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-ink-900">{r.purpose}</p>
                                    <p className="text-xs text-ink-500">
                                        <span className="font-mono">{r.number}</span> · {[r.class, r.needed_at ? `pour le ${dateFr(r.needed_at)}` : `demandée le ${dateFr(r.created_at)}`].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REQUEST_TONES[r.status]}`}>{statuses[r.status]}</span>
                                    {r.status === 'en_attente' && (
                                        <button type="button" onClick={() => cancel(r)} aria-label={`Annuler la demande ${r.number}`} className="rounded-lg p-2 text-ink-400 outline-none hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-gold-500">
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-ink-600">{r.lines.map((l) => `${l.product} (${qty(l.quantity)} ${l.unit})`).join(' · ')}</p>
                            <p className="mt-1 text-xs text-ink-500">{HINTS[r.status]}</p>
                        </li>
                    ))}
                </ul>
                {requests.data.length === 0 && (
                    <div className="flex flex-col items-center gap-3 px-5 py-12 text-ink-500">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <p className="text-sm">Vous n'avez pas encore fait de demande.</p>
                    </div>
                )}
                <Pagination data={requests} />
            </Card>
        </PortalLayout>
    );
}
