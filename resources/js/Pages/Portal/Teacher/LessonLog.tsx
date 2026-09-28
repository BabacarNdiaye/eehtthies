import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import Card from '@/Components/Admin/Card';
import { Field, TextInput } from '@/Components/Admin/Field';
import { LessonLog as LessonLogType, TimetableEntry } from '@/types';
import { Head, router } from '@inertiajs/react';
import { BookText, Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    entries: (TimetableEntry & { school_class?: { id: number; name: string } | null })[];
    logs: Record<number, LessonLogType>;
    date: string;
}

export default function LessonLog({ entries, logs, date }: Props) {
    const [forms, setForms] = useState<Record<number, { content: string; homework: string }>>({});
    const [savedId, setSavedId] = useState<number | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        const initial: Record<number, { content: string; homework: string }> = {};
        entries.forEach((entry) => {
            const log = logs[entry.id];
            initial[entry.id] = { content: log?.content ?? '', homework: log?.homework ?? '' };
        });
        setForms(initial);
    }, [entries, logs]);

    const updateDate = (nextDate: string) => {
        router.get(route('teacher.lesson-log.index'), { date: nextDate }, { preserveState: true });
    };

    const save = (entryId: number) => {
        setProcessingId(entryId);
        router.post(
            route('teacher.lesson-log.store'),
            {
                timetable_entry_id: entryId,
                date,
                content: forms[entryId]?.content ?? '',
                homework: forms[entryId]?.homework || null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSavedId(entryId);
                    setTimeout(() => setSavedId((current) => (current === entryId ? null : current)), 2500);
                },
                onFinish: () => setProcessingId(null),
            },
        );
    };

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Cahier de texte" />
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-ink-900">Cahier de texte</h1>
                    <p className="mt-1 text-sm text-ink-500">Notez ce qui a été enseigné à chaque séance du jour.</p>
                </div>
                <Field label="Date">
                    <TextInput type="date" value={date} onChange={(e) => updateDate(e.target.value)} />
                </Field>
            </div>

            {entries.length === 0 && (
                <Card className="p-10 text-center text-ink-400">Aucun cours programmé ce jour-là.</Card>
            )}

            <div className="space-y-4">
                {entries.map((entry) => (
                    <Card key={entry.id} className="p-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink-900">
                                    <BookText className="h-4 w-4 text-gold-600" />
                                    {entry.subject?.name} — {entry.school_class?.name}
                                </h3>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                    </span>
                                    {entry.room && (
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" /> {entry.room.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {savedId === entry.id && (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    Enregistré
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Contenu de la séance">
                                <textarea
                                    rows={3}
                                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                                    value={forms[entry.id]?.content ?? ''}
                                    onChange={(e) =>
                                        setForms((prev) => ({
                                            ...prev,
                                            [entry.id]: { ...prev[entry.id], content: e.target.value },
                                        }))
                                    }
                                    placeholder="Ce qui a été vu en classe..."
                                />
                            </Field>
                            <Field label="Devoirs donnés (optionnel)">
                                <textarea
                                    rows={3}
                                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                                    value={forms[entry.id]?.homework ?? ''}
                                    onChange={(e) =>
                                        setForms((prev) => ({
                                            ...prev,
                                            [entry.id]: { ...prev[entry.id], homework: e.target.value },
                                        }))
                                    }
                                    placeholder="Exercices, lecture..."
                                />
                            </Field>
                        </div>

                        <div className="mt-3 flex justify-end">
                            <button
                                type="button"
                                onClick={() => save(entry.id)}
                                disabled={processingId === entry.id || !forms[entry.id]?.content}
                                className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
        </PortalLayout>
    );
}
