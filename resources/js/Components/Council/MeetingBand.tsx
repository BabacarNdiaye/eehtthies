import MeetingTile from '@/Components/Council/MeetingTile';
import useCouncilMeeting from '@/hooks/useCouncilMeeting';
import { Maximize2, Mic, MicOff, Minimize2, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useState } from 'react';

interface Props {
    councilId: number;
    meeting: { id: number; type: string } | null;
    iceServers: RTCIceServer[];
    me: { id: number; name: string };
    canConduct: boolean;
    maxParticipants: number;
}

/**
 * Visioconférence intégrée à l'écran de séance : les membres à distance apparaissent en bandeau au-dessus des fiches,
 * si bien que la salle les voit en même temps que l'élève examiné quand l'écran est projeté (mode présentation).
 * « Agrandir » donne plus de place aux images pendant un échange.
 */
export default function MeetingBand({ councilId, meeting: initialMeeting, iceServers, me, canConduct, maxParticipants }: Props) {
    const visio = useCouncilMeeting({ councilId, initialMeeting, iceServers, meId: me.id });
    const [large, setLarge] = useState(false);
    const button = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold';

    if (visio.phase !== 'in') {
        if (!visio.meeting && !canConduct) return null;

        return (
            <section aria-label="Visioconférence" className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm">
                <Video className="h-4 w-4 text-ink-500" aria-hidden="true" />
                {visio.meeting ? (
                    <>
                        <span className="text-ink-800">
                            Visioconférence en cours : {visio.participants.length} participant(s) à distance.
                        </span>
                        <button type="button" disabled={visio.phase === 'joining'} onClick={() => void visio.enter()} className={`${button} bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60`}>
                            {visio.phase === 'joining' ? 'Connexion…' : 'Afficher les participants ici'}
                        </button>
                    </>
                ) : (
                    <>
                        <span className="text-ink-700">Des membres à distance ? Ouvrez la visioconférence : ils apparaîtront ici, au-dessus des fiches ({maxParticipants} au plus).</span>
                        <button type="button" disabled={visio.phase === 'joining'} onClick={() => void visio.enter('video')} className={`${button} bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60`}>
                            <Video className="h-4 w-4" aria-hidden="true" /> En vidéo
                        </button>
                        <button type="button" disabled={visio.phase === 'joining'} onClick={() => void visio.enter('audio')} className={`${button} border border-ink-200 text-ink-700 hover:bg-ink-50 disabled:opacity-60`}>
                            <Mic className="h-4 w-4" aria-hidden="true" /> Audio seulement
                        </button>
                    </>
                )}
                {visio.error && (
                    <p role="alert" className="basis-full text-red-700">
                        {visio.error}
                    </p>
                )}
            </section>
        );
    }

    const count = visio.others.length;

    return (
        <section aria-label="Visioconférence" className="mx-4 mt-3 rounded-xl bg-neutral-900 p-3 text-white">
            <p role="status" aria-live="polite" className="sr-only">
                {visio.notice}
            </p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">
                    Visioconférence · {visio.participants.length}/{maxParticipants}
                </h2>
                <div className="ml-auto flex flex-wrap gap-2">
                    <button type="button" onClick={visio.toggleMic} className={`${button} ${visio.mic ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600 hover:bg-red-500'}`}>
                        {visio.mic ? <Mic className="h-4 w-4" aria-hidden="true" /> : <MicOff className="h-4 w-4" aria-hidden="true" />} {visio.mic ? 'Couper le micro' : 'Activer le micro'}
                    </button>
                    {visio.hasVideo && (
                        <button type="button" onClick={visio.toggleCam} className={`${button} ${visio.cam ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600 hover:bg-red-500'}`}>
                            {visio.cam ? <Video className="h-4 w-4" aria-hidden="true" /> : <VideoOff className="h-4 w-4" aria-hidden="true" />} {visio.cam ? 'Couper la caméra' : 'Activer la caméra'}
                        </button>
                    )}
                    <button type="button" onClick={() => setLarge(!large)} className={`${button} bg-white/10 hover:bg-white/20`}>
                        {large ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />} {large ? 'Réduire' : 'Agrandir'}
                    </button>
                    <button type="button" onClick={() => void visio.leave()} className={`${button} bg-white/10 hover:bg-white/20`}>
                        <PhoneOff className="h-4 w-4" aria-hidden="true" /> Masquer
                    </button>
                    {canConduct && (
                        <button type="button" onClick={() => void visio.endForAll()} className={`${button} bg-red-700 hover:bg-red-600`}>
                            Terminer pour tous
                        </button>
                    )}
                </div>
            </div>
            {count === 0 ? (
                <p className="text-sm text-neutral-300">En attente des membres à distance : ils rejoignent depuis leur page « Visioconférence ».</p>
            ) : (
                <ul className={`grid gap-2 ${large ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'}`}>
                    {visio.others.map((p) => (
                        <MeetingTile key={p.user_id} name={p.name} stream={visio.remoteStreams[p.user_id] ?? null} cam={p.cam} mic={p.mic} compact={!large} />
                    ))}
                    <MeetingTile name={me.name} stream={visio.localStream} muted cam={visio.cam && visio.hasVideo} mic={visio.mic} self compact={!large} />
                </ul>
            )}
        </section>
    );
}
