import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Hand, Vote as VoteIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VoteState {
    status: string;
    is_voter: boolean;
    vote: {
        id: number;
        student: string | null;
        decision: string | null;
        mode: string;
        mode_label: string;
        secrecy: string;
        can_vote: boolean;
        has_voted: boolean;
        ballots: number;
        voters_present: number;
    } | null;
    last: { id: number; student: string | null; decision: string | null; result: string; result_label: string; tie_broken: boolean } | null;
}

interface Props {
    council: { id: number; class: string | null; term: string; status: string };
    state: VoteState;
    choices: Record<string, string>;
    backUrl: string;
}

const tone: Record<string, string> = {
    for: 'border-emerald-600 bg-emerald-50 text-emerald-900',
    against: 'border-red-600 bg-red-50 text-red-900',
    abstain: 'border-ink-500 bg-ink-50 text-ink-900',
};

/**
 * Page de vote d'un membre (VOT-02), pensée pour le téléphone : elle interroge l'état toutes les 3 secondes, montre le
 * vote en cours et enregistre un seul bulletin, après confirmation. Le décompte n'apparaît qu'une fois le vote clos.
 */
export default function Vote({ council, state: initial, choices, backUrl }: Props) {
    const [state, setState] = useState(initial);
    const [picked, setPicked] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(true);
    const voteId = useRef(initial.vote?.id ?? null);

    useEffect(() => {
        const poll = async () => {
            try {
                const { data } = await window.axios.get<VoteState>(route('council.votes.state', council.id));
                setConnected(true);
                if ((data.vote?.id ?? null) !== voteId.current) {
                    voteId.current = data.vote?.id ?? null;
                    setPicked(null);
                    setError(null);
                }
                setState(data);
            } catch {
                setConnected(false);
            }
        };
        const timer = window.setInterval(poll, 3000);
        return () => window.clearInterval(timer);
    }, [council.id]);

    const send = async () => {
        if (!state.vote || !picked) return;
        setSending(true);
        setError(null);
        try {
            const { data } = await window.axios.post<VoteState>(route('council.votes.ballot', [council.id, state.vote.id]), { choice: picked });
            setState(data);
        } catch (failure: unknown) {
            const response = (failure as { response?: { data?: { message?: string } } }).response;
            setError(response?.data?.message ?? 'Le vote n’a pas pu être enregistré. Réessayez.');
        } finally {
            setSending(false);
        }
    };

    const vote = state.vote;

    return (
        <div className="min-h-dvh bg-ink-50">
            <Head title={`Vote — ${council.class ?? ''}`} />
            <header className="flex items-center gap-3 border-b border-ink-200 bg-white px-4 py-3">
                <Link href={backUrl} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour
                </Link>
                <h1 className="font-serif text-lg font-bold text-ink-900">
                    Vote · {council.class} · {council.term}
                </h1>
            </header>

            <main className="mx-auto max-w-md space-y-4 p-4">
                <p role="status" aria-live="polite" className={`text-sm ${connected ? 'text-ink-500' : 'font-semibold text-red-700'}`}>
                    {connected ? 'Cette page se met à jour toute seule.' : 'Connexion perdue — nouvel essai…'}
                </p>

                {state.status !== 'in_session' ? (
                    <div className="rounded-2xl bg-white p-5 text-ink-700 shadow-soft">La séance n’est pas en cours : aucun vote ne peut avoir lieu.</div>
                ) : !vote ? (
                    <div className="rounded-2xl bg-white p-5 shadow-soft">
                        <VoteIcon className="mb-2 h-6 w-6 text-ink-400" aria-hidden="true" />
                        <h2 className="font-semibold text-ink-900">Aucun vote en cours</h2>
                        <p className="text-sm text-ink-600">Le vote s’affichera ici dès que le président le lancera.</p>
                    </div>
                ) : (
                    <section aria-labelledby="vote-title" className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
                        <div>
                            <p className="text-sm text-ink-500">
                                {vote.mode_label} · vote {vote.secrecy === 'secret' ? 'secret' : 'nominatif'}
                            </p>
                            <h2 id="vote-title" className="font-serif text-2xl font-bold text-ink-900">
                                {vote.decision}
                            </h2>
                            <p className="text-ink-700">pour {vote.student}</p>
                        </div>

                        {vote.mode === 'show_of_hands' ? (
                            <p className="flex items-center gap-2 rounded-xl bg-sky-50 p-4 text-sky-900">
                                <Hand className="h-5 w-5 shrink-0" aria-hidden="true" /> Vote à main levée : levez la main dans la salle, le président compte les voix.
                            </p>
                        ) : vote.has_voted ? (
                            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-900">
                                <Check className="h-5 w-5 shrink-0" aria-hidden="true" /> Votre vote est enregistré. Le résultat s’affichera à la clôture.
                            </p>
                        ) : vote.can_vote ? (
                            <fieldset className="space-y-3">
                                <legend className="mb-1 text-sm font-semibold text-ink-900">Votre vote</legend>
                                {Object.entries(choices).map(([key, label]) => (
                                    <label
                                        key={key}
                                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-lg font-semibold transition ${picked === key ? tone[key] : 'border-ink-200 bg-white text-ink-800'}`}
                                    >
                                        <input type="radio" name="choice" value={key} checked={picked === key} onChange={() => setPicked(key)} className="h-5 w-5 text-ink-900 focus:ring-gold-500" />
                                        {label}
                                    </label>
                                ))}
                                {error && (
                                    <p role="alert" className="text-sm text-red-700">
                                        {error}
                                    </p>
                                )}
                                <button type="button" onClick={send} disabled={!picked || sending} className="w-full rounded-xl bg-ink-900 px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50">
                                    {picked ? `Valider : ${choices[picked]}` : 'Choisissez une réponse'}
                                </button>
                                <p className="text-xs text-ink-500">Un seul vote par membre, sans retour possible.</p>
                            </fieldset>
                        ) : (
                            <p className="rounded-xl bg-ink-50 p-4 text-ink-700">{state.is_voter ? 'Ce vote ne se fait pas sur appareil.' : 'Vous assistez au conseil sans voter (membre non votant ou absent).'}</p>
                        )}

                        {vote.mode === 'device' && (
                            <p className="text-sm text-ink-600">
                                {vote.ballots} vote(s) reçu(s) sur {vote.voters_present} votant(s) présent(s).
                            </p>
                        )}
                    </section>
                )}

                {state.last && (
                    <section aria-label="Dernier résultat" className="rounded-2xl border border-ink-200 bg-white p-4 text-sm">
                        <p className="text-ink-500">Dernier vote</p>
                        <p className="text-ink-900">
                            {state.last.decision} pour {state.last.student} : <strong>{state.last.result_label}</strong>
                            {state.last.tie_broken && ' (voix prépondérante du président)'}
                        </p>
                    </section>
                )}
            </main>
        </div>
    );
}
