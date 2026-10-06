import Card from '@/Components/Admin/Card';
import { Field, Select, TextInput } from '@/Components/Admin/Field';
import RichTextEditor from '@/Components/RichText/RichTextEditor';
import RichTextView from '@/Components/RichText/RichTextView';
import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Head, router, useForm } from '@inertiajs/react';
import { Home, Trash2 } from 'lucide-react';
import { FormEvent } from 'react';

interface Pair {
    school_class_id: number;
    subject_id: number;
    class_name: string;
    subject_name: string;
}

interface Assignment {
    id: number;
    title: string;
    instructions: string | null;
    given_on: string;
    due_date: string;
    school_class?: { name: string } | null;
    subject?: { name: string } | null;
}

const day = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });

export default function Assignments({ assignments, pairs }: { assignments: Assignment[]; pairs: Pair[] }) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const form = useForm({ pair: '', title: '', instructions: '', due_date: tomorrow });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const [school_class_id, subject_id] = form.data.pair.split('-');
        form.transform((d) => ({ school_class_id, subject_id, title: d.title, instructions: d.instructions || null, due_date: d.due_date }));
        form.post(route('teacher.assignments.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('title', 'instructions'),
        });
    };

    const destroy = (a: Assignment) => {
        if (confirm(`Supprimer « ${a.title} » ?`)) router.delete(route('teacher.assignments.destroy', a.id), { preserveScroll: true });
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Travaux à la maison" />
            <div className="mb-6">
                <h1 className="hidden font-serif text-2xl font-bold text-ink-900 lg:block">Travaux à la maison</h1>
                <p className="mt-1 text-sm text-ink-500">Donnez un travail à faire à la maison : les élèves de la classe le voient dans leur espace et dans EEHT Connect.</p>
            </div>

            <Card className="mb-6 p-5">
                {pairs.length === 0 ? (
                    <p className="text-sm text-ink-500">Aucune classe n'est associée à votre emploi du temps pour le moment.</p>
                ) : (
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Classe et matière" error={(form.errors as Record<string, string>).school_class_id}>
                                <Select value={form.data.pair} onChange={(e) => form.setData('pair', e.target.value)} required>
                                    <option value="">Choisir…</option>
                                    {pairs.map((p) => (
                                        <option key={`${p.school_class_id}-${p.subject_id}`} value={`${p.school_class_id}-${p.subject_id}`}>
                                            {p.class_name} — {p.subject_name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="À rendre pour le" error={form.errors.due_date}>
                                <TextInput type="date" min={new Date().toISOString().slice(0, 10)} value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} required />
                            </Field>
                        </div>
                        <Field label="Titre" error={form.errors.title}>
                            <TextInput value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="Ex. Exercices 4 à 8 page 52" required />
                        </Field>
                        <Field label="Consignes (optionnel)" error={form.errors.instructions}>
                            <RichTextEditor label="Consignes" value={form.data.instructions} onChange={(html) => form.setData('instructions', html)} placeholder="Détails, ressources, barème…" minHeight="7rem" />
                        </Field>
                        <div className="flex justify-end">
                            <button disabled={form.processing || !form.data.pair || !form.data.title} className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                                Donner le travail
                            </button>
                        </div>
                    </form>
                )}
            </Card>

            <div className="space-y-3">
                {assignments.length === 0 && <Card className="p-8 text-center text-sm text-ink-400">Aucun travail donné pour l'instant.</Card>}
                {assignments.map((a) => (
                    <Card key={a.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 font-semibold text-ink-900">
                                    <Home className="h-4 w-4 shrink-0 text-gold-600" /> {a.title}
                                </p>
                                <p className="mt-0.5 text-xs text-ink-500">
                                    {[a.school_class?.name, a.subject?.name].filter(Boolean).join(' · ')} · donné le {day(a.given_on)} · pour le {day(a.due_date)}
                                </p>
                            </div>
                            <button type="button" onClick={() => destroy(a)} aria-label={`Supprimer ${a.title}`} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <RichTextView html={a.instructions} className="mt-2 text-sm" />
                    </Card>
                ))}
            </div>
        </PortalLayout>
    );
}
