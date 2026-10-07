import AlertBadge from '@/Components/Council/AlertBadge';
import LevelBadge from '@/Components/Discipline/LevelBadge';
import { BookOpen, BriefcaseBusiness, CalendarX2, ChevronRight, ClipboardList, MessageSquareText, Scale, TrendingDown, TrendingUp, UserCheck } from 'lucide-react';
import { PropsWithChildren } from 'react';

export interface SessionStudent {
    id: number;
    student_id: number;
    name: string;
    matricule: string;
    average: number | null;
    rank: number | null;
    class_size: number | null;
    previous_average: number | null;
    progression: number | null;
    failed_subjects_count: number | null;
    alert_level: string | null;
    alert_reasons: string[];
    review_status: string;
    has_left_class: boolean;
    general_appreciation: string | null;
    main_teacher_summary: string | null;
    recommendation_id: number | null;
    subjects: { id: number; name: string; group: string | null; coefficient: number; moy20: number | null; rank: number | null; class_size: number | null; status: string; appreciation: string | null }[];
    groups: { code: string; label: string; average: number | null; qualitative: boolean }[];
    attendance: { unjustified_hours: number; justified_hours: number; late_count: number; unjustified_count: number; justified_count: number; class_exclusions: number } | null;
    discipline: { count: number; max_level: string | null; records: { date: string; level: string; label: string; reason: string; days: number | null }[] };
    internship: { title: string; company: string | null; status: string; start_date: string | null; end_date: string | null; score: number | null; appreciation: string | null } | null;
    decisions: { decision_type_id: number; reason: string | null }[];
    revision: number;
    internship_evaluation?: { criterion: string | null; rating: string; comment: string | null }[];
    observations?: { subject_id: number; subject: string | null; teacher: string | null; appreciation: string | null; internal_note: string | null; difficulty_label: string | null; recommendation: string | null }[];
    previous_follow_ups?: { problem: string; owner: string | null; due_date: string | null; status: string; status_label: string }[];
}

export const fr = (value: number | null | undefined, digits = 2) => (value === null || value === undefined ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: digits }));

function Block({ title, children, open = true, icon: Icon }: PropsWithChildren<{ title: string; open?: boolean; icon?: typeof BookOpen }>) {
    return (
        <details open={open} className="group overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 font-semibold text-ink-900 outline-none transition hover:bg-ink-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500">
                {Icon && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-500" aria-hidden="true">
                        <Icon className="h-4 w-4" />
                    </span>
                )}
                <span className="flex-1">{title}</span>
                <ChevronRight className="h-4 w-4 text-ink-400 transition group-open:rotate-90" aria-hidden="true" />
            </summary>
            <div className="border-t border-ink-100 px-5 py-4 text-sm text-ink-700">{children}</div>
        </details>
    );
}

const initialsOf = (name: string) =>
    name
        .split(/[\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

/** Barre de niveau d'une matière sur 20 : rouge sous 10, vert à partir de 14 ; la note reste écrite à côté. */
function Level({ value }: { value: number | null }) {
    if (value === null) return null;
    const color = value < 10 ? 'bg-red-500' : value >= 14 ? 'bg-emerald-500' : 'bg-gold-500';

    return (
        <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
            <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, (value / 20) * 100))}%` }} />
        </span>
    );
}

/**
 * Fiche d'un élève en séance (SEA-06) : résultats par groupe de matières, assiduité, discipline, stage, synthèse du
 * professeur principal. `presentation` masque ce qui est interne quand l'écran est partagé (SEA-08).
 */
export default function StudentSheet({ student, presentation }: { student: SessionStudent; presentation: boolean }) {
    const internal = !presentation;
    const progression = student.progression;

    return (
        <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
                <span className={`absolute inset-x-0 top-0 h-1 ${student.alert_level === 'red' ? 'bg-red-500' : student.alert_level === 'orange' ? 'bg-amber-400' : student.alert_level === 'green' ? 'bg-emerald-500' : 'bg-ink-200'}`} aria-hidden="true" />
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-900 font-serif text-lg font-bold text-gold-300 ring-1 ring-gold-500/30" aria-hidden="true">
                            {initialsOf(student.name)}
                        </span>
                        <div className="min-w-0">
                            <h2 className="font-serif text-2xl font-bold leading-tight text-ink-900">{student.name}</h2>
                            <p className="text-sm text-ink-500">
                                {student.matricule}
                                {student.has_left_class && ' · sorti(e) de la classe'}
                            </p>
                        </div>
                    </div>
                    <AlertBadge level={student.alert_level} reasons={internal ? student.alert_reasons : []} />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-ink-900 p-4 text-white">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-gold-300">Moyenne</dt>
                        <dd className="mt-1 font-serif text-4xl font-bold leading-none">
                            {fr(student.average)}
                            <span className="ml-1 text-sm font-normal text-ink-300">/20</span>
                        </dd>
                    </div>
                    <div className="rounded-xl bg-ink-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Rang</dt>
                        <dd className="mt-1 font-serif text-3xl font-bold leading-none text-ink-900">
                            {student.rank ? student.rank : '—'}
                            {student.rank && <span className="ml-1 text-sm font-normal text-ink-500">/ {student.class_size ?? '?'}</span>}
                        </dd>
                    </div>
                    <div className="rounded-xl bg-ink-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Précédente</dt>
                        <dd className="mt-1 font-serif text-3xl font-bold leading-none text-ink-900">{fr(student.previous_average)}</dd>
                    </div>
                    <div className={`rounded-xl p-4 ${progression === null ? 'bg-ink-50' : progression < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Progression</dt>
                        <dd className={`mt-1 flex items-center gap-1.5 font-serif text-3xl font-bold leading-none ${progression === null ? 'text-ink-900' : progression < 0 ? 'text-red-700' : 'text-emerald-800'}`}>
                            {progression !== null && (progression < 0 ? <TrendingDown className="h-6 w-6" aria-hidden="true" /> : <TrendingUp className="h-6 w-6" aria-hidden="true" />)}
                            {progression === null ? '—' : `${progression > 0 ? '+' : ''}${fr(progression)}`}
                        </dd>
                    </div>
                </dl>
                {internal && student.alert_reasons.length > 0 && (
                    <ul className="mt-4 space-y-1.5 rounded-xl bg-amber-50/70 p-3 text-sm text-ink-800 ring-1 ring-inset ring-amber-200">
                        {student.alert_reasons.map((reason) => (
                            <li key={reason} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                                {reason}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {(student.observations?.length ?? 0) > 0 && (
                <Block title="Appréciations des enseignants" icon={MessageSquareText}>
                    <ul className="space-y-3">
                        {student.observations!.map((observation) => (
                            <li key={observation.subject_id}>
                                <p className="font-semibold text-ink-900">
                                    {observation.subject}
                                    {observation.teacher && <span className="font-normal text-ink-500"> · {observation.teacher}</span>}
                                    {internal && observation.difficulty_label && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">{observation.difficulty_label}</span>}
                                </p>
                                {observation.appreciation && <p>{observation.appreciation}</p>}
                                {internal && observation.internal_note && <p className="text-ink-600">Note interne : {observation.internal_note}</p>}
                                {internal && observation.recommendation && <p className="text-ink-600">Recommande : {observation.recommendation}</p>}
                            </li>
                        ))}
                    </ul>
                </Block>
            )}

            <Block title="Résultats" icon={BookOpen}>
                {student.groups.length > 0 && (
                    <ul className="mb-3 flex flex-wrap gap-2">
                        {student.groups.map((group) => (
                            <li key={group.code} className="rounded-xl bg-ink-50 px-3.5 py-2 ring-1 ring-inset ring-ink-100">
                                <span className="text-ink-600">{group.label} : </span>
                                <strong className="text-ink-900">{group.qualitative ? 'appréciation' : fr(group.average)}</strong>
                            </li>
                        ))}
                    </ul>
                )}
                <table className="w-full text-left">
                    <thead className="text-xs uppercase tracking-wide text-ink-500">
                        <tr>
                            <th className="py-1.5 pr-3">Matière</th>
                            <th className="py-1.5 pr-3">Coef.</th>
                            <th className="py-1.5 pr-3">Moyenne</th>
                            <th className="py-1.5">Rang</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {student.subjects.map((subject) => (
                            <tr key={subject.id} className="align-middle">
                                <td className="py-1.5 pr-3 text-ink-900">{subject.name}</td>
                                <td className="py-1.5 pr-3">{subject.coefficient}</td>
                                <td className={`py-2 pr-3 font-semibold tabular-nums ${subject.moy20 !== null && subject.moy20 < 10 ? 'text-red-700' : 'text-ink-900'}`}>
                                    <span className="flex items-center gap-3">
                                        <span className="w-14">{subject.moy20 === null ? (subject.status === 'absence_justifiee' ? 'Justifié' : 'Non évalué') : fr(subject.moy20)}</span>
                                        <Level value={subject.moy20} />
                                    </span>
                                </td>
                                <td className="py-1.5">{subject.rank ? `${subject.rank} / ${subject.class_size}` : '—'}</td>
                            </tr>
                        ))}
                        {student.subjects.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-3 text-ink-500">
                                    Aucune matière évaluée sur la période.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Block>

            <Block title="Assiduité" icon={CalendarX2}>
                {student.attendance ? (
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                            <dt className="text-xs text-ink-500">Absences non justifiées</dt>
                            <dd className="font-semibold text-ink-900">{fr(student.attendance.unjustified_hours, 1)} h</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-500">Absences justifiées</dt>
                            <dd className="font-semibold text-ink-900">{fr(student.attendance.justified_hours, 1)} h</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-500">Retards</dt>
                            <dd className="font-semibold text-ink-900">{student.attendance.late_count}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-500">Exclusions de cours</dt>
                            <dd className="font-semibold text-ink-900">{student.attendance.class_exclusions}</dd>
                        </div>
                    </dl>
                ) : (
                    <p className="text-ink-500">Aucune donnée d’assiduité.</p>
                )}
            </Block>

            <Block title={`Discipline (${student.discipline.count})`} open={student.discipline.count > 0} icon={Scale}>
                {student.discipline.count === 0 ? (
                    <p className="text-ink-500">Aucune sanction sur la période.</p>
                ) : internal && student.discipline.records.length > 0 ? (
                    <ul className="space-y-2">
                        {student.discipline.records.map((record, index) => (
                            <li key={index} className="flex flex-wrap items-start gap-2">
                                <LevelBadge level={record.level} label={record.label} days={record.days} />
                                <span className="text-ink-500">{new Date(`${record.date}T00:00:00`).toLocaleDateString('fr-FR')}</span>
                                <span className="basis-full text-ink-700">{record.reason}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-ink-600">{student.discipline.count} sanction(s) sur la période (détail réservé à la vie scolaire et à la présidence).</p>
                )}
            </Block>

            <Block title="Stage" open={student.internship !== null} icon={BriefcaseBusiness}>
                {student.internship ? (
                    <p>
                        <strong>{student.internship.title}</strong>
                        {student.internship.company && ` — ${student.internship.company}`}
                        {student.internship.score !== null && ` · note ${fr(student.internship.score)}`}
                        {student.internship.appreciation && <span className="mt-1 block text-ink-600">{student.internship.appreciation}</span>}
                    </p>
                ) : (
                    <p className="text-ink-500">Aucun stage enregistré.</p>
                )}
                {(student.internship_evaluation?.length ?? 0) > 0 && (
                    <ul className="mt-3 divide-y divide-ink-100">
                        {student.internship_evaluation!.map((evaluation, index) => (
                            <li key={index} className="flex flex-wrap justify-between gap-2 py-1.5">
                                <span className="text-ink-800">{evaluation.criterion}</span>
                                <strong className="text-ink-900">{evaluation.rating}</strong>
                                {evaluation.comment && <span className="basis-full text-ink-600">{evaluation.comment}</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </Block>

            {internal && (student.previous_follow_ups?.length ?? 0) > 0 && (
                <Block title={`Actions des conseils précédents (${student.previous_follow_ups!.length})`} icon={ClipboardList}>
                    <ul className="space-y-2">
                        {student.previous_follow_ups!.map((followUp, index) => (
                            <li key={index}>
                                <p className="text-ink-900">{followUp.problem}</p>
                                <p className="text-xs text-ink-500">
                                    {followUp.status_label}
                                    {followUp.owner && ` · ${followUp.owner}`}
                                    {followUp.due_date && ` · échéance ${new Date(`${followUp.due_date}T00:00:00`).toLocaleDateString('fr-FR')}`}
                                </p>
                            </li>
                        ))}
                    </ul>
                </Block>
            )}

            {internal && (
                <Block title="Synthèse du professeur principal" icon={UserCheck}>
                    <p className="whitespace-pre-line">{student.main_teacher_summary || <span className="text-ink-500">Pas de synthèse.</span>}</p>
                </Block>
            )}
        </div>
    );
}
