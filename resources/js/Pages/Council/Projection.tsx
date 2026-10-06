import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface ProjectedStudent {
    name: string;
    average: number | null;
    rank: number | null;
    class_size: number | null;
    progression: number | null;
    groups: { label: string; average: number | null; qualitative?: boolean }[];
    subjects: { name: string; moy20: number | null }[];
    attendance: { unjustified_hours: number; justified_hours: number; late_count: number };
    general_appreciation: string | null;
    appreciations?: { subject: string | null; appreciation: string }[];
    decisions: string[];
}

interface State {
    version: number;
    changed: boolean;
    status?: string;
    student?: ProjectedStudent | null;
    summary?: { count: number; average: number | null; pass_rate: number | null; min: number | null; max: number | null };
}

const fr = (value: number | null | undefined, digits = 2) => (value === null || value === undefined ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: digits }));

/**
 * Vue projetée (E06) : l'écran de la salle suit l'élève affiché par le président en interrogeant le serveur toutes les
 * 3 secondes. Elle ne reçoit QUE des données publiables (CouncilPresenter::projection) ; texte de 20 px au moins.
 */
export default function Projection({ council, state: initial }: { council: { id: number; class: string | null; term: string }; state: State }) {
    const [state, setState] = useState<State>(initial);
    const [connected, setConnected] = useState(true);
    const version = useRef(initial.version);

    useEffect(() => {
        const poll = async () => {
            try {
                const { data } = await window.axios.get<State>(route('council.projection.state', council.id), { params: { since: version.current } });
                setConnected(true);
                if (data.changed) {
                    version.current = data.version;
                    setState(data);
                }
            } catch {
                setConnected(false);
            }
        };
        const timer = window.setInterval(poll, 3000);
        return () => window.clearInterval(timer);
    }, [council.id]);

    const student = state.student ?? null;

    return (
        <main className="min-h-dvh bg-ink-950 p-8 text-xl text-white">
            <Head title={`Projection — ${council.class ?? ''}`} />
            <div className="mb-8 flex items-center justify-between gap-4 text-lg text-ink-200">
                <p>
                    Conseil de classe · {council.class} · {council.term}
                </p>
                {!connected && <p className="rounded-full bg-red-700 px-4 py-1 text-white">Connexion perdue — nouvel essai…</p>}
            </div>

            {student ? (
                <div className="grid gap-8 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <h1 className="font-serif text-5xl font-bold">{student.name}</h1>
                        <dl className="mt-6 grid grid-cols-3 gap-6">
                            <div>
                                <dt className="text-lg text-ink-300">Moyenne</dt>
                                <dd className="font-serif text-6xl font-bold">{fr(student.average)}</dd>
                            </div>
                            <div>
                                <dt className="text-lg text-ink-300">Rang</dt>
                                <dd className="font-serif text-6xl font-bold">{student.rank ? `${student.rank}/${student.class_size}` : '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-lg text-ink-300">Progression</dt>
                                <dd className="font-serif text-6xl font-bold">{student.progression === null ? '—' : `${student.progression > 0 ? '+' : ''}${fr(student.progression)}`}</dd>
                            </div>
                        </dl>
                        {student.groups.length > 0 && (
                            <ul className="mt-6 flex flex-wrap gap-3">
                                {student.groups.map((group) => (
                                    <li key={group.label} className="rounded-xl bg-white/10 px-4 py-2">
                                        {group.label} : <strong>{group.qualitative ? 'appréciation' : fr(group.average)}</strong>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <table className="mt-6 w-full text-left">
                            <thead className="text-base uppercase tracking-wide text-ink-300">
                                <tr>
                                    <th className="py-2">Matière</th>
                                    <th className="py-2">Moyenne</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {student.subjects.map((subject) => (
                                    <tr key={subject.name}>
                                        <td className="py-2">{subject.name}</td>
                                        <td className={`py-2 font-semibold ${subject.moy20 !== null && subject.moy20 < 10 ? 'text-red-300' : ''}`}>{fr(subject.moy20)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(student.appreciations?.length ?? 0) > 0 && (
                            <div className="mt-8">
                                <h2 className="mb-3 text-lg text-ink-300">Appréciations des enseignants</h2>
                                <ul className="space-y-3">
                                    {student.appreciations!.map((item, index) => (
                                        <li key={index}>
                                            <span className="font-semibold">{item.subject} : </span>
                                            {item.appreciation}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="space-y-6">
                        <div className="rounded-2xl bg-white/10 p-5">
                            <h2 className="mb-3 text-lg text-ink-300">Assiduité</h2>
                            <p>{fr(student.attendance.unjustified_hours, 1)} h d’absence non justifiée</p>
                            <p>{fr(student.attendance.justified_hours, 1)} h d’absence justifiée</p>
                            <p>{student.attendance.late_count} retard(s)</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-5">
                            <h2 className="mb-3 text-lg text-ink-300">Décision du conseil</h2>
                            {student.decisions.length > 0 ? (
                                <ul className="space-y-1 font-semibold">
                                    {student.decisions.map((decision) => (
                                        <li key={decision}>{decision}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-ink-300">En délibération</p>
                            )}
                            {student.general_appreciation && <p className="mt-4 whitespace-pre-line">{student.general_appreciation}</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                    <h1 className="font-serif text-5xl font-bold">{council.class}</h1>
                    {state.summary && (
                        <p className="mt-6 text-2xl text-ink-200">
                            {state.summary.count} élèves · moyenne de classe {fr(state.summary.average)} · taux ≥ 10 : {state.summary.pass_rate === null ? '—' : `${fr(state.summary.pass_rate, 1)} %`}
                        </p>
                    )}
                    <p className="mt-10 text-xl text-ink-300">{state.status === 'in_session' ? 'En attente de l’élève suivant…' : 'La séance n’est pas en cours.'}</p>
                </div>
            )}
        </main>
    );
}
