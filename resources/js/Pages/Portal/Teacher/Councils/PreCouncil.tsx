import Card from '@/Components/Admin/Card';
import { Select, Textarea } from '@/Components/Admin/Field';
import AppreciationPicker, { BankEntry } from '@/Components/Council/AppreciationPicker';
import useMediaQuery from '@/hooks/useMediaQuery';
import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Observation {
    council_student_id: number;
    subject_id: number;
    appreciation: string | null;
    internal_note: string | null;
    difficulty: string | null;
    recommendation: string | null;
    revision: number;
}

interface Props {
    council: { id: number; class: string | null; term: string; year: string | null; status_label: string; deadline: string | null };
    open: boolean;
    subjects: { id: number; name: string }[];
    students: { id: number; name: string; matricule: string; has_left_class: boolean; averages: Record<number, number | null> }[];
    observations: Record<string, Observation>;
    difficulties: Record<string, string>;
    bank: BankEntry[];
    levels: Record<string, string>;
    themes: Record<string, string>;
    progress: { teacher: string; subjects: string[]; filled: number; total: number }[] | null;
}

type Entry = { appreciation: string; internal_note: string; difficulty: string; recommendation: string; revision?: number };

const keyOf = (studentId: number, subjectId: number) => `${studentId}-${subjectId}`;

/** Pré-conseil (E04) : tableau sur ordinateur, une fiche par élève sur téléphone ; enregistrement automatique. */
export default function PreCouncil({ council, open, subjects, students, observations, difficulties, bank, levels, themes, progress }: Props) {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const [subjectId, setSubjectId] = useState<number>(subjects[0]?.id ?? 0);
    const [entries, setEntries] = useState<Record<string, Entry>>(() =>
        Object.fromEntries(
            Object.entries(observations).map(([key, observation]) => [
                key,
                { appreciation: observation.appreciation ?? '', internal_note: observation.internal_note ?? '', difficulty: observation.difficulty ?? '', recommendation: observation.recommendation ?? '', revision: observation.revision },
            ]),
        ),
    );
    const [index, setIndex] = useState(0);
    const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
    const dirty = useRef(new Set<string>());

    const entryFor = (studentId: number): Entry => entries[keyOf(studentId, subjectId)] ?? { appreciation: '', internal_note: '', difficulty: '', recommendation: '' };

    const change = (studentId: number, patch: Partial<Entry>) => {
        const key = keyOf(studentId, subjectId);
        setEntries((all) => ({ ...all, [key]: { ...entryFor(studentId), ...all[key], ...patch } }));
        dirty.current.add(key);
    };

    const flush = async () => {
        if (!open || dirty.current.size === 0) return;
        const keys = [...dirty.current];
        dirty.current.clear();
        const payload = keys.map((key) => {
            const [studentId, subject] = key.split('-').map(Number);
            const entry = entries[key];

            return { council_student_id: studentId, subject_id: subject, ...entry, difficulty: entry.difficulty || null };
        });
        setStatus({ tone: 'ok', text: 'Enregistrement…' });
        try {
            const { data } = await window.axios.put(route('teacher.councils.precouncil.save', council.id), { entries: payload });
            applyRevisions(data.saved);
            setStatus({ tone: 'ok', text: 'Enregistré' });
        } catch (error: unknown) {
            const response = (error as { response?: { status: number; data: { message?: string; saved?: Observation[]; conflicts?: Observation[] } } }).response;
            if (response?.status === 409) {
                applyRevisions(response.data.saved ?? []);
                setEntries((all) => {
                    const next = { ...all };
                    for (const conflict of response.data.conflicts ?? []) {
                        next[keyOf(conflict.council_student_id, conflict.subject_id)] = {
                            appreciation: conflict.appreciation ?? '', internal_note: conflict.internal_note ?? '', difficulty: conflict.difficulty ?? '', recommendation: conflict.recommendation ?? '', revision: conflict.revision,
                        };
                    }
                    return next;
                });
                setStatus({ tone: 'error', text: 'Une saisie a été modifiée entre-temps : la version enregistrée est rechargée.' });
            } else {
                keys.forEach((key) => dirty.current.add(key));
                setStatus({ tone: 'error', text: response?.data?.message ?? 'Hors connexion : la saisie est gardée et repartira.' });
            }
        }
    };

    const applyRevisions = (saved: { council_student_id: number; subject_id: number; revision: number }[]) =>
        setEntries((all) => {
            const next = { ...all };
            for (const item of saved) {
                const key = keyOf(item.council_student_id, item.subject_id);
                next[key] = { ...next[key], revision: item.revision };
            }
            return next;
        });

    useEffect(() => {
        const timer = window.setTimeout(() => void flush(), 1500);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries]);

    const filled = students.filter((student) => !student.has_left_class && entryFor(student.id).appreciation.trim() !== '').length;
    const expected = students.filter((student) => !student.has_left_class).length;
    const average = (studentId: number) => students.find((student) => student.id === studentId)?.averages[subjectId];

    const fields = (studentId: number, name: string) => {
        const entry = entryFor(studentId);

        return (
            <div className="space-y-3">
                <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label htmlFor={`app-${studentId}`} className="text-sm font-medium text-ink-800">
                            Appréciation (publiable)
                        </label>
                        <AppreciationPicker bank={bank} levels={levels} themes={themes} disabled={!open} label={`Banque d’appréciations pour ${name}`} onPick={(text) => change(studentId, { appreciation: text })} />
                    </div>
                    <Textarea id={`app-${studentId}`} rows={isDesktop ? 2 : 3} disabled={!open} value={entry.appreciation} onChange={(e) => change(studentId, { appreciation: e.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor={`note-${studentId}`} className="mb-1.5 block text-sm font-medium text-ink-800">
                            Observation interne
                        </label>
                        <Textarea id={`note-${studentId}`} rows={2} disabled={!open} value={entry.internal_note} onChange={(e) => change(studentId, { internal_note: e.target.value })} />
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor={`diff-${studentId}`} className="mb-1.5 block text-sm font-medium text-ink-800">
                                Difficulté constatée
                            </label>
                            <Select id={`diff-${studentId}`} disabled={!open} value={entry.difficulty} onChange={(e) => change(studentId, { difficulty: e.target.value })}>
                                <option value="">Aucune</option>
                                {Object.entries(difficulties).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label htmlFor={`rec-${studentId}`} className="mb-1.5 block text-sm font-medium text-ink-800">
                                Recommandation
                            </label>
                            <Textarea id={`rec-${studentId}`} rows={1} disabled={!open} value={entry.recommendation} onChange={(e) => change(studentId, { recommendation: e.target.value })} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const current = students[index];

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title={`Pré-conseil ${council.class ?? ''}`} />
            <p className="mb-2 text-sm text-ink-500">
                <Link href={route('teacher.councils.show', council.id)} className="hover:underline">
                    Conseil {council.class} · {council.term}
                </Link>
            </p>
            <h1 className="font-serif text-2xl font-bold text-ink-900">Pré-conseil</h1>
            <p className="mb-4 mt-1 text-sm text-ink-600">
                {open
                    ? council.deadline
                        ? `Saisie ouverte jusqu’au ${new Date(council.deadline).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}.`
                        : 'Saisie ouverte jusqu’à l’ouverture de la séance.'
                    : 'La saisie est close : vos appréciations sont en lecture seule.'}
            </p>

            {subjects.length === 0 ? (
                <Card className="p-6 text-sm text-ink-600">Vous n’enseignez aucune matière à cette classe d’après l’emploi du temps.</Card>
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        {subjects.length > 1 && (
                            <Select aria-label="Matière" className="sm:w-64" value={subjectId} onChange={(e) => setSubjectId(Number(e.target.value))}>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </option>
                                ))}
                            </Select>
                        )}
                        <span className="rounded-full bg-ink-100 px-3 py-1 text-sm text-ink-800">
                            {filled} / {expected} élèves renseignés
                        </span>
                        {status && (
                            <span role="status" aria-live="polite" className={`text-sm ${status.tone === 'error' ? 'text-red-700' : 'text-ink-600'}`}>
                                {status.text}
                            </span>
                        )}
                    </div>

                    {isDesktop ? (
                        <div className="space-y-3">
                            {students.map((student) => (
                                <Card key={student.id} className="grid grid-cols-[14rem_minmax(0,1fr)] gap-4 p-4">
                                    <div>
                                        <p className="font-semibold text-ink-900">{student.name}</p>
                                        <p className="text-xs text-ink-500">
                                            {student.matricule}
                                            {student.has_left_class && ' · sorti(e)'}
                                        </p>
                                        <p className="mt-2 text-sm text-ink-700">Moyenne : {average(student.id)?.toLocaleString('fr-FR') ?? '—'}</p>
                                    </div>
                                    {fields(student.id, student.name)}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        current && (
                            <Card className="p-4">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <button type="button" aria-label="Élève précédent" disabled={index === 0} onClick={() => { void flush(); setIndex(index - 1); }} className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-200 disabled:opacity-40">
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <div className="min-w-0 text-center">
                                        <p className="truncate font-semibold text-ink-900">{current.name}</p>
                                        <p className="text-xs text-ink-500">
                                            {index + 1} / {students.length} · moyenne {average(current.id)?.toLocaleString('fr-FR') ?? '—'}
                                        </p>
                                    </div>
                                    <button type="button" aria-label="Élève suivant" disabled={index === students.length - 1} onClick={() => { void flush(); setIndex(index + 1); }} className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-200 disabled:opacity-40">
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>
                                {fields(current.id, current.name)}
                            </Card>
                        )
                    )}
                </>
            )}

            {progress && (
                <Card className="mt-6 p-5">
                    <h2 className="mb-3 font-serif text-base font-bold text-ink-900">Avancement des collègues</h2>
                    <ul className="space-y-2 text-sm">
                        {progress.map((item) => (
                            <li key={item.teacher} className="flex flex-wrap items-center justify-between gap-2">
                                <span>
                                    <strong className="text-ink-900">{item.teacher}</strong> <span className="text-ink-500">({item.subjects.join(', ')})</span>
                                </span>
                                <span className={item.total > 0 && item.filled >= item.total ? 'text-emerald-800' : 'text-ink-700'}>
                                    {item.filled} / {item.total}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </PortalLayout>
    );
}
