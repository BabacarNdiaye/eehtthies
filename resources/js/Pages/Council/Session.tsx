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
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, MonitorUp, PauseCircle, Save, WifiOff } from 'lucide-react';
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

    return (
        <div className="flex min-h-dvh flex-col bg-ink-50">
            <Head title={`Séance — ${council.class ?? ''}`} />

            <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-3">
                <p className="sr-only">
                    {members.filter((member) => member.attendance === 'present').length} membre(s) présent(s) sur {members.length}.
                </p>
                <Link href={backUrl} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour
                </Link>
                <h1 className="font-serif text-lg font-bold text-ink-900">
                    {council.class} · {council.term}
                    {council.status !== 'in_session' && <span className="ml-2 text-sm font-normal text-ink-500">({council.status_label})</span>}
                </h1>
                <span className="rounded-full bg-ink-100 px-3 py-1 text-sm text-ink-800">
                    {reviewed} / {examinable} élèves examinés
                </span>
                <span className="inline-flex items-center gap-1 text-sm text-ink-600">
                    <Clock className="h-4 w-4" aria-hidden="true" /> {chrono}
                </span>
                {can.conduct && (
                    <span role="status" aria-live="polite" className={`inline-flex items-center gap-1 text-sm ${autosave.status === 'offline' || autosave.status === 'error' ? 'text-red-700' : 'text-ink-600'}`}>
                        {autosave.status === 'offline' && <WifiOff className="h-4 w-4" aria-hidden="true" />}
                        {statusLabel}
                    </span>
                )}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {can.viewInternal && (
                        <label className="inline-flex items-center gap-2 text-sm text-ink-700">
                            <input type="checkbox" className="rounded border-ink-300 text-gold-600 focus:ring-gold-500" checked={presentation} onChange={(e) => setPresentation(e.target.checked)} />
                            Mode présentation
                        </label>
                    )}
                    <a
                        href={route('council.projection.show', council.id)}
                        target="eeht-projection"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    >
                        <MonitorUp className="h-4 w-4" aria-hidden="true" /> Vue projetée
                    </a>
                    {can.conduct && (
                        <button type="button" onClick={finish} disabled={reviewed < examinable} className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
                            Terminer la délibération
                        </button>
                    )}
                </div>
            </header>

            {sitting && (
                <nav aria-label="Classes de la séance commune" className="flex gap-2 overflow-x-auto border-b border-ink-200 bg-white px-4 py-2">
                    {sitting.councils.map((item) => {
                        const active = item.id === council.id;

                        return (
                            <Link
                                key={item.id}
                                href={route('council.session.show', item.id)}
                                aria-current={active ? 'page' : undefined}
                                preserveScroll
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? 'bg-ink-900 text-white' : 'border border-ink-200 text-ink-700 hover:bg-ink-50'}`}
                            >
                                {item.class}
                                <span className={`ml-1.5 text-xs font-normal ${active ? 'text-ink-200' : 'text-ink-500'}`}>
                                    {item.status === 'in_session' ? `${item.reviewed}/${item.total}` : item.status_label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            )}

            {(message || flash?.error) && (
                <div role="alert" className={`mx-4 mt-3 rounded-lg px-4 py-2 text-sm ${message?.tone === 'info' ? 'bg-sky-50 text-sky-900' : 'bg-red-50 text-red-800'}`}>
                    {message?.text ?? flash?.error}
                </div>
            )}

            <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
                {/* Gauche : élèves */}
                <aside aria-label="Élèves du conseil" className="flex max-h-[calc(100dvh-8rem)] flex-col rounded-xl border border-ink-100 bg-white">
                    <div className="space-y-2 border-b border-ink-100 p-3">
                        <SearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève" />
                        <div className="grid grid-cols-2 gap-2">
                            <Select aria-label="Filtrer par pastille" value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)}>
                                <option value="">Pastilles : toutes</option>
                                <option value="red">Attention</option>
                                <option value="orange">Vigilance</option>
                                <option value="green">Favorable</option>
                            </Select>
                            <Select aria-label="Ordre" value={order} onChange={(e) => setOrder(e.target.value as 'alpha' | 'rank')}>
                                <option value="alpha">Alphabétique</option>
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
                                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500 ${active ? 'bg-ink-900 text-white' : 'hover:bg-ink-50'}`}
                                    >
                                        <span className="w-5 shrink-0" aria-hidden="true">
                                            {state === 'reviewed' ? <Check className="h-4 w-4" /> : state === 'on_hold' ? <PauseCircle className="h-4 w-4" /> : null}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">{student.name}</span>
                                            <span className={`text-xs ${active ? 'text-ink-200' : 'text-ink-500'}`}>
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
                    <div className="border-t border-ink-100 p-3 text-xs text-ink-600">
                        Classe : moyenne {fr(summary.average)} · taux ≥ 10 : {summary.pass_rate === null ? '—' : `${fr(summary.pass_rate, 1)} %`} · {summary.alerts.red ?? 0} en attention, {summary.alerts.orange ?? 0} en vigilance
                    </div>
                </aside>

                {/* Centre : fiche */}
                <main className="min-w-0">{current ? <StudentSheet student={current} presentation={presentation} /> : <p className="rounded-xl bg-white p-6 text-ink-500">Choisissez un élève.</p>}</main>

                {/* Droite : décisions */}
                <section aria-label="Décisions" className="rounded-xl border border-ink-100 bg-white p-4">
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

            <div className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 bg-white px-4 py-3">
                <button type="button" onClick={() => step(-1)} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Précédent
                </button>
                {can.conduct && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => mark('on_hold')} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                            <PauseCircle className="h-4 w-4" aria-hidden="true" /> Mettre en attente
                        </button>
                        <button type="button" onClick={() => void autosave.flush()} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                            <Save className="h-4 w-4" aria-hidden="true" /> Enregistrer
                        </button>
                        <button type="button" onClick={() => mark('reviewed')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
                            <Check className="h-4 w-4" aria-hidden="true" /> Examiné
                        </button>
                    </div>
                )}
                <button type="button" onClick={() => step(1)} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                    Suivant <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

// La visio (bandeau) vit dans une mise en page persistante : elle reste connectée d'une classe à l'autre.
Session.layout = (page: ReactNode) => <CouncilSessionLayout>{page}</CouncilSessionLayout>;
