import AdminLayout from '@/Layouts/AdminLayout';
import AttachmentsPanel from '@/Components/Admin/AttachmentsPanel';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Attachment, Paginated } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Inbox } from 'lucide-react';
import { useState } from 'react';

type LeaveRequestRow = {
    id: number;
    type: string;
    start_date: string;
    end_date: string;
    reason?: string | null;
    status: string;
    review_notes?: string | null;
    reviewed_at?: string | null;
    can_attach?: boolean;
    attachments?: Attachment[];
    user?: { id: number; name: string } | null;
    reviewed_by?: { id: number; name: string } | null;
};

interface Props {
    requests: Paginated<LeaveRequestRow>;
    types: Record<string, string>;
    statuses: Record<string, string>;
    canReview: boolean;
}

const statusStyles: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700 border-amber-200',
    approuve: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    refuse: 'bg-red-100 text-red-700 border-red-200',
    annule: 'bg-ink-100 text-ink-500 border-ink-200',
};

export default function Index({ requests, types, statuses, canReview }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'conge_paye',
        start_date: '',
        end_date: '',
        reason: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.leave.store'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

    const review = (id: number, status: 'approuve' | 'refuse') => {
        router.patch(
            route('admin.leave.status', id),
            { status, review_notes: reviewNotes[id] || null },
            { preserveScroll: true },
        );
    };

    const cancel = (id: number) => {
        router.post(route('admin.leave.cancel', id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Congés" />
            <PageHeader
                title="Congés"
                subtitle={canReview ? 'Toutes les demandes de congé du personnel.' : 'Vos demandes de congé.'}
            />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 text-base font-semibold text-ink-900">Nouvelle demande</h2>
                <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <Field label="Type" error={errors.type}>
                        <Select value={data.type} onChange={(e) => setData('type', e.target.value)}>
                            {Object.entries(types).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Du" error={errors.start_date}>
                        <TextInput
                            type="date"
                            value={data.start_date}
                            onChange={(e) => setData('start_date', e.target.value)}
                        />
                    </Field>
                    <Field label="Au" error={errors.end_date}>
                        <TextInput
                            type="date"
                            value={data.end_date}
                            onChange={(e) => setData('end_date', e.target.value)}
                        />
                    </Field>
                    <Field label="Motif (optionnel)" error={errors.reason}>
                        <TextInput value={data.reason} onChange={(e) => setData('reason', e.target.value)} />
                    </Field>
                    <div className="sm:col-span-4">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Envoyer la demande
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                {canReview && <th className="px-5 py-3">Personnel</th>}
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">Période</th>
                                <th className="px-5 py-3">Motif</th>
                                <th className="px-5 py-3">Justificatif</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {requests.data.map((r) => (
                                <tr key={r.id}>
                                    {canReview && <td className="px-5 py-3 font-medium text-ink-900">{r.user?.name ?? '—'}</td>}
                                    <td className="px-5 py-3 text-ink-700">{types[r.type] ?? r.type}</td>
                                    <td className="px-5 py-3 text-ink-700">
                                        {new Date(r.start_date).toLocaleDateString('fr-FR')} — {new Date(r.end_date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="max-w-xs px-5 py-3 text-ink-500">{r.reason || '—'}</td>
                                    <td className="px-5 py-3">
                                        <AttachmentsPanel variant="compact" target="leave" targetId={r.id} attachments={r.attachments} canManage={!!r.can_attach} />
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[r.status] ?? ''}`}>
                                            {statuses[r.status] ?? r.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {r.status === 'en_attente' && canReview && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <TextInput
                                                    placeholder="Note (optionnel)"
                                                    className="w-36"
                                                    value={reviewNotes[r.id] ?? ''}
                                                    onChange={(e) =>
                                                        setReviewNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                                                    }
                                                />
                                                <button
                                                    onClick={() => review(r.id, 'approuve')}
                                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                                >
                                                    Approuver
                                                </button>
                                                <button
                                                    onClick={() => review(r.id, 'refuse')}
                                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                                                >
                                                    Refuser
                                                </button>
                                            </div>
                                        )}
                                        {r.status === 'en_attente' && !canReview && (
                                            <button
                                                onClick={() => cancel(r.id)}
                                                className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                                            >
                                                Annuler
                                            </button>
                                        )}
                                        {r.status !== 'en_attente' && r.reviewed_by && (
                                            <span className="text-xs text-ink-500">par {r.reviewed_by.name}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {requests.data.length === 0 && (
                                <tr>
                                    <td colSpan={canReview ? 7 : 6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune demande de congé.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={requests} />
            </Card>
        </AdminLayout>
    );
}
