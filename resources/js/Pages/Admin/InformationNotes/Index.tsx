import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import RichTextEditor, { richContentClass } from '@/Components/Admin/RichTextEditor';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import { Paginated } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, useForm } from '@inertiajs/react';
import { FileText, Hash, Inbox, Mail, Send, Users } from 'lucide-react';

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
    yearCount: number;
    today: string;
    audienceTypes: Record<string, string>;
    formations: { id: number; name: string }[];
    schoolClasses: { id: number; name: string }[];
}

const BURGUNDY = '#7a1648';

/** Unité du papier : 1 pt d'une page A4 de 595 pt, ramené à la largeur réelle de l'aperçu. */
const pt = (n: number) => `calc(${n} * 100cqw / 595)`;

/** Aperçu en direct de la note sur le papier à en-tête de l'école. */
function Paper({ reference, date, subject, html }: { reference: string; date: string; subject: string; html: string }) {
    const [num, ...suffix] = reference.split('.');
    const shownDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR') : '';

    return (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg ring-1 ring-black/5">
            <div style={{ containerType: 'inline-size' }}>
                <div className="relative w-full bg-white" style={{ aspectRatio: '595 / 842', fontFamily: 'Helvetica, Arial, sans-serif', color: '#111' }}>
                    <img src="/images/letterhead/header-band.png" alt="" className="absolute left-0 top-0 w-full" />
                    <img src="/images/letterhead/republic.png" alt="" className="absolute" style={{ top: pt(46), left: pt(40), width: pt(205) }} />
                    <div className="absolute font-bold" style={{ top: pt(126), left: pt(38), fontSize: pt(14), color: '#2b3347' }}>
                        Elite Ecole Hôtelière et Touristique
                    </div>
                    <img src="/images/letterhead/logo-eeht.png" alt="" className="absolute" style={{ top: pt(88), left: pt(293), width: pt(62) }} />
                    <div className="absolute font-bold" style={{ top: pt(97), left: pt(400), fontSize: pt(10.5) }}>
                        N° &nbsp;<span style={{ color: '#d62828' }}>{num}.</span> {suffix.join('.')}
                    </div>
                    <div className="absolute font-bold" style={{ top: pt(117), left: pt(420), fontSize: pt(12.5) }}>
                        Thies le <span style={{ color: '#d62828' }}>{shownDate}</span>
                    </div>
                    <div className="absolute bg-black" style={{ top: pt(158), left: pt(130), width: pt(333), height: pt(3) }} />

                    <div className="absolute overflow-hidden" style={{ top: pt(245), left: pt(60), right: pt(60), bottom: pt(125) }}>
                        <h3 className="text-center font-bold" style={{ fontSize: pt(22), marginBottom: pt(20) }}>
                            OBJET :{' '}
                            <span className="font-normal" style={{ fontSize: pt(15) }}>
                                {subject || <span style={{ color: '#aaa' }}>…</span>}
                            </span>
                        </h3>
                        {html ? (
                            <div
                                className={`text-justify ${richContentClass}`}
                                style={{ fontSize: pt(12), lineHeight: 1.55 }}
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        ) : (
                            <p style={{ fontSize: pt(12), color: '#aaa' }}>Le contenu de la note apparaîtra ici…</p>
                        )}
                        <p className="text-right font-bold italic" style={{ fontSize: pt(15), marginTop: pt(30) }}>
                            La Direction de l’EEHT de Thiès
                        </p>
                    </div>

                    <div className="absolute bg-black" style={{ bottom: pt(113), left: pt(125), width: pt(333), height: pt(2.5) }} />
                    <div className="absolute w-full text-center" style={{ bottom: pt(55), fontSize: pt(10), lineHeight: 1.45, color: '#222' }}>
                        EEHT: Elite Ecole Hôtelière et Touristique Thiès- Sénégal
                        <br />
                        Adresse : Située sur l’axe Thiès l’autoroute à péage à l’entrée de la ville.
                        <br />
                        Tel: 33 959 05 98 / 77379 48 98 / 76 182 28 54 . &nbsp; Email:eeht4034@gmail.com
                    </div>
                    <img src="/images/letterhead/footer-band.png" alt="" className="absolute bottom-0 left-0 w-full" />
                </div>
            </div>
        </div>
    );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
    return (
        <Card className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: BURGUNDY }}>
                <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
                <p className="truncate font-serif text-lg font-bold text-ink-900">{value}</p>
            </div>
        </Card>
    );
}

export default function Index({ notes, nextReference, yearCount, today, audienceTypes, formations, schoolClasses }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        note_date: today,
        subject: '',
        body: '',
        audience_type: 'eleves',
        audience_id: '' as number | '',
        send_email: true,
    });

    const needsAudienceId = data.audience_type === 'formation' || data.audience_type === 'classe';
    const emailsOnPage = notes.data.reduce((sum, n) => sum + n.emails_count, 0);

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
                subtitle="Rédigez une note officielle de la Direction : numérotée automatiquement, envoyée aux destinataires choisis et téléchargeable en PDF sur papier à en-tête."
            />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat icon={Hash} label="Prochain numéro" value={nextReference} />
                <Stat icon={FileText} label={`Notes en ${new Date().getFullYear()}`} value={String(yearCount)} />
                <Stat icon={Mail} label="E-mails (page affichée)" value={String(emailsOnPage)} />
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-5">
                <form onSubmit={submit} className="space-y-5 xl:col-span-3">
                    <Card className="p-6">
                        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                            <span className="h-5 w-1 rounded-full" style={{ background: BURGUNDY }} /> Rédaction
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Numéro (automatique)">
                                <TextInput value={`N° ${nextReference}`} readOnly disabled />
                            </Field>
                            <Field label="Date" required error={errors.note_date}>
                                <TextInput type="date" value={data.note_date} onChange={(e) => setData('note_date', e.target.value)} />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Objet" required error={errors.subject}>
                                    <TextInput
                                        value={data.subject}
                                        onChange={(e) => setData('subject', e.target.value)}
                                        placeholder="Ex. : Reprise des cours et tenue obligatoire"
                                    />
                                </Field>
                            </div>
                            <div className="sm:col-span-2">
                                <Field label="Contenu" required>
                                    <RichTextEditor value={data.body} onChange={(html) => setData('body', html)} error={errors.body} />
                                </Field>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                            <span className="h-5 w-1 rounded-full" style={{ background: BURGUNDY }} /> Diffusion
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Destinataires" required error={errors.audience_type}>
                                <Select value={data.audience_type} onChange={(e) => setData('audience_type', e.target.value)}>
                                    {Object.entries(audienceTypes).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            {needsAudienceId && (
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
                            )}
                        </div>
                        <label className="mt-4 flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-50/60 p-3 text-sm text-ink-700">
                            <input
                                type="checkbox"
                                checked={data.send_email}
                                onChange={(e) => setData('send_email', e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-ink-300"
                            />
                            <span>
                                <span className="font-semibold text-ink-900">Envoyer aussi par e-mail</span>
                                <br />
                                Le PDF de la note, sur papier à en-tête, est joint au message.
                            </span>
                        </label>
                        <div className="mt-5 flex justify-end">
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                                style={{ background: BURGUNDY }}
                            >
                                <Send className="h-4 w-4" /> Envoyer la note
                            </button>
                        </div>
                    </Card>
                </form>

                <div className="xl:col-span-2">
                    <div className="xl:sticky xl:top-6">
                        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                            <Users className="h-3.5 w-3.5" /> Aperçu — {audienceTypes[data.audience_type]}
                        </p>
                        <Paper reference={nextReference} date={data.note_date} subject={data.subject} html={data.body} />
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-ink-100 px-5 py-4">
                    <h2 className="font-serif text-lg font-bold text-ink-900">Notes envoyées</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">N°</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Objet</th>
                                <th className="px-5 py-3">Cible</th>
                                <th className="px-5 py-3 text-center">Destinataires</th>
                                <th className="px-5 py-3 text-center">E-mails</th>
                                <th className="px-5 py-3">Rédigée par</th>
                                <th className="px-5 py-3 text-right">PDF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {notes.data.map((n) => (
                                <tr key={n.id} className="hover:bg-ink-50/60">
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <span className="rounded-md px-2 py-1 font-mono text-xs font-semibold text-white" style={{ background: BURGUNDY }}>
                                            {n.reference}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3 text-ink-500">{new Date(n.note_date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-5 py-3 font-medium text-ink-900">{n.subject}</td>
                                    <td className="px-5 py-3">
                                        <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">{n.audience}</span>
                                    </td>
                                    <td className="px-5 py-3 text-center text-ink-600">{n.recipients_count}</td>
                                    <td className="px-5 py-3 text-center text-ink-600">{n.emails_count}</td>
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
