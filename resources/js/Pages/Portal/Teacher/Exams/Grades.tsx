import Card from '@/Components/Admin/Card';
import { Select, TextInput } from '@/Components/Admin/Field';
import Avatar from '@/Components/Connect/Avatar';
import useMediaQuery from '@/hooks/useMediaQuery';
import PortalLayout from '@/Layouts/PortalLayout';
import { gradeStatusHint, gradeStatusOf } from '@/lib/gradeStatus';
import { haptic } from '@/lib/portal';
import { Exam, Grade, GradeStatus } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { teacherNav } from '../Dashboard';

type StudentRow = { id: number; matricule: string; first_name: string; last_name: string };
type Entry = { score: string; status: GradeStatus; comment: string };

interface Props {
    exam: Exam;
    students: StudentRow[];
    grades: Record<number, Grade>;
    statuses: Record<GradeStatus, string>;
}

/** Teinte de la liste des statuts : neutre si présent, grise si justifiée, rouge si la note vaut 0. */
const statusTone: Record<GradeStatus, string> = {
    present: 'border-ink-200 text-ink-700',
    absent_justifie: 'border-ink-300 bg-ink-100 text-ink-700',
    absent_non_justifie: 'border-red-200 bg-red-50 text-red-700',
};

export default function Grades({ exam, students, grades, statuses }: Props) {
    const isWide = useMediaQuery('(min-width: 768px)');
    const max = Number(exam.max_score);

    const [entries, setEntries] = useState<Record<number, Entry>>(() => {
        const initial: Record<number, Entry> = {};

        students.forEach((s) => {
            const g = grades[s.id];
            initial[s.id] = {
                score: g?.score != null ? String(g.score) : '',
                status: gradeStatusOf(g),
                comment: g?.comment ?? '',
            };
        });

        return initial;
    });
    const [processing, setProcessing] = useState(false);
    const [saved, setSaved] = useState(false);

    const setField = (studentId: number, field: keyof Entry, value: string) => {
        setEntries((prev) => {
            const next = { ...prev[studentId], [field]: value } as Entry;

            // Une absence n'a pas de note : passer à « absent » efface celle qu'on avait tapée.
            if (field === 'status' && value !== 'present') next.score = '';

            return { ...prev, [studentId]: next };
        });
    };

    // Clavier décimal du téléphone : la virgule française est acceptée et convertie en point.
    const setScore = (studentId: number, raw: string) => {
        const value = raw.replace(',', '.');

        if (value === '' || /^\d{0,3}(\.\d{0,2})?$/.test(value)) setField(studentId, 'score', value);
    };

    const invalid = (entry?: Entry) => !!entry && entry.status === 'present' && entry.score !== '' && (Number.isNaN(Number(entry.score)) || Number(entry.score) < 0 || Number(entry.score) > max);
    const hasInvalid = students.some((s) => invalid(entries[s.id]));
    const filled = students.filter((s) => entries[s.id]?.status !== 'present' || entries[s.id]?.score !== '').length;
    const progress = students.length > 0 ? filled / students.length : 0;

    const save = () => {
        setProcessing(true);
        router.post(
            route('teacher.exams.grades.store', exam.id),
            {
                grades: students.map((s) => {
                    const entry = entries[s.id];

                    return {
                        student_id: s.id,
                        score: entry?.status === 'present' ? entry.score || null : null,
                        status: entry?.status ?? 'present',
                        comment: entry?.comment || null,
                    };
                }),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    haptic(20);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2500);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const statusOptions = Object.entries(statuses).map(([value, label]) => (
        <option key={value} value={value}>
            {label}
        </option>
    ));

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title={`Notes — ${exam.title}`} />

            <div className="mb-5">
                <h1 className="font-serif text-xl font-bold text-ink-900 lg:text-2xl">Saisie des notes — {exam.title}</h1>
                <p className="mt-1 text-sm text-ink-500">
                    {[exam.school_class?.name, exam.subject?.name].filter(Boolean).join(' · ')} · Barème /{exam.max_score}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">{gradeStatusHint}</p>
            </div>

            {students.length === 0 ? (
                <p className="rounded-3xl bg-white px-4 py-10 text-center text-sm text-ink-400 ring-1 ring-ink-100">Aucun élève actif dans cette classe.</p>
            ) : !isWide ? (
                <>
                    <ul className="space-y-2.5">
                        {students.map((s) => {
                            const entry = entries[s.id];
                            const bad = invalid(entry);
                            const present = entry?.status === 'present';

                            return (
                                <li key={s.id} className={`rounded-2xl bg-white p-3.5 shadow-soft ring-1 ${bad ? 'ring-red-300' : 'ring-ink-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-ink-900">
                                                {s.first_name} {s.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{s.matricule}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                autoComplete="off"
                                                aria-label={`Note de ${s.first_name} ${s.last_name} sur ${exam.max_score}`}
                                                aria-invalid={bad}
                                                disabled={!present}
                                                placeholder="—"
                                                value={entry?.score ?? ''}
                                                onChange={(e) => setScore(s.id, e.target.value)}
                                                className={`h-12 w-[4.5rem] rounded-xl text-center text-lg font-bold disabled:bg-ink-50 disabled:text-ink-300 ${
                                                    bad ? 'border-red-400 text-red-600 focus:border-red-500 focus:ring-red-500' : 'border-ink-200 text-ink-900 focus:border-gold-500 focus:ring-gold-500'
                                                }`}
                                            />
                                            <span className="text-sm text-ink-400">/{exam.max_score}</span>
                                        </div>
                                    </div>
                                    {/* Téléphone : le statut a toute la largeur de la carte (« Absent(e) non justifié(e) » ne tient pas
                                        dans la moitié) et l'appréciation passe dessous ; côte à côte dès sm. */}
                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <select
                                            aria-label={`Statut de ${s.first_name} ${s.last_name}`}
                                            value={entry?.status ?? 'present'}
                                            onChange={(e) => {
                                                haptic();
                                                setField(s.id, 'status', e.target.value);
                                            }}
                                            className={`h-11 w-full rounded-xl py-0 pl-3 pr-8 text-sm font-semibold focus:border-gold-500 focus:ring-gold-500 sm:w-[52%] sm:shrink-0 ${statusTone[entry?.status ?? 'present']}`}
                                        >
                                            {statusOptions}
                                        </select>
                                        <div className="min-w-0 sm:flex-1">
                                            <TextInput
                                                value={entry?.comment ?? ''}
                                                onChange={(e) => setField(s.id, 'comment', e.target.value)}
                                                placeholder="Appréciation"
                                                aria-label={`Appréciation pour ${s.first_name} ${s.last_name}`}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                    {bad && <p className="mt-2 text-xs font-medium text-red-600">La note doit être comprise entre 0 et {exam.max_score}.</p>}
                                </li>
                            );
                        })}
                    </ul>

                    <div className="sticky bottom-[calc(var(--portal-bar-h)+0.5rem)] z-20 mt-4">
                        <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-2.5 shadow-elevated ring-1 ring-ink-100 backdrop-blur">
                            <div className="min-w-0 flex-1 px-2" aria-live="polite">
                                <p className="text-xs font-semibold text-ink-700">
                                    {filled} / {students.length} saisies
                                </p>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={save}
                                disabled={processing || hasInvalid}
                                className={`inline-flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${saved ? 'bg-emerald-700' : 'bg-ink-900 active:bg-ink-800'}`}
                            >
                                {saved ? (
                                    <>
                                        <Check className="h-4 w-4" /> Enregistré
                                    </>
                                ) : (
                                    'Enregistrer'
                                )}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Élève</th>
                                    <th className="px-5 py-3">Note / {exam.max_score}</th>
                                    <th className="px-5 py-3">Statut</th>
                                    <th className="px-5 py-3">Commentaire</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {students.map((s) => (
                                    <tr key={s.id}>
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-ink-900">
                                                {s.first_name} {s.last_name}
                                            </p>
                                            <p className="text-xs text-ink-500">{s.matricule}</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <TextInput
                                                aria-label={`Note de ${s.first_name} ${s.last_name}`}
                                                type="number"
                                                step="0.25"
                                                min={0}
                                                max={max}
                                                disabled={entries[s.id]?.status !== 'present'}
                                                value={entries[s.id]?.score ?? ''}
                                                onChange={(e) => setField(s.id, 'score', e.target.value)}
                                                className="w-24"
                                            />
                                        </td>
                                        <td className="px-5 py-3">
                                            <Select
                                                aria-label={`Statut de ${s.first_name} ${s.last_name}`}
                                                value={entries[s.id]?.status ?? 'present'}
                                                onChange={(e) => setField(s.id, 'status', e.target.value)}
                                                className="min-w-48 max-w-[15rem]"
                                            >
                                                {statusOptions}
                                            </Select>
                                        </td>
                                        <td className="px-5 py-3">
                                            <TextInput
                                                aria-label={`Commentaire pour ${s.first_name} ${s.last_name}`}
                                                value={entries[s.id]?.comment ?? ''}
                                                onChange={(e) => setField(s.id, 'comment', e.target.value)}
                                                placeholder="Appréciation (optionnel)"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end border-t border-ink-100 p-4">
                        <button
                            onClick={save}
                            disabled={processing}
                            className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                        >
                            Enregistrer les notes
                        </button>
                    </div>
                </Card>
            )}
        </PortalLayout>
    );
}
