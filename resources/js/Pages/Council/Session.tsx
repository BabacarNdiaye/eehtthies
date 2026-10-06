import AlertBadge from '@/Components/Council/AlertBadge';
import { BankEntry } from '@/Components/Council/AppreciationPicker';
import DecisionPanel, { SessionDecisionType } from '@/Components/Council/DecisionPanel';
import CouncilSessionLayout from '@/Layouts/CouncilSessionLayout';
import StudentSheet, { fr, SessionStudent } from '@/Components/Council/StudentSheet';
import VotePanel, { SessionVote, VoteRules } from '@/Components/Council/VotePanel';
import { Select, Textarea } from '@/Components/Admin/Field';
import { SearchField } from '@/Components/Admin/FilterBar';
import useCouncilAutosave, { StudentDraft } from '@/hooks/useCouncilAutosave';
import { confirmAction } from '@/lib/confirm';
import { PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, Loader2, MonitorUp, PauseCircle, Save, UsersRound, WifiOff } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
    council: { id: number; class: string | null; term: string; year: string | null; is_end_of_year: boolean; status: string; status_label: string; started_at: string | null; session_notes: string | null; focus_council_student_id: number | null };
    summary: { count: number; evaluated: number; average: number | null; min: number | null; max: number | null; pass_rate: number | null; alerts: Record<string, number>; unjustified_hours: number };
    members: { id: number; name: string; function_label: string; attendance: string }[];
    students: SessionStudent[];
    decisionTypes: SessionDecisionType[];
    categories: Record<string, string>;
    bank: BankEntry[];
    levels: Record<string, string>;
    themes: Record<string, string>;
    votes: SessionVote[];
    voteRules: VoteRules;
    sitting: { id: number; label: string; councils: { id: number; class: string | null; status: string; status_label: string; reviewed: number; total: number }[] } | null;
    visio: { meeting: { id: number; type: string } | null; iceServers: RTCIceServer[]; me: { id: number; name: string }; maxParticipants: number; canJoin: boolean };
    can: { conduct: boolean; viewInternal: boolean; viewDiscipline: boolean };
    backUrl: string;
}

const draftOf = (student: SessionStudent): StudentDraft => ({
    general_appreciation: student.general_appreciation ?? '',
    review_status: student.review_status,
    decisions: student.decisions.map((decision) => ({ decision_type_id: decision.decision_type_id, reason: decision.reason })),
    revision: student.revision,
});

const initialsOf = (name: string) =>
    name
        .split(/[\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

function useChrono(startedAt: string | null): string {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);
    if (!startedAt) return '—';
    const minutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000));

    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** Mode conseil (E05) : liste des élèves, fiche, décisions ; enregistrement automatique et file hors ligne. */
export default function Session({ council, summary, members, students: initialStudents, decisionTypes, categories, bank, levels, themes, votes: initialVotes, voteRules, sitting, can, backUrl }: Props) {
    const flash = usePage<PageProps>().props.flash;
    const [students, setStudents] = useState(initialStudents);
    const [drafts, setDrafts] = useState<Record<number, StudentDraft>>(() => Object.fromEntries(initialStudents.map((student) => [student.id, draftOf(student)])));
    const [currentId, setCurrentId] = useState<number | null>(council.focus_council_student_id ?? initialStudents[0]?.id ?? null);
    const [presentation, setPresentation] = useState(!can.viewInternal);
    const [search, setSearch] = useState('');
    const [alertFilter, setAlertFilter] = useState('');
    const [order, setOrder] = useState<'alpha' | 'rank'>('alpha');
    const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
    const [notes, setNotes] = useState(council.session_notes ?? '');
    const [votes, setVotes] = useState(initialVotes);
    const chrono = useChrono(council.started_at);

    const autosave = useCouncilAutosave({
        councilId: council.id,
        enabled: can.conduct,
        onSaved: (studentId, revision) => {
            setDrafts((all) => ({ ...all, [studentId]: { ...all[studentId], revision } }));
            setStudents((all) => all.map((student) => (student.id === studentId ? { ...student, revision, review_status: drafts[studentId]?.review_status ?? student.review_status } : student)));
        },
        onConflict: (studentId, current, text) => {
            const server = current as SessionStudent;
            setStudents((all) => all.map((student) => (student.id === studentId ? server : student)));
            setDrafts((all) => ({ ...all, [studentId]: draftOf(server) }));
            setMessage({ tone: 'info', text });
        },
        onRejected: (studentId, text) => {
            const name = students.find((student) => student.id === studentId)?.name ?? '';
            setMessage({ tone: 'error', text: `${name} : ${text}` });
            setCurrentId(studentId);
        },
    });

    const current = students.find((student) => student.id === currentId) ?? null;
    const draft = currentId !== null ? drafts[currentId] : null;

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        const list = students.filter((student) => (!alertFilter || student.alert_level === alertFilter) && (!term || student.name.toLowerCase().includes(term)));

        return order === 'rank' ? [...list].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)) : list;
    }, [students, search, alertFilter, order]);

    const reviewed = Object.values(drafts).filter((item) => item.review_status === 'reviewed').length;
    const examinable = students.filter((student) => !student.has_left_class).length;

    const update = (next: StudentDraft) => {
        if (currentId === null || !can.conduct) return;
        setDrafts((all) => ({ ...all, [currentId]: next }));
        autosave.enqueue(currentId, next);
    };

    const go = useCallback(
        (studentId: number | null) => {
            if (studentId === null) return;
            void autosave.flush();
            setCurrentId(studentId);
            setMessage(null);
            if (can.conduct) {
                window.axios.post(route('council.session.focus', council.id), { council_student_id: studentId }).catch(() => undefined);
            }
        },
        [autosave, can.conduct, council.id],
    );

    const step = (delta: number) => {
        const index = visible.findIndex((student) => student.id === currentId);
        const next = visible[index + delta];
        if (next) go(next.id);
    };

    const mark = (status: 'reviewed' | 'on_hold') => {
        if (!draft) return;
        update({ ...draft, review_status: status });
        window.setTimeout(() => void autosave.flush(), 0);
    };

    // Raccourcis : flèches gauche/droite hors des champs de saisie, Ctrl/⌘ + S pour enregistrer tout de suite.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const typing = event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                void autosave.flush();
            } else if (!typing && event.key === 'ArrowRight') {
                step(1);
            } else if (!typing && event.key === 'ArrowLeft') {
                step(-1);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    // Notes de séance : enregistrées une seconde après la dernière frappe.
    useEffect(() => {
        if (!can.conduct || notes === (council.session_notes ?? '')) return;
        const timer = window.setTimeout(() => window.axios.put(route('council.session.notes', council.id), { session_notes: notes }).catch(() => undefined), 1000);
        return () => window.clearTimeout(timer);
    }, [notes, can.conduct, council.id, council.session_notes]);

    const finish = async () => {
        await autosave.flush();
        if (await confirmAction({ title: 'Terminer la délibération', message: 'Chaque élève a-t-il été examiné ? Les décisions ne pourront plus être modifiées en séance ; le procès-verbal passe en rédaction.', confirmLabel: 'Terminer' })) {
            router.post(route('council.session.end', council.id));
        }
    };

    const statusLabel = { idle: 'À jour', saving: 'Enregistrement…', saved: 'Enregistré', offline: `Hors ligne — ${autosave.pending} fiche(s) en attente`, error: 'Une fiche n’a pas pu partir' }[autosave.status];
    const recommendation = decisionTypes.find((type) => type.id === current?.recommendation_id) ?? null;
    const readOnly = !can.conduct;

    const presentMembers = members.filter((member) => member.attendance === 'present');
    const percent = examinable > 0 ? Math.round((reviewed / examinable) * 100) : 0;
    const saveBad = autosave.status === 'offline' || autosave.status === 'error';

    return (
        <div className="flex min-h-dvh flex-col bg-gradient-to-b from-ink-900 via-ink-900 to-ink-950 text-white">
            <Head title={`Séance — ${council.class ?? ''}`} />

            <header className="relative border-b border-white/10">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" aria-hidden="true" />
                <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4">
                    <Link href={backUrl} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-ink-100 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold-400">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour
                    </Link>

                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                            {council.status === 'in_session' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" aria-hidden="true" />}
                            {council.status === 'in_session' ? 'Conseil en séance' : council.status_label}
                        </p>
                        <h1 className="truncate font-serif text-2xl font-bold leading-tight sm:text-3xl">
                            {council.class} <span className="font-normal text-ink-300">· {council.term}</span>
                        </h1>
                    </div>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2" title={`${presentMembers.length} membre(s) présent(s) sur ${members.length}`}>
                            <ul className="flex -space-x-1" aria-label="Membres du conseil">
                                {members.slice(0, 7).map((member) => (
                                    <li
                                        key={member.id}
                                        title={`${member.name} — ${member.function_label}`}
                                        className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-ink-900 ${member.attendance === 'present' ? 'bg-gold-500 text-ink-950' : 'bg-ink-700 text-ink-300'}`}
                                    >
                                        <span aria-hidden="true">{initialsOf(member.name)}</span>
                                        <span className="sr-only">
                                            {member.name} : {member.attendance === 'present' ? 'présent' : 'absent'}
                                        </span>
                                    </li>
                                ))}
                                {members.length > 7 && <li className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-xs font-semibold text-ink-200 ring-2 ring-ink-900">+{members.length - 7}</li>}
                            </ul>
                            <span className="flex items-center gap-1 text-sm text-ink-200">
                                <UsersRound className="h-4 w-4 text-gold-300" aria-hidden="true" />
                                {presentMembers.length}/{members.length}
                            </span>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm tabular-nums text-ink-100">
                            <Clock className="h-4 w-4 text-gold-300" aria-hidden="true" /> {chrono}
                        </span>

                        {can.viewInternal && (
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm text-ink-100 transition hover:bg-white/10">
                                <input type="checkbox" className="rounded border-ink-400 bg-transparent text-gold-500 focus:ring-gold-400" checked={presentation} onChange={(e) => setPresentation(e.target.checked)} />
                                Mode présentation
                            </label>
                        )}
                        <a
                            href={route('council.projection.show', council.id)}
                            target="eeht-projection"
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-gold-400"
                        >
                            <MonitorUp className="h-4 w-4" aria-hidden="true" /> Vue projetée
                        </a>
                    </div>
                </div>

                {sitting && (
                    <nav aria-label="Classes de la séance commune" className="mx-auto flex max-w-screen-2xl gap-1.5 overflow-x-auto px-4 pb-3">
                        {sitting.councils.map((item) => {
                            const active = item.id === council.id;

                            return (
                                <Link
                                    key={item.id}
                                    href={route('council.session.show', item.id)}
                                    aria-current={active ? 'page' : undefined}
                                    preserveScroll
                                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-400 ${active ? 'bg-gold-500 text-ink-950 shadow-sm' : 'border border-white/15 text-ink-100 hover:bg-white/10'}`}
                                >
                                    {item.class}
                                    <span className={`ml-1.5 text-xs font-normal ${active ? 'text-ink-800' : 'text-ink-300'}`}>
                                        {item.status === 'in_session' ? `${item.reviewed}/${item.total}` : item.status_label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </header>

            {(message || flash?.error) && (
                <div role="alert" className={`mx-auto mt-4 w-full max-w-screen-2xl px-4`}>
                    <p className={`rounded-xl px-4 py-2.5 text-sm font-medium ${message?.tone === 'info' ? 'bg-sky-100 text-sky-900' : 'bg-red-100 text-red-900'}`}>{message?.text ?? flash?.error}</p>
                </div>
            )}

            <div className="mx-auto grid w-full max-w-screen-2xl flex-1 gap-5 px-4 pb-32 pt-5 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_23rem]">
                {/* Gauche : élèves */}
                <aside aria-label="Élèves du conseil" className="flex max-h-[calc(100dvh-11rem)] flex-col overflow-hidden rounded-2xl bg-white text-ink-900 shadow-elevated lg:sticky lg:top-20 lg:self-start">
                    <div className="space-y-2 border-b border-ink-100 p-3">
                        <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève" />
                        <div className="grid grid-cols-2 gap-2">
                            <Select aria-label="Filtrer par pastille" value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)}>
                                <option value="">Pastilles</option>
                                <option value="red">Attention</option>
                                <option value="orange">Vigilance</option>
                                <option value="green">Favorable</option>
                            </Select>
                            <Select aria-label="Ordre" value={order} onChange={(e) => setOrder(e.target.value as 'alpha' | 'rank')}>
                                <option value="alpha">A → Z</option>
                                <option value="rank">Par rang</option>
                            </Select>
                        </div>
                    </div>
                    <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
                        {visible.map((student) => {
                            const state = drafts[student.id]?.review_status ?? student.review_status;
                            const active = student.id === currentId;

                            return (
                                <li key={student.id}>
                                    <button
                                        type="button"
                                        onClick={() => go(student.id)}
                                        aria-current={active ? 'true' : undefined}
                                        className={`relative flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500 ${active ? 'bg-gold-50' : 'hover:bg-ink-50'}`}
                                    >
                                        {active && <span className="absolute inset-y-0 left-0 w-1 bg-gold-500" aria-hidden="true" />}
                                        <span
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                state === 'reviewed' ? 'bg-emerald-600 text-white' : state === 'on_hold' ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400/50' : active ? 'bg-ink-900 text-gold-300' : 'bg-ink-100 text-ink-600'
                                            }`}
                                            aria-hidden="true"
                                        >
                                            {state === 'reviewed' ? <Check className="h-4 w-4" /> : state === 'on_hold' ? <PauseCircle className="h-4 w-4" /> : initialsOf(student.name)}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate ${active ? 'font-bold text-ink-900' : 'font-medium text-ink-800'}`}>{student.name}</span>
                                            <span className="text-xs text-ink-500">
                                                {fr(student.average)}
                                                {state === 'reviewed' ? ' · examiné' : state === 'on_hold' ? ' · en attente' : ''}
                                                {student.has_left_class ? ' · sorti(e)' : ''}
                                            </span>
                                        </span>
                                        <AlertBadge level={student.alert_level} compact />
                                    </button>
                                </li>
                            );
                        })}
                        {visible.length === 0 && <li className="p-4 text-sm text-ink-500">Aucun élève ne correspond.</li>}
                    </ul>
                    <div className="border-t border-ink-100 bg-ink-50/70 p-3 text-xs text-ink-600">
                        Classe : moyenne {fr(summary.average)} · taux ≥ 10 : {summary.pass_rate === null ? '—' : `${fr(summary.pass_rate, 1)} %`} · {summary.alerts.red ?? 0} en attention, {summary.alerts.orange ?? 0} en vigilance
                    </div>
                </aside>

                {/* Centre : fiche */}
                <main className="min-w-0 text-ink-900">
                    {current ? <StudentSheet student={current} presentation={presentation} /> : <p className="rounded-2xl bg-white p-6 text-ink-500 shadow-soft">Choisissez un élève.</p>}
                </main>

                {/* Droite : décisions */}
                <section aria-label="Décisions" className="rounded-2xl bg-white p-5 text-ink-900 shadow-elevated lg:col-span-2 xl:col-span-1 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-11rem)] xl:self-start xl:overflow-y-auto">
                    {current && draft ? (
                        <>
                            <DecisionPanel
                                draft={draft}
                                types={decisionTypes}
                                categories={categories}
                                recommendation={presentation ? undefined : recommendation}
                                readOnly={readOnly}
                                onChange={update}
                                bank={presentation ? undefined : { entries: bank, levels, themes }}
                            />
                            <VotePanel
                                councilId={council.id}
                                studentId={current.id}
                                chosenTypeIds={draft.decisions.map((decision) => decision.decision_type_id)}
                                types={decisionTypes}
                                votes={votes}
                                rules={voteRules}
                                canConduct={can.conduct}
                                flush={() => autosave.flush()}
                                onChange={setVotes}
                            />
                            {can.conduct && (
                                <details className="mt-5">
                                    <summary className="cursor-pointer text-sm font-semibold text-ink-900">Notes de séance (classe)</summary>
                                    <Textarea className="mt-2" rows={4} aria-label="Notes de séance" value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </details>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-ink-500">Aucun élève sélectionné.</p>
                    )}
                </section>
            </div>

            {/* Barre d'action flottante : avancement, enregistrement, navigation */}
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3">
                <div className="pointer-events-auto flex w-full max-w-fit flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-3xl border border-white/10 bg-ink-950/90 px-3 py-2.5 text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                    <button type="button" onClick={() => step(-1)} aria-label="Élève précédent" title="Élève précédent (←)" className="order-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-gold-400">
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <div className="order-2 flex min-w-0 flex-1 items-center gap-3 px-1 sm:flex-none">
                        <div className="relative h-11 w-11 shrink-0" role="progressbar" aria-label="Avancement de la délibération" aria-valuemin={0} aria-valuemax={examinable} aria-valuenow={reviewed}>
                            <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90" aria-hidden="true">
                                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-white/15" />
                                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(percent / 100) * 97.4} 97.4`} className="stroke-gold-400 transition-all duration-500" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">{percent}%</span>
                        </div>
                        <div className="leading-tight">
                            <p className="text-sm font-semibold">
                                {reviewed} / {examinable} examinés
                            </p>
                            {can.conduct && (
                                <p role="status" aria-live="polite" className={`flex items-center gap-1 text-xs ${saveBad ? 'font-semibold text-red-300' : 'text-ink-300'}`}>
                                    {autosave.status === 'offline' && <WifiOff className="h-3 w-3" aria-hidden="true" />}
                                    {autosave.status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                                    {autosave.status === 'saved' && <Check className="h-3 w-3 text-emerald-300" aria-hidden="true" />}
                                    {statusLabel}
                                </p>
                            )}
                        </div>
                    </div>

                    {can.conduct && (
                        <div className="order-4 flex w-full flex-wrap items-center justify-center gap-2 sm:order-3 sm:w-auto">
                            <button type="button" onClick={() => mark('on_hold')} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-ink-100 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold-400">
                                <PauseCircle className="h-4 w-4" aria-hidden="true" /> <span className="max-sm:sr-only">Mettre en attente</span>
                            </button>
                            <button type="button" onClick={() => void autosave.flush()} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-ink-100 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold-400">
                                <Save className="h-4 w-4" aria-hidden="true" /> <span className="max-sm:sr-only">Enregistrer</span>
                            </button>
                            <button type="button" onClick={() => mark('reviewed')} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-ink-950 shadow-sm outline-none transition hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-white">
                                <Check className="h-4 w-4" aria-hidden="true" /> Examiné
                            </button>
                            <button
                                type="button"
                                onClick={finish}
                                disabled={reviewed < examinable}
                                className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-bold text-ink-950 outline-none transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-ink-400"
                            >
                                Terminer la délibération
                            </button>
                        </div>
                    )}

                    <button type="button" onClick={() => step(1)} aria-label="Élève suivant" title="Élève suivant (→)" className="order-3 flex h-11 w-11 shrink-0 sm:order-4 items-center justify-center rounded-full bg-white/10 outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-gold-400">
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// La visio (bandeau) vit dans une mise en page persistante : elle reste connectée d'une classe à l'autre.
Session.layout = (page: ReactNode) => <CouncilSessionLayout>{page}</CouncilSessionLayout>;
