import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput, Textarea } from '@/Components/Admin/Field';
import { Paginated } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, useForm } from '@inertiajs/react';
import { Inbox, Megaphone } from 'lucide-react';

type Announcement = {
    id: number;
    title: string;
    body: string;
    priority: 'normale' | 'importante' | 'urgente';
    audience_type: string;
    recipients_count: number;
    created_by: { id: number; name: string } | null;
    created_at: string;
};

interface Props {
    announcements: Paginated<Announcement>;
    formations: { id: number; name: string }[];
    schoolClasses: { id: number; name: string }[];
    priorities: Record<string, string>;
    audienceTypes: Record<string, string>;
}

const priorityBadge: Record<string, string> = {
    normale: 'bg-ink-100 text-ink-600',
    importante: 'bg-amber-100 text-amber-700',
    urgente: 'bg-red-100 text-red-700',
};

export default function Index({ announcements, formations, schoolClasses, priorities, audienceTypes }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        body: '',
        priority: 'normale',
        audience_type: 'ecole',
        audience_id: '' as number | '',
    });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!await confirmAction('Confirmer l\'envoi de cette annonce ? Elle sera livrée immédiatement à tous les destinataires ciblés.')) {
            return;
        }
        post(route('admin.announcements.store'), { preserveScroll: true, onSuccess: () => reset('title', 'body') });
    };

    const needsAudienceId = data.audience_type === 'formation' || data.audience_type === 'classe';

    return (
        <AdminLayout>
            <Head title="Annonces officielles" />
            <PageHeader
                title="Annonces officielles"
                subtitle="Diffusez une communication institutionnelle vers toute l'école, une formation, une classe, les élèves, les parents, les enseignants ou le personnel administratif."
            />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Nouvelle annonce</h2>
                <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Field label="Titre" required error={errors.title}>
                            <TextInput value={data.title} onChange={(e) => setData('title', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Priorité" required error={errors.priority}>
                        <Select value={data.priority} onChange={(e) => setData('priority', e.target.value)}>
                            {Object.entries(priorities).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Destinataires" required error={errors.audience_type}>
                        <Select
                            value={data.audience_type}
                            onChange={(e) => setData('audience_type', e.target.value as typeof data.audience_type)}
                        >
                            {Object.entries(audienceTypes).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    {needsAudienceId && (
                        <div className="sm:col-span-2">
                            <Field label={data.audience_type === 'formation' ? 'Formation' : 'Classe'} required error={errors.audience_id}>
                                <Select
                                    value={data.audience_id}
                                    onChange={(e) => setData('audience_id', e.target.value ? Number(e.target.value) : '')}
                                >
                                    <option value="">Sélectionner...</option>
                                    {(data.audience_type === 'formation' ? formations : schoolClasses).map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                    )}
                    <div className="sm:col-span-2">
                        <Field label="Message" required error={errors.body}>
                            <Textarea rows={5} value={data.body} onChange={(e) => setData('body', e.target.value)} />
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            <Megaphone className="h-4 w-4" /> Envoyer l'annonce
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Titre</th>
                                <th className="px-5 py-3">Priorité</th>
                                <th className="px-5 py-3">Cible</th>
                                <th className="px-5 py-3">Destinataires</th>
                                <th className="px-5 py-3">Envoyée par</th>
                                <th className="px-5 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {announcements.data.map((a) => (
                                <tr key={a.id} className="hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{a.title}</td>
                                    <td className="px-5 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadge[a.priority]}`}>
                                            {priorities[a.priority]}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{audienceTypes[a.audience_type] ?? a.audience_type}</td>
                                    <td className="px-5 py-3 text-ink-600">{a.recipients_count}</td>
                                    <td className="px-5 py-3 text-ink-600">{a.created_by?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-500">{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                                </tr>
                            ))}
                            {announcements.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune annonce envoyée pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={announcements} />
            </Card>
        </AdminLayout>
    );
}
