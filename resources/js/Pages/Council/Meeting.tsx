import MeetingTile from '@/Components/Council/MeetingTile';
import useCouncilMeeting from '@/hooks/useCouncilMeeting';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Mic, MicOff, PhoneOff, Users, Video, VideoOff, Vote } from 'lucide-react';

interface Props {
    council: { id: number; class: string | null; term: string; status: string };
    meeting: { id: number; type: string } | null;
    canConduct: boolean;
    maxParticipants: number;
    iceServers: RTCIceServer[];
    me: { id: number; name: string };
    voteUrl: string;
    backUrl: string;
}

/**
 * Page « Visioconférence » du conseil, pour les membres à distance (téléphone ou ordinateur). Dans la salle, la même
 * visioconférence s'affiche en bandeau sur l'écran de séance (MeetingBand) : la logique est partagée (useCouncilMeeting).
 */
export default function Meeting({ council, meeting: initialMeeting, canConduct, maxParticipants, iceServers, me, voteUrl, backUrl }: Props) {
    const visio = useCouncilMeeting({ councilId: council.id, initialMeeting, iceServers, meId: me.id });
    const { phase, meeting, participants, others } = visio;
    const button = 'inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold';

    return (
        <div className="flex min-h-dvh flex-col bg-neutral-900 text-white">
            <Head title={`Visioconférence — ${council.class ?? ''}`} />
            <header className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link href={backUrl} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-neutral-200 hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour
                </Link>
                <h1 className="font-serif text-lg font-bold">
                    Conseil {council.class} · {council.term}
                </h1>
                <span className="inline-flex items-center gap-1 text-sm text-neutral-300">
                    <Users className="h-4 w-4" aria-hidden="true" /> {participants.length}/{maxParticipants}
                </span>
                <a href={voteUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">
                    <Vote className="h-4 w-4" aria-hidden="true" /> Voter
                </a>
            </header>
            <p role="status" aria-live="polite" className="sr-only">
                {visio.notice}
            </p>

            <main className="flex flex-1 flex-col px-4 pb-4">
                {phase === 'in' ? (
                    <ul className={`grid flex-1 content-start gap-3 ${others.length === 0 ? 'grid-cols-1' : others.length < 3 ? 'sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
                        <MeetingTile name={me.name} stream={visio.localStream} muted cam={visio.cam && visio.hasVideo} mic={visio.mic} self />
                        {others.map((p) => (
                            <MeetingTile key={p.user_id} name={p.name} stream={visio.remoteStreams[p.user_id] ?? null} cam={p.cam} mic={p.mic} />
                        ))}
                    </ul>
                ) : (
                    <div className="mx-auto mt-10 w-full max-w-md space-y-4 rounded-3xl bg-neutral-800 p-6 text-center">
                        {phase === 'ended' ? (
                            <p className="text-lg">La visioconférence est terminée.</p>
                        ) : council.status !== 'in_session' ? (
                            <p>La visioconférence n’est possible que pendant la séance du conseil.</p>
                        ) : meeting ? (
                            <>
                                <p className="text-lg font-semibold">Visioconférence en cours</p>
                                <p className="text-sm text-neutral-300">
                                    {participants.length} participant(s). En rejoignant, vous êtes noté présent à distance (quorum et procès-verbal).
                                </p>
                                {meeting.type === 'video' && (
                                    <label className="flex items-center justify-center gap-2 text-sm">
                                        <input type="checkbox" checked={visio.cam} onChange={(e) => visio.setCam(e.target.checked)} className="rounded" /> Activer ma caméra
                                    </label>
                                )}
                                <button type="button" disabled={phase === 'joining'} onClick={() => void visio.enter()} className={`${button} w-full justify-center bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60`}>
                                    {phase === 'joining' ? 'Connexion…' : 'Rejoindre'}
                                </button>
                            </>
                        ) : canConduct ? (
                            <>
                                <p className="text-lg font-semibold">Ouvrir le conseil à distance</p>
                                <p className="text-sm text-neutral-300">
                                    Les membres qui ont un compte sont prévenus et peuvent rejoindre depuis leur téléphone ou leur ordinateur ({maxParticipants} participants au plus).
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button type="button" disabled={phase === 'joining'} onClick={() => void visio.enter('video')} className={`${button} justify-center bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60`}>
                                        <Video className="h-4 w-4" aria-hidden="true" /> En vidéo
                                    </button>
                                    <button type="button" disabled={phase === 'joining'} onClick={() => void visio.enter('audio')} className={`${button} justify-center bg-white/10 hover:bg-white/20 disabled:opacity-60`}>
                                        <Mic className="h-4 w-4" aria-hidden="true" /> En audio seulement
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p>Aucune visioconférence en cours. Cette page se met à jour toute seule.</p>
                        )}
                        {visio.error && (
                            <p role="alert" className="text-sm text-red-300">
                                {visio.error}
                            </p>
                        )}
                    </div>
                )}
            </main>

            {phase === 'in' && (
                <nav aria-label="Commandes de la visioconférence" className="sticky bottom-0 flex flex-wrap items-center justify-center gap-3 bg-neutral-950/90 px-4 py-3">
                    <button type="button" onClick={visio.toggleMic} className={`${button} ${visio.mic ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600 hover:bg-red-500'}`}>
                        {visio.mic ? <Mic className="h-4 w-4" aria-hidden="true" /> : <MicOff className="h-4 w-4" aria-hidden="true" />} {visio.mic ? 'Couper le micro' : 'Activer le micro'}
                    </button>
                    {visio.hasVideo && (
                        <button type="button" onClick={visio.toggleCam} className={`${button} ${visio.cam ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600 hover:bg-red-500'}`}>
                            {visio.cam ? <Video className="h-4 w-4" aria-hidden="true" /> : <VideoOff className="h-4 w-4" aria-hidden="true" />} {visio.cam ? 'Couper la caméra' : 'Activer la caméra'}
                        </button>
                    )}
                    <button type="button" onClick={() => void visio.leave()} className={`${button} bg-red-700 hover:bg-red-600`}>
                        <PhoneOff className="h-4 w-4" aria-hidden="true" /> Quitter
                    </button>
                    {canConduct && (
                        <button type="button" onClick={() => void visio.endForAll()} className={`${button} border border-red-400 text-red-200 hover:bg-red-900/40`}>
                            Terminer pour tous
                        </button>
                    )}
                </nav>
            )}
        </div>
    );
}
