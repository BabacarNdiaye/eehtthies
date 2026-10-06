import Card from '@/Components/Admin/Card';
import { Field, Select, Textarea } from '@/Components/Admin/Field';
import AlertBadge from '@/Components/Council/AlertBadge';
import CouncilStatusBadge from '@/Components/Council/CouncilStatusBadge';
import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface StudentRow {
    id: number;
    name: string;
    matricule: string;
    average: number | null;
    rank: number | null;
    alert_level: string | null;
    has_left_class: boolean;
    summary: string | null;
    recommendation_id: number | null;
    revision: number;
}

interface Props {
    council: { id: number; class: string | null; term: string; year: string | null; scheduled_at: string | null; room: string | null; agenda: string | null; status: string; status_label: string; is_end_of_year: boolean; function_label: string };
    students: StudentRow[];
    canWriteSynthesis: boolean;
    preCouncil: { open: boolean; deadline: string | null; subjects: string[] } | null;
    decisionTypes: { id: number; label: string; category: string }[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'conflict' | 'error';

/**
 * Synthèse d'un élève par le professeur principal (PRE-05). Enregistrement automatique une seconde après la dernière
 * frappe et au changement d'élève ; en cas de modification concurrente (409), la version enregistrée est reprise.
 */
function SynthesisForm({ councilId, row, decisionTypes, onSaved }: { councilId: number; row: StudentRow; decisionTypes: Props['decisionTypes']; onSaved: (row: StudentRow) => void }) {
    const [summary, setSummary] = useState(row.summary ?? '');
    const [recommendation, setRecommendation] = useState<number | ''>(row.recommendation_id ?? '');
    const [state, setState] = useState<SaveState>('idle');
    const [message, setMessage] = useState('');
    const revision = useRef(row.revision);
    const dirty = useRef(false);

    const save = async () => {
        if (!dirty.current) return;
        dirty.current = false;
        setState('saving');
        try {
            const { data } = await window.axios.patch(route('teacher.councils.synthesis', [councilId, row.id]), {
                summary: summary || null,
                recommendation_id: recommendation || null,
                revision: revision.current,
            });
            revision.current = data.revision;
            setState('saved');
            onSaved({ ...row, summary: summary || null, recommendation_id: recommendation || null, revision: data.revision });
        } catch (error: unknown) {
            const response = (error as { response?: { status: number; data: { message?: string; current?: { summary: string | null; recommendation_id: number | null; revision: number } } } }).response;
            if (response?.status === 409 && response.data.current) {
                setSummary(response.data.current.summary ?? '');
                setRecommendation(response.data.current.recommendation_id ?? '');
                revision.current = response.data.current.revision;
                setMessage(response.data.message ?? '');
                setState('conflict');
            } else {
                dirty.current = true;
                setMessage(response?.data?.message ?? 'Enregistrement impossible : vérifiez la connexion, la saisie est gardée.');
                setState('error');
            }
        }
    };

    useEffect(() => {
        if (!dirty.current) return;
        const timeout = window.setTimeout(save, 1000);

        return () => window.clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summary, recommendation]);

    // Au changement d'élève (démontage), ce qui n'est pas encore parti l'est maintenant.
    useEffect(
        () => () => {
            void save();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const status: Record<SaveState, string> = { idle: '', saving: 'Enregistrement…', saved: 'Enregistré', conflict: message, error: message };

    return (
        <div className="space-y-4">
            <Field label="Synthèse du professeur principal">
                <Textarea
                    rows={6}
                    value={summary}
                    onChange={(e) => {
                        dirty.current = true;
                        setSummary(e.target.value);
                    }}
                    onBlur={() => void save()}
                />
            </Field>
            <Field label="Décision recommandée">
                <Select
                    value={recommendation}
                    onChange={(e) => {
                        dirty.current = true;
                        setRecommendation(e.target.value ? Number(e.target.value) : '');
                    }}
                >
                    <option value="">Aucune recommandation</option>
                    {[...new Set(decisionTypes.map((type) => type.category))].map((category) => (
                        <optgroup key={category} label={category}>
                            {decisionTypes
                                .filter((type) => type.category === category)
                                .map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.label}
                                    </option>
                                ))}
                        </optgroup>
                    ))}
                </Select>
            </Field>
            <p role="status" aria-live="polite" className={`text-sm ${state === 'error' || state === 'conflict' ? 'text-red-700' : 'text-ink-500'}`}>
                {status[state]}
            </p>
        </div>
    );
}

export default function Show({ council, students: initialStudents, canWriteSynthesis, preCouncil, decisionTypes }: Props) {
    const [students, setStudents] = useState(initialStudents);
    const [index, setIndex] = useState(0);
    const current = students[index];
    const done = students.filter((row) => row.summary).length;

    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title={`Conseil ${council.class ?? ''}`} />

            <p className="mb-2 text-sm text-ink-500">
                <Link href={route('teacher.councils.index')} className="hover:underline">
                    Mes conseils
                </Link>
            </p>
            <h1 className="font-serif text-2xl font-bold text-ink-900">
                {council.class} · {council.term}
            </h1>
            <p className="mb-6 mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                <CouncilStatusBadge status={council.status} label={council.status_label} />
                {council.function_label}
                {council.scheduled_at && ` · ${new Date(council.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}`}
                {council.room && ` · ${council.room}`}
            </p>

            {preCouncil && (
                <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                        <h2 className="font-semibold text-ink-900">Pré-conseil : {preCouncil.subjects.join(', ')}</h2>
                        <p className="text-sm text-ink-600">
                            {preCouncil.open
                                ? `Vos appréciations par élève${preCouncil.deadline ? `, jusqu’au ${new Date(preCouncil.deadline).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.`
                                : 'La saisie est close ; vos appréciations restent consultables.'}
                        </p>
                    </div>
                    <Link href={route('teacher.councils.precouncil', council.id)} className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
                        {preCouncil.open ? 'Saisir mes appréciations' : 'Voir mes appréciations'}
                    </Link>
                </Card>
            )}

            {council.status !== 'draft' && council.status !== 'scheduled' && (
                <Link
                    href={route('council.session.show', council.id)}
                    className="mb-6 inline-flex items-center rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    {council.status === 'in_session' ? 'Suivre la séance' : 'Voir la séance'}
                </Link>
            )}
            {council.status === 'in_session' && (
                <Link
                    href={route('council.meeting.show', council.id)}
                    className="mb-6 ml-2 inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                    Visioconférence
                </Link>
            )}
            {council.status === 'in_session' && (
                <Link
                    href={route('council.vote.show', council.id)}
                    className="mb-6 ml-2 inline-flex items-center rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                >
                    Voter
                </Link>
            )}

            {canWriteSynthesis && current ? (
                <Card className="p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setIndex(Math.max(0, index - 1))}
                            disabled={index === 0}
                            aria-label="Élève précédent"
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-200 text-ink-700 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <div className="min-w-0 flex-1 text-center">
                            <p className="truncate font-semibold text-ink-900">{current.name}</p>
                            <p className="text-xs text-ink-500">
                                {index + 1} / {students.length} · {done} synthèse(s) rédigée(s)
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIndex(Math.min(students.length - 1, index + 1))}
                            disabled={index === students.length - 1}
                            aria-label="Élève suivant"
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-200 text-ink-700 disabled:opacity-40"
                        >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                    <p className="mb-4 flex flex-wrap items-center gap-3 text-sm text-ink-600">
                        Moyenne : <strong>{current.average === null ? '—' : current.average.toLocaleString('fr-FR')}</strong>
                        {current.rank && <span>Rang {current.rank}</span>}
                        <AlertBadge level={current.alert_level} />
                        {current.has_left_class && <span className="text-ink-500">Sorti(e) de la classe</span>}
                    </p>
                    <SynthesisForm
                        key={current.id}
                        councilId={council.id}
                        row={current}
                        decisionTypes={decisionTypes}
                        onSaved={(saved) => setStudents((list) => list.map((row) => (row.id === saved.id ? saved : row)))}
                    />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <ul className="divide-y divide-ink-100">
                        {students.map((row) => (
                            <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                                <div>
                                    <p className="font-medium text-ink-900">{row.name}</p>
                                    <p className="text-xs text-ink-500">{row.matricule}</p>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-ink-700">
                                    {row.average === null ? '—' : row.average.toLocaleString('fr-FR')}
                                    <AlertBadge level={row.alert_level} compact />
                                </div>
                            </li>
                        ))}
                        {students.length === 0 && <li className="px-5 py-8 text-center text-sm text-ink-500">Aucun élève dans ce conseil.</li>}
                    </ul>
                </Card>
            )}

            {council.agenda && (
                <Card className="mt-6 p-5">
                    <h2 className="mb-2 font-serif text-base font-bold text-ink-900">Ordre du jour</h2>
                    <p className="whitespace-pre-line text-sm text-ink-700">{council.agenda}</p>
                </Card>
            )}
        </PortalLayout>
    );
}
