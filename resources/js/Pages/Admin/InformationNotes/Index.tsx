import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select, TextInput, Textarea } from '@/Components/Admin/Field';
import { Paginated } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, useForm } from '@inertiajs/react';
import { FileText, Inbox, Send } from 'lucide-react';

type Note = {
    id: number;
    reference: string;
    note_date: string;
    subject: string;
    audience: string;
    recipients_count: number;
    emails_count: number;
    created_by: string | null;
};

interface Props {
    notes: Paginated<Note>;
    nextReference: string;
    today: string;
    audienceTypes: Record<string, string>;
    formations: { id: number; name: string }[];
    schoolClasses: { id: number; name: string }[];
}

export default function Index({ notes, nextReference, today, audienceTypes, formations, schoolClasses }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        note_date: today,
        subject: '',
        body: '',
        audience_type: 'eleves',
        audience_id: '' as number | '',
        send_email: true,
    });

    const needsAudienceId = data.audience_type === 'formation' || data.audience_type === 'classe';

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!await confirmAction('Confirmer l\'envoi de cette note d\'information ? Un numéro lui sera attribué et elle sera livrée immédiatement aux destinataires.')) {
            return;
        }
        post(route('admin.information-notes.store'), { preserveScroll: true, onSuccess: () => reset('subject', 'body') });
    };

    return (
        <AdminLayout>
            <Head title="Notes d'information" />
            <PageHeader
                title="Notes d'information"
                subtitle="Rédigez une note officielle de la Direction : le numéro est généré automatiquement, elle est envoyée aux destinataires choisis et téléchargeable en PDF sur papier à en-tête."
            />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Nouvelle note</h2>
                <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Numéro (généré automatiquement)">
                        <TextInput value={`N° ${nextReference}`} readOnly disabled />
                    </Field>
                    <Field label="Date" required error={errors.note_date}>
                        <TextInput type="date" value={data.note_date} onChange={(e) => setData('note_date', e.target.value)} />
                    </Field>
                    <Field label="Destinataires" required error={errors.audience_type}>
                        <Select value={data.audience_type} onChange={(e) => setData('audience_type', e.target.value)}>
                            {Object.entries(audienceTypes).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    {needsAudienceId ? (
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
                    ) : (
                        <div className="hidden sm:block" />
                    )}
                    <div className="sm:col-span-2">
                        <Field label="Objet" required error={errors.subject}>
                            <TextInput value={data.subject} onChange={(e) => setData('subject', e.target.value)} />
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="Contenu" required error={errors.body}>
                            <Textarea rows={10} value={data.body} onChange={(e) => setData('body', e.target.value)} />
                        </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
                        <input
                            type="checkbox"
                            checked={data.send_email}
                            onChange={(e) => setData('send_email', e.target.checked)}
                            className="h-4 w-4 rounded border-ink-300"
                        />
                        Envoyer aussi par e-mail, avec le PDF de la note en pièce jointe
                    </label>
                    <div className="sm:col-span-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" /> Envoyer la note
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">N°</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Objet</th>
                                <th className="px-5 py-3">Cible</th>
                                <th className="px-5 py-3">Destinataires</th>
                                <th className="px-5 py-3">E-mails</th>
                                <th className="px-5 py-3">Rédigée par</th>
                                <th className="px-5 py-3 text-right">PDF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {notes.data.map((n) => (
                                <tr key={n.id} className="hover:bg-ink-50/60">
                                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-ink-700">{n.reference}</td>
                                    <td className="px-5 py-3 text-ink-500">{new Date(n.note_date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-5 py-3 font-medium text-ink-900">{n.subject}</td>
                                    <td className="px-5 py-3 text-ink-600">{n.audience}</td>
                                    <td className="px-5 py-3 text-ink-600">{n.recipients_count}</td>
                                    <td className="px-5 py-3 text-ink-600">{n.emails_count}</td>
                                    <td className="px-5 py-3 text-ink-600">{n.created_by ?? '—'}</td>
                                    <td className="px-5 py-3 text-right">
                                        <a
                                            href={route('admin.information-notes.pdf', n.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                        >
                                            <FileText className="h-3.5 w-3.5" /> Ouvrir
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {notes.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune note d'information pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={notes} />
            </Card>
        </AdminLayout>
    );
}
