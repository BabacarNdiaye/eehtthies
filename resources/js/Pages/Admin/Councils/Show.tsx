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
import { AlertTriangle, CalendarClock, CalendarDays, Camera, ChevronRight, Copy, FileDown, FileText, GraduationCap, History, ListChecks, Mail, MapPin, MessageCircle, Pencil, Play, Send, Trash2, TrendingUp, Undo2, UserRound, Users, Video } from 'lucide-react';
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

const initials = (name: string) =>
    name
        .split(/[\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

type Tone = 'neutral' | 'good' | 'warn' | 'bad';

const STAT_TONES: Record<Tone, string> = {
    neutral: 'text-ink-900',
    good: 'text-emerald-700',
    warn: 'text-amber-700',
    bad: 'text-red-700',
};

function Stat({ label, value, icon: Icon, tone = 'neutral', note }: { label: string; value: string; icon: typeof Users; tone?: Tone; note?: string }) {
    return (
        <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-soft">
            <dt className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                {label}
                <Icon className="h-4 w-4 text-ink-300" aria-hidden="true" />
            </dt>
            <dd className={`mt-2 font-serif text-3xl font-bold leading-none ${STAT_TONES[tone]}`}>{value}</dd>
            {note && <p className="mt-1.5 text-xs text-ink-500">{note}</p>}
        </div>
    );
}

/** Moyenne d'un élève : puce colorée (sous 10 = rouge) ; la valeur reste écrite. */
function AverageChip({ value }: { value: number | null }) {
    if (value === null) return <span className="text-ink-400">—</span>;

    const tone = value < 10 ? 'bg-red-50 text-red-800 ring-red-600/20' : value >= 14 ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' : 'bg-ink-50 text-ink-800 ring-ink-500/20';

    return <span className={`inline-flex min-w-[3.25rem] justify-center rounded-lg px-2 py-1 text-sm font-semibold tabular-nums ring-1 ring-inset ${tone}`}>{fr(value)}</span>;
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
    // Sur le bandeau sombre : boutons translucides, action principale en or.
    const heroSecondary = `${button} border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400`;
    const heroPrimary = `${button} bg-gold-500 text-ink-950 shadow-sm transition hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`;

    return (
        <AdminLayout>
            <Head title={`Conseil ${council.class ?? ''}`} />

            <header className="relative mb-6 overflow-hidden rounded-2xl bg-ink-900 p-6 text-white shadow-elevated sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-500/10 blur-2xl" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />

                <nav aria-label="Fil d’Ariane" className="relative flex items-center gap-1.5 text-sm text-ink-300">
                    <Link href={route('admin.councils.index')} className="rounded outline-none hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-gold-400">
                        Conseils de classe
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    <span aria-current="page" className="text-ink-100">
                        {council.class}
                    </span>
                </nav>

                <div className="relative mt-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
                    <div className="min-w-0 flex-1 basis-80">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">{council.class}</h1>
                            <CouncilStatusBadge status={status} label={council.status_label} />
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-ink-200">
                            <GraduationCap className="h-4 w-4 text-gold-300" aria-hidden="true" />
                            {council.formation ?? 'Sans formation'}
                            <span aria-hidden="true">·</span>
                            {council.term}
                            <span aria-hidden="true">·</span>
                            {council.year}
                            {council.is_end_of_year && <span className="rounded-md bg-gold-500/20 px-2 py-0.5 text-xs font-semibold text-gold-200 ring-1 ring-inset ring-gold-400/30">Fin d’année</span>}
                        </p>

                        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-200">
                            <div className="flex items-center gap-2">
                                <dt className="sr-only">Date</dt>
                                <CalendarDays className="h-4 w-4 text-ink-400" aria-hidden="true" />
                                <dd>{council.scheduled_at ? new Date(council.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) : 'Date à fixer'}</dd>
                            </div>
                            {council.room && (
                                <div className="flex items-center gap-2">
                                    <dt className="sr-only">Salle</dt>
                                    <MapPin className="h-4 w-4 text-ink-400" aria-hidden="true" />
                                    <dd>{council.room}</dd>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <dt className="sr-only">Président</dt>
                                <UserRound className="h-4 w-4 text-ink-400" aria-hidden="true" />
                                <dd>{council.president ?? 'Président à désigner'}</dd>
                            </div>
                            {council.main_teacher && (
                                <div className="flex items-center gap-2">
                                    <dt className="text-ink-400">Prof. principal</dt>
                                    <dd>{council.main_teacher}</dd>
                                </div>
                            )}
                            {council.sitting && (
                                <div className="flex items-center gap-2">
                                    <dt className="text-ink-400">Séance</dt>
                                    <dd>
                                        <Link href={route('admin.council-sittings.show', council.sitting.id)} className="font-semibold text-gold-300 underline-offset-2 hover:underline">
                                            {council.sitting.label}
                                        </Link>
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </div>

                <div className="relative mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
                    {status !== 'draft' && status !== 'scheduled' && (
                        <Link href={route('council.session.show', council.id)} className={status === 'in_session' ? heroPrimary : heroSecondary}>
                            <Play className="h-4 w-4" aria-hidden="true" /> {status === 'in_session' ? 'Reprendre la séance' : 'Voir la séance'}
                        </Link>
                    )}
                    {can.conduct && status === 'scheduled' && (
                        <button
                            type="button"
                            className={heroPrimary}
                            onClick={() => act('admin.councils.start', 'Ouvrir la séance ? La photo des données sera reprise une dernière fois puis figée.')}
                        >
                            <Play className="h-4 w-4" aria-hidden="true" /> Démarrer le conseil
                        </button>
                    )}
                    {can.schedule && status === 'draft' && (
                        <button type="button" className={heroPrimary} onClick={() => act('admin.councils.schedule', null)}>
                            <CalendarClock className="h-4 w-4" aria-hidden="true" /> Programmer
                        </button>
                    )}
                    {['drafting_minutes', 'pending_validation', 'closed'].includes(status) && (
                        <Link href={route('admin.councils.minutes', council.id)} className={status === 'closed' ? heroSecondary : heroPrimary}>
                            <FileText className="h-4 w-4" aria-hidden="true" /> Procès-verbal
                        </Link>
                    )}
                    {status === 'in_session' && (
                        <a href={route('council.meeting.show', council.id)} target="eeht-visio" className={heroSecondary}>
                            <Video className="h-4 w-4" aria-hidden="true" /> Visioconférence
                        </a>
                    )}
                    {can.schedule && status === 'scheduled' && (
                        <>
                            <button type="button" className={heroSecondary} onClick={() => act('admin.councils.snapshot', null)}>
                                <Camera className="h-4 w-4" aria-hidden="true" /> Rafraîchir la photo
                            </button>
                            <button type="button" className={heroSecondary} onClick={() => act('admin.councils.unschedule', 'Annuler la programmation ? Le conseil repasse en brouillon.')}>
                                <Undo2 className="h-4 w-4" aria-hidden="true" /> Annuler la programmation
                            </button>
                        </>
                    )}
                    {can.update && (
                        <Link href={route('admin.councils.edit', council.id)} className={heroSecondary}>
                            <Pencil className="h-4 w-4" aria-hidden="true" /> Modifier
                        </Link>
                    )}
                    {can.viewAudit && (
                        <Link href={route('admin.councils.audit', council.id)} className={heroSecondary}>
                            <History className="h-4 w-4" aria-hidden="true" /> Journal
                        </Link>
                    )}
                    {can.delete && (
                        <button
                            type="button"
                            className={`${heroSecondary} !text-red-200 hover:!bg-red-500/20 sm:ml-auto`}
                            onClick={() => act('admin.councils.destroy', 'Supprimer ce conseil en brouillon ? Cette action est irréversible.', 'delete')}
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" /> Supprimer
                        </button>
                    )}
                </div>
            </header>

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
                <h2 className="mr-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Documents et suivi</h2>
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

            <section aria-label="Chiffres du conseil" className="mb-6">
                <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <Stat label="Effectif" value={String(summary.count)} icon={Users} note={summary.left > 0 ? `${summary.left} sorti(s)` : undefined} />
                    <Stat label="Moyenne de classe" value={fr(summary.average)} icon={TrendingUp} tone={summary.average !== null && summary.average < 10 ? 'bad' : 'neutral'} note="sur 20" />
                    <Stat label="Plus faible / forte" value={`${fr(summary.min, 1)} · ${fr(summary.max, 1)}`} icon={TrendingUp} />
                    <Stat label="Taux ≥ 10" value={summary.pass_rate === null ? '—' : `${fr(summary.pass_rate, 1)} %`} icon={GraduationCap} tone={summary.pass_rate !== null && summary.pass_rate < 50 ? 'bad' : summary.pass_rate !== null && summary.pass_rate >= 80 ? 'good' : 'neutral'} />
                    <Stat label="Attention / vigilance" value={`${summary.alerts.red ?? 0} / ${summary.alerts.orange ?? 0}`} icon={AlertTriangle} tone={(summary.alerts.red ?? 0) > 0 ? 'bad' : (summary.alerts.orange ?? 0) > 0 ? 'warn' : 'good'} />
                    <Stat label="Absences injustifiées" value={`${fr(summary.unjustified_hours, 1)} h`} icon={CalendarClock} tone={summary.unjustified_hours > 0 ? 'warn' : 'neutral'} />
                </dl>
                <p className="mt-3 text-xs text-ink-500">
                    {council.snapshot_taken_at
                        ? `Photo des données du ${new Date(council.snapshot_taken_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}${council.started_at ? ' — figée depuis l’ouverture de la séance' : ''}.`
                        : 'La photo des données sera prise à la programmation du conseil.'}
                    {summary.left > 0 && ` ${summary.left} élève(s) sorti(s) de la classe, hors statistiques.`}
                </p>
            </section>

            <div role="tablist" aria-label="Rubriques du conseil" className="mb-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-ink-100/70 p-1">
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
                        className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 ${tab === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'students' && (
                <Card id="panel-students" role="tabpanel" aria-labelledby="tab-students" className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-ink-100 bg-ink-50/80 text-xs font-semibold uppercase tracking-wider text-ink-500">
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
                                    <tr key={row.id} className={`transition-colors hover:bg-ink-50/60 ${row.has_left_class ? 'text-ink-500' : ''}`}>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-gold-300" aria-hidden="true">
                                                    {initials(row.name)}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-ink-900">{row.name}</p>
                                                    <p className="text-xs font-normal text-ink-500">
                                                        {row.matricule}
                                                        {row.has_left_class && ' · sorti(e) de la classe'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <AverageChip value={row.average} />
                                        </td>
                                        <td className="px-5 py-3 tabular-nums text-ink-700">
                                            {row.rank ? (
                                                <>
                                                    <span className="font-semibold text-ink-900">{row.rank}</span>
                                                    {row.class_size ? <span className="text-ink-500"> / {row.class_size}</span> : null}
                                                </>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
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
                            <thead className="border-b border-ink-100 bg-ink-50/80 text-xs font-semibold uppercase tracking-wider text-ink-500">
                                <tr>
                                    <th className="px-5 py-3">Membre</th>
                                    <th className="px-5 py-3">Fonction</th>
                                    <th className="px-5 py-3">Vote</th>
                                    <th className="px-5 py-3">Présence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {members.map((member) => (
                                    <tr key={member.id} className="transition-colors hover:bg-ink-50/60">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700" aria-hidden="true">
                                                    {initials(member.name)}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-ink-900">{member.name}</p>
                                                    {member.external_role && <p className="text-xs font-normal text-ink-500">{member.external_role}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex rounded-full bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200">{member.function_label}</span>
                                        </td>
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
