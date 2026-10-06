import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import { Select } from '@/Components/Admin/Field';
import AlertBadge from '@/Components/Council/AlertBadge';
import ClosedCouncilTools, { AppealRow, ClosedStudent } from '@/Components/Council/ClosedCouncilTools';
import CouncilStatusBadge from '@/Components/Council/CouncilStatusBadge';
import { SessionDecisionType } from '@/Components/Council/DecisionPanel';
import { SessionVote } from '@/Components/Council/VotePanel';
import { confirmAction } from '@/lib/confirm';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, CalendarClock, Camera, Copy, FileDown, FileText, History, ListChecks, Mail, MessageCircle, Pencil, Play, Send, Trash2, Undo2, Video } from 'lucide-react';
import { useState } from 'react';

interface StudentRow {
    id: number;
    student_id: number;
    name: string;
    matricule: string;
    average: number | null;
    rank: number | null;
    class_size: number | null;
    alert_level: string | null;
    alert_reasons: string[];
    review_status: string;
    has_left_class: boolean;
    has_summary: boolean;
    recommendation: string | null;
    decisions: ClosedStudent['decisions'];
    general_appreciation: string | null;
}

interface MemberRow {
    id: number;
    name: string;
    function: string;
    function_label: string;
    external_role: string | null;
    attendance: string;
    arrived_at: string | null;
    can_vote: boolean;
    has_account: boolean;
}

interface Props {
    council: {
        id: number;
        label: string;
        class: string | null;
        formation: string | null;
        term: string;
        year: string | null;
        is_end_of_year: boolean;
        scheduled_at: string | null;
        room: string | null;
        agenda: string | null;
        status: string;
        status_label: string;
        president: string | null;
        main_teacher: string | null;
        secretary: string | null;
        snapshot_taken_at: string | null;
        started_at: string | null;
        sitting: { id: number; label: string } | null;
    };
    students: StudentRow[];
    members: MemberRow[];
    summary: { count: number; evaluated: number; average: number | null; min: number | null; max: number | null; pass_rate: number | null; alerts: Record<string, number>; unjustified_hours: number; left: number };
    attendances: Record<string, string>;
    preCouncil: { teacher: string; subjects: string[]; filled: number; total: number }[];
    gradesChanged: number;
    followUpsCount: number;
    decisionTypes: SessionDecisionType[];
    categories: Record<string, string>;
    appeals: AppealRow[];
    appealDeadline: string | null;
    terms: string[];
    votes: (SessionVote & { detail: { name: string | null; choice: string }[] | null })[];
    familyNotices: { enabled: boolean; sent: number; total: number; can_send: boolean; whatsapp: { student: string | null; phone: string | null; url: string; notified: boolean }[] } | null;
    can: Record<
        'update' | 'delete' | 'schedule' | 'conduct' | 'writeSynthesis' | 'viewInternal' | 'export' | 'viewAudit' | 'validateDirection' | 'create' | 'appeal' | 'internship',
        boolean
    >;
}

const fr = (value: number | null, digits = 2) => (value === null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: digits }));
const keep = { preserveScroll: true } as const;

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs text-ink-500">{label}</dt>
            <dd className="font-serif text-2xl font-bold text-ink-900">{value}</dd>
        </div>
    );
}

export default function Show({ council, students, members, summary, attendances, preCouncil, gradesChanged, followUpsCount, decisionTypes, categories, appeals, appealDeadline, terms, votes, familyNotices, can }: Props) {
    const [tab, setTab] = useState<'students' | 'members' | 'precouncil'>('students');
    const [duplicateTerm, setDuplicateTerm] = useState(terms.find((term) => term !== council.term) ?? terms[0]);
    const status = council.status;
    const closed = status === 'closed';
    const canRollCall = can.conduct && (status === 'scheduled' || status === 'in_session');

    const act = async (routeName: string, question: string | null, method: 'post' | 'delete' = 'post') => {
        if (question && !(await confirmAction(question))) return;
        if (method === 'delete') router.delete(route(routeName, council.id));
        else router.post(route(routeName, council.id), {}, keep);
    };

    const button = 'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold';
    const secondary = `${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`;
    const primary = `${button} bg-ink-900 text-white hover:bg-ink-800`;

    return (
        <AdminLayout>
            <Head title={`Conseil ${council.class ?? ''}`} />

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-ink-500">
                        <Link href={route('admin.councils.index')} className="hover:underline">
                            Conseils de classe
                        </Link>
                    </p>
                    <h1 className="font-serif text-2xl font-bold text-ink-900">
                        {council.class} · {council.term}
                    </h1>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                        <CouncilStatusBadge status={status} label={council.status_label} />
                        {council.sitting && (
                            <Link href={route('admin.council-sittings.show', council.sitting.id)} className="font-semibold text-ink-800 underline">
                                {council.sitting.label}
                            </Link>
                        )}
                        <span>{council.year}</span>
                        {council.is_end_of_year && <span>· Fin d’année</span>}
                        <span>· {council.scheduled_at ? new Date(council.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) : 'date à fixer'}</span>
                        {council.room && <span>· {council.room}</span>}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {can.update && (
                        <Link href={route('admin.councils.edit', council.id)} className={secondary}>
                            <Pencil className="h-4 w-4" aria-hidden="true" /> Modifier
                        </Link>
                    )}
                    {can.delete && (
                        <button type="button" className={`${secondary} text-red-700`} onClick={() => act('admin.councils.destroy', 'Supprimer ce conseil en brouillon ? Cette action est irréversible.', 'delete')}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" /> Supprimer
                        </button>
                    )}
                    {can.schedule && status === 'draft' && (
                        <button type="button" className={primary} onClick={() => act('admin.councils.schedule', null)}>
                            <CalendarClock className="h-4 w-4" aria-hidden="true" /> Programmer
                        </button>
                    )}
                    {can.schedule && status === 'scheduled' && (
                        <>
                            <button type="button" className={secondary} onClick={() => act('admin.councils.snapshot', null)}>
                                <Camera className="h-4 w-4" aria-hidden="true" /> Rafraîchir la photo
                            </button>
                            <button type="button" className={secondary} onClick={() => act('admin.councils.unschedule', 'Annuler la programmation ? Le conseil repasse en brouillon.')}>
                                <Undo2 className="h-4 w-4" aria-hidden="true" /> Annuler la programmation
                            </button>
                        </>
                    )}
                    {can.conduct && status === 'scheduled' && (
                        <button
                            type="button"
                            className={primary}
                            onClick={() => act('admin.councils.start', 'Ouvrir la séance ? La photo des données sera reprise une dernière fois puis figée.')}
                        >
                            <Play className="h-4 w-4" aria-hidden="true" /> Démarrer le conseil
                        </button>
                    )}
                    {['drafting_minutes', 'pending_validation', 'closed'].includes(status) && (
                        <Link href={route('admin.councils.minutes', council.id)} className={status === 'closed' ? secondary : primary}>
                            <FileText className="h-4 w-4" aria-hidden="true" /> Procès-verbal
                        </Link>
                    )}
                    {can.viewAudit && (
                        <Link href={route('admin.councils.audit', council.id)} className={secondary}>
                            <History className="h-4 w-4" aria-hidden="true" /> Journal
                        </Link>
                    )}
                    {status === 'in_session' && (
                        <a href={route('council.meeting.show', council.id)} target="eeht-visio" className={secondary}>
                            <Video className="h-4 w-4" aria-hidden="true" /> Visioconférence
                        </a>
                    )}
                    {status !== 'draft' && status !== 'scheduled' && (
                        <Link href={route('council.session.show', council.id)} className={status === 'in_session' ? primary : secondary}>
                            <Play className="h-4 w-4" aria-hidden="true" /> {status === 'in_session' ? 'Reprendre la séance' : 'Voir la séance'}
                        </Link>
                    )}
                </div>
            </div>

            {gradesChanged > 0 && (
                <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <p>
                        {gradesChanged === 1 ? 'Une note a été modifiée' : `${gradesChanged} notes ont été modifiées`} depuis la photo des données.
                        {status === 'scheduled' && can.schedule ? ' Rafraîchissez la photo pour en tenir compte.' : ' La séance s’appuie sur la photo, qui reste inchangée.'}
                    </p>
                </div>
            )}

            <Card className="mb-6 flex flex-wrap items-center gap-2 p-4">
                <h2 className="mr-2 text-sm font-semibold text-ink-700">Documents et suivi</h2>
                <a href={route('admin.councils.documents.convocation', council.id)} className={secondary}>
                    <FileDown className="h-4 w-4" aria-hidden="true" /> Convocation
                </a>
                {can.viewInternal && (
                    <a href={route('admin.councils.documents.preparatory', council.id)} className={secondary}>
                        <FileDown className="h-4 w-4" aria-hidden="true" /> Fiche préparatoire
                    </a>
                )}
                {can.schedule && (status === 'draft' || status === 'scheduled') && (
                    <button type="button" className={secondary} onClick={() => act('admin.councils.convocations', 'Envoyer la convocation aux membres (notification et e-mail) ?')}>
                        <Mail className="h-4 w-4" aria-hidden="true" /> Envoyer les convocations
                    </button>
                )}
                {can.internship && (
                    <Link href={route('admin.councils.internship', council.id)} className={secondary}>
                        <ListChecks className="h-4 w-4" aria-hidden="true" /> Évaluation de stage
                    </Link>
                )}
                {closed && followUpsCount > 0 && (
                    <Link href={route('admin.follow-ups.index', { council_id: council.id })} className={secondary}>
                        <ListChecks className="h-4 w-4" aria-hidden="true" /> Actions de suivi ({followUpsCount})
                    </Link>
                )}
                {can.create && terms.length > 1 && (
                    <form
                        className="flex items-center gap-2 sm:ml-auto"
                        onSubmit={(e) => {
                            e.preventDefault();
                            router.post(route('admin.councils.duplicate', council.id), { term: duplicateTerm });
                        }}
                    >
                        <Select aria-label="Période du conseil dupliqué" className="w-40" value={duplicateTerm} onChange={(e) => setDuplicateTerm(e.target.value)}>
                            {terms.map((term) => (
                                <option key={term} value={term}>
                                    {term}
                                </option>
                            ))}
                        </Select>
                        <button type="submit" className={secondary}>
                            <Copy className="h-4 w-4" aria-hidden="true" /> Dupliquer
                        </button>
                    </form>
                )}
            </Card>

            <Card className="mb-6 p-5">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <Stat label="Effectif" value={String(summary.count)} />
                    <Stat label="Moyenne de classe" value={fr(summary.average)} />
                    <Stat label="Plus faible / plus forte" value={`${fr(summary.min)} / ${fr(summary.max)}`} />
                    <Stat label="Taux ≥ 10" value={summary.pass_rate === null ? '—' : `${fr(summary.pass_rate, 1)} %`} />
                    <Stat label="Attention / vigilance" value={`${summary.alerts.red ?? 0} / ${summary.alerts.orange ?? 0}`} />
                    <Stat label="Absences non justifiées" value={`${fr(summary.unjustified_hours, 1)} h`} />
                </dl>
                <p className="mt-3 text-xs text-ink-500">
                    {council.snapshot_taken_at
                        ? `Photo des données du ${new Date(council.snapshot_taken_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}${council.started_at ? ' — figée depuis l’ouverture de la séance' : ''}.`
                        : 'La photo des données sera prise à la programmation du conseil.'}
                    {summary.left > 0 && ` ${summary.left} élève(s) sorti(s) de la classe, hors statistiques.`}
                </p>
            </Card>

            <div role="tablist" aria-label="Rubriques du conseil" className="mb-4 flex gap-1 border-b border-ink-100">
                {(
                    [
                        ['students', `Élèves (${students.length})`],
                        ['members', `Membres (${members.length})`],
                        ...(preCouncil.length > 0 ? ([['precouncil', 'Pré-conseil']] as const) : []),
                    ] as const
                ).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        id={`tab-${key}`}
                        aria-selected={tab === key}
                        aria-controls={`panel-${key}`}
                        onClick={() => setTab(key)}
                        className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${tab === key ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'students' && (
                <Card id="panel-students" role="tabpanel" aria-labelledby="tab-students" className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Élève</th>
                                    <th className="px-5 py-3">Moyenne</th>
                                    <th className="px-5 py-3">Rang</th>
                                    <th className="px-5 py-3">Pastille</th>
                                    <th className="px-5 py-3">{closed ? 'Décisions' : 'Synthèse du professeur principal'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {students.map((row) => (
                                    <tr key={row.id} className={row.has_left_class ? 'text-ink-500' : ''}>
                                        <td className="px-5 py-3 font-medium text-ink-900">
                                            {row.name}
                                            <p className="text-xs font-normal text-ink-500">
                                                {row.matricule}
                                                {row.has_left_class && ' · sorti(e) de la classe'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3 text-ink-700">{fr(row.average)}</td>
                                        <td className="px-5 py-3 text-ink-700">{row.rank ? `${row.rank}${row.class_size ? ` / ${row.class_size}` : ''}` : '—'}</td>
                                        <td className="px-5 py-3">
                                            <AlertBadge level={row.alert_level} reasons={row.alert_reasons} />
                                            {row.alert_reasons.length > 0 && <p className="mt-1 max-w-xs text-xs text-ink-500">{row.alert_reasons.join(' ; ')}</p>}
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">
                                            {closed ? (
                                                <>
                                                    {row.decisions
                                                        .filter((decision) => decision.status !== 'rectified')
                                                        .map((decision) => `${decision.label}${decision.status === 'provisional' ? ' (provisoire)' : ''}`)
                                                        .join(', ') || 'Aucune décision'}
                                                    {!row.has_left_class && (
                                                        <p>
                                                            <a href={route('admin.councils.documents.record', [council.id, row.id])} className="text-xs font-semibold text-ink-800 underline">
                                                                Relevé de décisions<span className="sr-only"> de {row.name}</span>
                                                            </a>
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {row.has_summary ? 'Rédigée' : 'À rédiger'}
                                                    {row.recommendation && <p className="text-xs text-ink-500">Recommande : {row.recommendation}</p>}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-500">
                                            Aucun élève actif dans cette classe.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {tab === 'members' && (
                <Card id="panel-members" role="tabpanel" aria-labelledby="tab-members" className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Membre</th>
                                    <th className="px-5 py-3">Fonction</th>
                                    <th className="px-5 py-3">Vote</th>
                                    <th className="px-5 py-3">Présence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {members.map((member) => (
                                    <tr key={member.id}>
                                        <td className="px-5 py-3 font-medium text-ink-900">
                                            {member.name}
                                            {member.external_role && <p className="text-xs font-normal text-ink-500">{member.external_role}</p>}
                                        </td>
                                        <td className="px-5 py-3 text-ink-600">{member.function_label}</td>
                                        <td className="px-5 py-3 text-ink-600">{member.can_vote ? 'Oui' : 'Non'}</td>
                                        <td className="px-5 py-3">
                                            {canRollCall ? (
                                                <Select
                                                    aria-label={`Présence de ${member.name}`}
                                                    className="w-40"
                                                    value={member.attendance}
                                                    onChange={(e) => router.patch(route('admin.councils.attendance', [council.id, member.id]), { attendance: e.target.value }, keep)}
                                                >
                                                    {Object.entries(attendances).map(([key, label]) => (
                                                        <option key={key} value={key}>
                                                            {label}
                                                        </option>
                                                    ))}
                                                </Select>
                                            ) : (
                                                <span className="text-ink-600">
                                                    {attendances[member.attendance]}
                                                    {member.arrived_at && ` (${new Date(member.arrived_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {tab === 'precouncil' && (
                <Card id="panel-precouncil" role="tabpanel" aria-labelledby="tab-precouncil" className="overflow-hidden">
                    <ul className="divide-y divide-ink-100">
                        {preCouncil.map((row) => {
                            const percent = row.total > 0 ? Math.round((row.filled / row.total) * 100) : 0;

                            return (
                                <li key={row.teacher} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                                    <div className="min-w-0 flex-1 basis-48">
                                        <p className="font-medium text-ink-900">{row.teacher}</p>
                                        <p className="text-xs text-ink-500">{row.subjects.join(', ')}</p>
                                    </div>
                                    <div className="h-2 w-40 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-label={`Avancement de ${row.teacher}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                                        <div className={`h-full ${percent === 100 ? 'bg-emerald-600' : 'bg-gold-500'}`} style={{ width: `${percent}%` }} />
                                    </div>
                                    <span className="w-28 text-right text-ink-700">
                                        {row.filled} / {row.total}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            )}

            {votes.length > 0 && (
                <Card className="mt-6 overflow-hidden">
                    <h2 className="border-b border-ink-100 px-5 py-3 font-serif text-base font-bold text-ink-900">Votes ({votes.length})</h2>
                    <ul className="divide-y divide-ink-100">
                        {votes.map((vote) => (
                            <li key={vote.id} className="px-5 py-3 text-sm">
                                <p className="text-ink-900">
                                    <strong>{vote.decision}</strong> pour {vote.student} ·{' '}
                                    <span className={vote.result === 'adopted' ? 'font-semibold text-emerald-800' : 'font-semibold text-red-700'}>{vote.result_label}</span>
                                    {vote.tie_broken && ' (voix prépondérante du président)'}
                                </p>
                                <p className="text-ink-600">
                                    {vote.votes_for} pour · {vote.votes_against} contre · {vote.abstentions} abstention(s) — {vote.mode_label.toLowerCase()}, {vote.secrecy === 'secret' ? 'secret' : 'nominatif'},{' '}
                                    {vote.voters_present} votant(s) présent(s)
                                </p>
                                {vote.detail && vote.detail.length > 0 && (
                                    <details className="mt-1">
                                        <summary className="cursor-pointer text-xs font-semibold text-ink-700">Détail nominatif (Direction)</summary>
                                        <ul className="mt-1 text-xs text-ink-600">
                                            {vote.detail.map((ballot, index) => (
                                                <li key={index}>
                                                    {ballot.name} : {ballot.choice}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {familyNotices && (
                <Card className="mt-6 space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="font-serif text-base font-bold text-ink-900">Prévenir les familles</h2>
                            <p className="text-sm text-ink-600">
                                {familyNotices.sent} famille(s) prévenue(s) sur {familyNotices.total}. Envoi automatique à la clôture :{' '}
                                {familyNotices.enabled ? 'activé' : 'désactivé (Réglages des conseils › Messages aux familles)'}. Le message annonce que les résultats sont
                                disponibles dans l’espace de la famille, sans les donner.
                            </p>
                        </div>
                        {familyNotices.can_send && familyNotices.sent < familyNotices.total && (
                            <button
                                type="button"
                                className={primary}
                                onClick={() => act('admin.councils.family-notices.store', 'Prévenir maintenant les familles qui ne l’ont pas encore été (e-mail, notification, EEHT Connect) ?')}
                            >
                                <Send className="h-4 w-4" aria-hidden="true" /> Prévenir les familles
                            </button>
                        )}
                    </div>
                    {familyNotices.whatsapp.length > 0 && (
                        <details>
                            <summary className="cursor-pointer text-sm font-semibold text-ink-800">Messages WhatsApp prêts à envoyer ({familyNotices.whatsapp.length})</summary>
                            <ul className="mt-2 divide-y divide-ink-100">
                                {familyNotices.whatsapp.map((row) => (
                                    <li key={row.url} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                                        <span className="min-w-0 flex-1 basis-48 text-ink-900">
                                            {row.student} <span className="text-ink-500">· {row.phone}</span>
                                            {row.notified && <span className="ml-2 text-xs text-emerald-800">déjà prévenue par l’application</span>}
                                        </span>
                                        <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 hover:bg-ink-50">
                                            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp<span className="sr-only"> : prévenir la famille de {row.student}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </Card>
            )}

            {closed && (can.validateDirection || can.appeal || appeals.length > 0) && (
                <ClosedCouncilTools
                    councilId={council.id}
                    students={students.filter((row) => !row.has_left_class)}
                    decisionTypes={decisionTypes}
                    categories={categories}
                    appeals={appeals}
                    appealDeadline={appealDeadline}
                    canRectify={can.validateDirection}
                    canAppeal={can.appeal}
                />
            )}

            {council.agenda && (
                <Card className="mt-6 p-5">
                    <h2 className="mb-2 font-serif text-base font-bold text-ink-900">Ordre du jour</h2>
                    <p className="whitespace-pre-line text-sm text-ink-700">{council.agenda}</p>
                </Card>
            )}
        </AdminLayout>
    );
}
