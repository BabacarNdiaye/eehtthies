import PortalLayout from '@/Layouts/PortalLayout';
import Inbox from '@/Components/Messaging/Inbox';
import Card from '@/Components/Admin/Card';
import { Checkbox, Field, TextInput, Textarea } from '@/Components/Admin/Field';
import { Head, useForm } from '@inertiajs/react';
import { Send, Users } from 'lucide-react';
import { useState } from 'react';
import { teacherNav } from './Dashboard';

interface Props {
    classes: { id: number; name: string }[];
}

export default function Messages({ classes }: Props) {
    const [showCompose, setShowCompose] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        school_class_ids: [] as number[],
        subject: '',
        body: '',
    });

    const toggleClass = (id: number, checked: boolean) => {
        setData('school_class_ids', checked ? [...data.school_class_ids, id] : data.school_class_ids.filter((c) => c !== id));
    };

    const toggleAllClasses = (checked: boolean) => {
        setData('school_class_ids', checked ? classes.map((c) => c.id) : []);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('teacher.messages.class'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowCompose(false);
            },
        });
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Messages" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-ink-900">Messages</h1>
                    <p className="mt-1 text-sm text-ink-500">Vos échanges avec l'administration et vos élèves.</p>
                </div>
                <button
                    onClick={() => setShowCompose((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    <Users className="h-4 w-4" /> Envoyer à toute une classe
                </button>
            </div>

            {showCompose && (
                <Card className="mb-6 p-6">
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Classe(s)" required error={errors.school_class_ids}>
                            <div className="rounded-lg border border-ink-200 p-3">
                                <label className="flex items-center gap-2 border-b border-ink-100 pb-2 text-sm font-medium text-ink-700">
                                    <Checkbox
                                        checked={classes.length > 0 && data.school_class_ids.length === classes.length}
                                        onChange={(e) => toggleAllClasses(e.target.checked)}
                                    />
                                    Toutes mes classes
                                </label>
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {classes.map((c) => (
                                        <label key={c.id} className="flex items-center gap-2 text-sm text-ink-700">
                                            <Checkbox
                                                checked={data.school_class_ids.includes(c.id)}
                                                onChange={(e) => toggleClass(c.id, e.target.checked)}
                                            />
                                            {c.name}
                                        </label>
                                    ))}
                                    {classes.length === 0 && (
                                        <p className="text-sm text-ink-400">Aucune classe assignée.</p>
                                    )}
                                </div>
                            </div>
                        </Field>
                        <Field label="Objet" required error={errors.subject}>
                            <TextInput value={data.subject} onChange={(e) => setData('subject', e.target.value)} />
                        </Field>
                        <Field label="Message" required error={errors.body}>
                            <Textarea rows={5} value={data.body} onChange={(e) => setData('body', e.target.value)} />
                        </Field>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={processing || data.school_class_ids.length === 0}
                                className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                                {data.school_class_ids.length > 1
                                    ? `Envoyer à ${data.school_class_ids.length} classes`
                                    : 'Envoyer à la classe'}
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            <Inbox />
        </PortalLayout>
    );
}
