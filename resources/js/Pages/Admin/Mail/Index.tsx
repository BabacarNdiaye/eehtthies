import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, TextInput, Textarea } from '@/Components/Admin/Field';
import { Paginated, SentEmail, Student, Teacher } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Mail, Search, Send, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

type Recipient = { email: string; name: string };

export default function Index({
    students,
    teachers,
    history,
}: {
    students: Student[];
    teachers: Teacher[];
    history: Paginated<SentEmail>;
}) {
    const [studentSearch, setStudentSearch] = useState('');
    const [teacherSearch, setTeacherSearch] = useState('');
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [selectedNames, setSelectedNames] = useState<Record<string, string>>({});
    const [extraEmails, setExtraEmails] = useState('');

    const { data, setData, post, transform, processing, errors, reset } = useForm({
        subject: '',
        body: '',
    });

    const filteredStudents = useMemo(() => {
        const q = studentSearch.trim().toLowerCase();
        if (!q) return students;
        return students.filter(
            (s) =>
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q),
        );
    }, [students, studentSearch]);

    const filteredTeachers = useMemo(() => {
        const q = teacherSearch.trim().toLowerCase();
        if (!q) return teachers;
        return teachers.filter(
            (t) =>
                `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
                t.email?.toLowerCase().includes(q),
        );
    }, [teachers, teacherSearch]);

    const toggle = (email: string, name: string) => {
        setSelectedEmails((prev) => {
            const next = new Set(prev);
            if (next.has(email)) {
                next.delete(email);
            } else {
                next.add(email);
            }
            return next;
        });
        setSelectedNames((prev) => ({ ...prev, [email]: name }));
    };

    const toggleAll = (items: { email?: string | null }[], names: Record<string, string>, on: boolean) => {
        setSelectedEmails((prev) => {
            const next = new Set(prev);
            items.forEach((i) => {
                if (!i.email) return;
                if (on) next.add(i.email);
                else next.delete(i.email);
            });
            return next;
        });
        setSelectedNames((prev) => ({ ...prev, ...names }));
    };

    const studentsAllSelected =
        filteredStudents.length > 0 && filteredStudents.every((s) => s.email && selectedEmails.has(s.email));
    const teachersAllSelected =
        filteredTeachers.length > 0 && filteredTeachers.every((t) => t.email && selectedEmails.has(t.email));

    const extraRecipients: Recipient[] = extraEmails
        .split(/[,;\n]/)
        .map((e) => e.trim())
        .filter((e) => /^\S+@\S+\.\S+$/.test(e))
        .map((email) => ({ email, name: '' }));

    const pickedRecipients: Recipient[] = [
        ...Array.from(selectedEmails).map((email) => ({ email, name: selectedNames[email] ?? '' })),
        ...extraRecipients,
    ];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pickedRecipients.length === 0) return;

        transform((data) => ({ ...data, recipients: pickedRecipients }));
        post(route('admin.mail.send'), {
            onSuccess: () => {
                reset('subject', 'body');
                setSelectedEmails(new Set());
                setSelectedNames({});
                setExtraEmails('');
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Messagerie" />
            <PageHeader
                title="Messagerie"
                subtitle="Envoyez un e-mail directement aux élèves et enseignants, et consultez l'historique des envois."
            />

            <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-6">
                        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-ink-900">
                            <Mail className="h-5 w-5 text-gold-600" /> Rédiger un e-mail
                        </h2>
                        <div className="space-y-4">
                            <Field label="Objet" required error={errors.subject}>
                                <TextInput value={data.subject} onChange={(e) => setData('subject', e.target.value)} />
                            </Field>
                            <Field label="Message" required error={errors.body}>
                                <Textarea rows={10} value={data.body} onChange={(e) => setData('body', e.target.value)} />
                            </Field>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-1 font-serif text-lg font-bold text-ink-900">Autres destinataires</h2>
                        <p className="mb-3 text-sm text-ink-500">Adresses e-mail libres, séparées par des virgules.</p>
                        <TextInput
                            value={extraEmails}
                            onChange={(e) => setExtraEmails(e.target.value)}
                            placeholder="parent1@exemple.com, partenaire@exemple.com"
                        />
                    </Card>

                    <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4">
                        <p className="text-sm text-ink-600">
                            <span className="font-semibold text-ink-900">{pickedRecipients.length}</span>{' '}
                            destinataire{pickedRecipients.length > 1 ? 's' : ''} sélectionné
                            {pickedRecipients.length > 1 ? 's' : ''}
                        </p>
                        <button
                            type="submit"
                            disabled={processing || pickedRecipients.length === 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Send className="h-4 w-4" /> Envoyer
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink-900">
                                <Users className="h-4 w-4 text-gold-600" /> Élèves
                            </h3>
                            <label className="flex items-center gap-1.5 text-xs text-ink-500">
                                <input
                                    type="checkbox"
                                    checked={studentsAllSelected}
                                    onChange={(e) =>
                                        toggleAll(
                                            filteredStudents,
                                            Object.fromEntries(
                                                filteredStudents
                                                    .filter((s) => s.email)
                                                    .map((s) => [s.email as string, `${s.first_name} ${s.last_name}`]),
                                            ),
                                            e.target.checked,
                                        )
                                    }
                                    className="rounded border-ink-300 text-gold-700 focus:ring-gold-500"
                                />
                                Tout
                            </label>
                        </div>
                        <div className="relative mb-3">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-300" />
                            <input
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full rounded-lg border border-ink-200 py-2 pl-8 pr-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                            />
                        </div>
                        <div className="max-h-64 space-y-1 overflow-y-auto">
                            {filteredStudents.length === 0 && (
                                <p className="py-2 text-center text-xs text-ink-500">Aucun élève avec e-mail.</p>
                            )}
                            {filteredStudents.map((s) => (
                                <label
                                    key={s.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!s.email && selectedEmails.has(s.email)}
                                        onChange={() => s.email && toggle(s.email, `${s.first_name} ${s.last_name}`)}
                                        className="rounded border-ink-300 text-gold-700 focus:ring-gold-500"
                                    />
                                    <span
                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.user_id ? 'bg-emerald-500' : 'bg-ink-200'}`}
                                        title={s.user_id ? 'Accès activé — recevra un message interne' : "Pas d'accès — recevra un e-mail"}
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                        {s.first_name} {s.last_name}
                                        {s.school_class && (
                                            <span className="ml-1 text-xs text-ink-500">({s.school_class.name})</span>
                                        )}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink-900">
                                <Users className="h-4 w-4 text-gold-600" /> Enseignants
                            </h3>
                            <label className="flex items-center gap-1.5 text-xs text-ink-500">
                                <input
                                    type="checkbox"
                                    checked={teachersAllSelected}
                                    onChange={(e) =>
                                        toggleAll(
                                            filteredTeachers,
                                            Object.fromEntries(
                                                filteredTeachers
                                                    .filter((t) => t.email)
                                                    .map((t) => [t.email as string, `${t.first_name} ${t.last_name}`]),
                                            ),
                                            e.target.checked,
                                        )
                                    }
                                    className="rounded border-ink-300 text-gold-700 focus:ring-gold-500"
                                />
                                Tout
                            </label>
                        </div>
                        <div className="relative mb-3">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-300" />
                            <input
                                value={teacherSearch}
                                onChange={(e) => setTeacherSearch(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full rounded-lg border border-ink-200 py-2 pl-8 pr-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                            />
                        </div>
                        <div className="max-h-64 space-y-1 overflow-y-auto">
                            {filteredTeachers.length === 0 && (
                                <p className="py-2 text-center text-xs text-ink-500">Aucun enseignant avec e-mail.</p>
                            )}
                            {filteredTeachers.map((t) => (
                                <label
                                    key={t.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!t.email && selectedEmails.has(t.email)}
                                        onChange={() => t.email && toggle(t.email, `${t.first_name} ${t.last_name}`)}
                                        className="rounded border-ink-300 text-gold-700 focus:ring-gold-500"
                                    />
                                    <span
                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.user_id ? 'bg-emerald-500' : 'bg-ink-200'}`}
                                        title={t.user_id ? 'Accès activé — recevra un message interne' : "Pas d'accès — recevra un e-mail"}
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                        {t.first_name} {t.last_name}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-ink-500">
                            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
                            Accès activé (message interne) &nbsp;
                            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-ink-200 align-middle" />
                            Pas d'accès (e-mail)
                        </p>
                    </Card>
                </div>
            </form>

            <Card className="mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                    <h2 className="font-serif text-lg font-bold text-ink-900">Réponses et conversations</h2>
                    <p className="mt-1 text-sm text-ink-500">
                        Les messages envoyés aux personnes ayant un accès arrivent dans leur conversation privée EEHT Connect :
                        leurs réponses s'y trouvent.
                    </p>
                </div>
                <a
                    href={route('connect.index')}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    <Send className="h-4 w-4" /> Ouvrir EEHT Connect
                </a>
            </Card>

            <Card className="mt-8 overflow-hidden">
                <div className="p-6 pb-0">
                    <h2 className="font-serif text-lg font-bold text-ink-900">Historique des envois</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="mt-4 w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-500">
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Objet</th>
                                <th className="px-6 py-3">Destinataires</th>
                                <th className="px-6 py-3">Expéditeur</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-50">
                            {history.data.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Mail className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun e-mail envoyé pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {history.data.map((mail) => (
                                <tr key={mail.id}>
                                    <td className="whitespace-nowrap px-6 py-3 text-ink-500">
                                        {new Date(mail.created_at).toLocaleString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-3 font-medium text-ink-900">{mail.subject}</td>
                                    <td className="px-6 py-3 text-ink-500">{mail.recipients_count}</td>
                                    <td className="px-6 py-3 text-ink-500">{mail.sender?.name ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination data={history} />
            </Card>
        </AdminLayout>
    );
}
