import { Select, TextInput } from '@/Components/Admin/Field';
import { SessionDecisionType } from '@/Components/Council/DecisionPanel';
import { CheckCircle2, Smartphone, Vote, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface SessionVote {
    id: number;
    council_student_id: number;
    decision_type_id: number;
    student: string | null;
    decision: string | null;
    mode: string;
    mode_label: string;
    secrecy: string;
    voters_present: number;
    quorum_required: number;
    ballots: number | null;
    votes_for: number | null;
    votes_against: number | null;
    abstentions: number | null;
    result: string | null;
    result_label: string | null;
    tie_broken: boolean;
    closed_at: string | null;
}

export interface VoteRules {
    quorum: { convoked: number; present: number; required: number; met: boolean };
    mode: string;
    majority: string;
    casting: boolean;
    secrecy: string;
    modes: Record<string, string>;
}

interface Props {
    councilId: number;
    studentId: number;
    chosenTypeIds: number[];
    types: SessionDecisionType[];
    votes: SessionVote[];
    rules: VoteRules;
    canConduct: boolean;
    /** Enregistre la fiche avant d'ouvrir un vote : le serveur vérifie que la décision est bien proposée. */
    flush: () => Promise<unknown>;
    onChange: (votes: SessionVote[]) => void;
}

const messageOf = (failure: unknown): { text: string; code?: string } => {
    const data = (failure as { response?: { data?: { message?: string; code?: string } } }).response?.data;

    return { text: data?.message ?? 'L’action n’a pas abouti. Réessayez.', code: data?.code };
};

/**
 * Votes de la séance (VOT-01 à VOT-05) pour l'élève affiché : lancer un vote sur une décision cochée, suivre les
 * bulletins reçus, saisir le décompte à main levée, clore — avec la voix prépondérante du président en cas d'égalité.
 */
export default function VotePanel({ councilId, studentId, chosenTypeIds, types, votes, rules, canConduct, flush, onChange }: Props) {
    const [mode, setMode] = useState(rules.mode);
    const [counts, setCounts] = useState({ votes_for: '', votes_against: '', abstentions: '' });
    const [casting, setCasting] = useState<'for' | 'against' | ''>('');
    const [needsCasting, setNeedsCasting] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const open = votes.find((vote) => vote.closed_at === null) ?? null;
    const latest = (typeId: number) => [...votes].reverse().find((vote) => vote.council_student_id === studentId && vote.decision_type_id === typeId) ?? null;
    const chosen = types.filter((type) => chosenTypeIds.includes(type.id));
    const replace = (vote: SessionVote) => onChange(votes.some((item) => item.id === vote.id) ? votes.map((item) => (item.id === vote.id ? vote : item)) : [...votes, vote]);

    // Bulletins reçus : le président voit le compte monter pendant le vote sur appareil (sans le décompte).
    useEffect(() => {
        if (!open || open.mode !== 'device') return;
        const timer = window.setInterval(async () => {
            try {
                const { data } = await window.axios.get<{ manage: SessionVote | null }>(route('council.votes.state', councilId));
                if (data.manage) replace(data.manage);
            } catch {
                // Le sondage reprend au tour suivant.
            }
        }, 3000);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open?.id, open?.mode, councilId, votes]);

    const start = async (typeId: number) => {
        setBusy(true);
        setError(null);
        try {
            await flush();
            const { data } = await window.axios.post<{ vote: SessionVote }>(route('council.votes.store', councilId), { council_student_id: studentId, decision_type_id: typeId, mode });
            replace(data.vote);
            setCounts({ votes_for: '', votes_against: '', abstentions: '' });
            setCasting('');
            setNeedsCasting(false);
        } catch (failure) {
            setError(messageOf(failure).text);
        } finally {
            setBusy(false);
        }
    };

    const close = async () => {
        if (!open) return;
        setBusy(true);
        setError(null);
        try {
            const payload = open.mode === 'show_of_hands' ? Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value || 0)])) : {};
            const { data } = await window.axios.post<{ vote: SessionVote }>(route('council.votes.close', [councilId, open.id]), { ...payload, casting_choice: casting || null });
            replace(data.vote);
            setNeedsCasting(false);
        } catch (failure) {
            const { text, code } = messageOf(failure);
            setNeedsCasting(code === 'VOTE_CASTING_REQUIRED');
            setError(text);
        } finally {
            setBusy(false);
        }
    };

    const status = (vote: SessionVote | null, type: SessionDecisionType) => {
        if (vote && vote.closed_at === null) return <span className="text-xs font-semibold text-sky-800">Vote en cours</span>;
        if (vote?.result === 'adopted')
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Adoptée ({vote.votes_for}-{vote.votes_against}-{vote.abstentions})
                </span>
            );
        if (vote?.result === 'rejected')
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Rejetée ({vote.votes_for}-{vote.votes_against}-{vote.abstentions})
                </span>
            );
        return type.requires_vote ? <span className="text-xs font-semibold text-amber-800">Vote requis</span> : null;
    };

    if (!canConduct && chosen.every((type) => !latest(type.id))) return null;

    return (
        <section aria-labelledby="votes-title" className="mt-5 space-y-3 border-t border-ink-100 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="votes-title" className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                    <Vote className="h-4 w-4" aria-hidden="true" /> Votes
                </h3>
                <span className={`text-xs ${rules.quorum.met ? 'text-ink-500' : 'font-semibold text-red-700'}`}>
                    Quorum : {rules.quorum.present}/{rules.quorum.convoked} présents ({rules.quorum.required} requis)
                </span>
            </div>

            {chosen.length === 0 ? (
                <p className="text-xs text-ink-500">Cochez une décision pour pouvoir la soumettre au vote.</p>
            ) : (
                <ul className="space-y-2">
                    {chosen.map((type) => {
                        const vote = latest(type.id);

                        return (
                            <li key={type.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="min-w-0 flex-1 text-ink-800">{type.label}</span>
                                {status(vote, type)}
                                {canConduct && !open && (
                                    <button type="button" disabled={busy} onClick={() => void start(type.id)} className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50">
                                        {vote ? 'Nouveau vote' : 'Lancer un vote'}
                                        <span className="sr-only"> sur « {type.label} »</span>
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {canConduct && !open && chosen.length > 0 && (
                <Select aria-label="Mode du prochain vote" value={mode} onChange={(e) => setMode(e.target.value)}>
                    {Object.entries(rules.modes).map(([key, label]) => (
                        <option key={key} value={key}>
                            Vote {label.toLowerCase()}
                        </option>
                    ))}
                </Select>
            )}

            {open && (
                <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950" role="group" aria-label="Vote en cours">
                    <p>
                        <strong>Vote en cours</strong> : {open.decision} pour {open.student} · {open.mode_label.toLowerCase()}, {open.secrecy === 'secret' ? 'secret' : 'nominatif'}
                    </p>
                    {open.mode === 'device' ? (
                        <p className="flex flex-wrap items-center gap-1.5">
                            <Smartphone className="h-4 w-4" aria-hidden="true" /> {open.ballots ?? 0} vote(s) reçu(s) sur {open.voters_present} présent(s) —
                            <a href={route('council.vote.show', councilId)} target="_blank" rel="noreferrer" className="font-semibold underline">
                                page de vote des membres
                            </a>
                        </p>
                    ) : (
                        canConduct && (
                            <div className="grid grid-cols-3 gap-2">
                                {(
                                    [
                                        ['votes_for', 'Pour'],
                                        ['votes_against', 'Contre'],
                                        ['abstentions', 'Abst.'],
                                    ] as const
                                ).map(([key, label]) => (
                                    <label key={key} className="text-xs font-semibold">
                                        {label}
                                        <TextInput type="number" min={0} max={open.voters_present} inputMode="numeric" value={counts[key]} onChange={(e) => setCounts({ ...counts, [key]: e.target.value })} />
                                    </label>
                                ))}
                            </div>
                        )
                    )}
                    {canConduct && needsCasting && (
                        <fieldset className="space-y-1">
                            <legend className="text-xs font-semibold">Égalité : voix prépondérante du président</legend>
                            {(['for', 'against'] as const).map((choice) => (
                                <label key={choice} className="mr-4 inline-flex items-center gap-1.5">
                                    <input type="radio" name="casting" checked={casting === choice} onChange={() => setCasting(choice)} /> {choice === 'for' ? 'Pour' : 'Contre'}
                                </label>
                            ))}
                        </fieldset>
                    )}
                    {canConduct && (
                        <button type="button" disabled={busy || (needsCasting && !casting)} onClick={() => void close()} className="w-full rounded-lg bg-ink-900 px-3 py-2 font-semibold text-white disabled:opacity-50">
                            Clore le vote et calculer le résultat
                        </button>
                    )}
                </div>
            )}

            {error && (
                <p role="alert" className="text-xs text-red-700">
                    {error}
                </p>
            )}
            <p className="text-xs text-ink-500">
                {rules.majority}
                {rules.casting ? ' ; voix prépondérante du président en cas d’égalité' : ''}.
            </p>
        </section>
    );
}
