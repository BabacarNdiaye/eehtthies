import MeetingTile from '@/Components/Council/MeetingTile';
import useCouncilMeeting from '@/hooks/useCouncilMeeting';
import { Maximize2, Mic, MicOff, Minimize2, PhoneOff, Power, Video, VideoOff } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface Props {
    councilId: number;
    meeting: { id: number; type: string } | null;
    iceServers: RTCIceServer[];
    me: { id: number; name: string };
    canConduct: boolean;
    maxParticipants: number;
}

/** Bouton rond d'une commande d'appel : le nom est écrit pour les lecteurs d'écran et en infobulle. */
function Control({ label, onClick, active = true, danger = false, children }: { label: string; onClick: () => void; active?: boolean; danger?: boolean; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`flex h-10 w-10 items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-gold-400 ${
                danger ? 'bg-red-600 text-white hover:bg-red-500' : active ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-600/90 text-white hover:bg-red-500'
            }`}
        >
            {children}
        </button>
    );
}

/**
 * Visioconférence intégrée à l'écran de séance : les membres à distance apparaissent en bandeau collé en haut de l'écran,
 * si bien qu'on les voit toujours en faisant défiler les fiches, et que la salle les voit en même temps que l'élève
 * examiné quand l'écran est projeté (mode présentation). « Agrandir » donne plus de place aux images.
 */
export default function MeetingBand({ councilId, meeting: initialMeeting, iceServers, me, canConduct, maxParticipants }: Props) {
    const visio = useCouncilMeeting({ councilId, initialMeeting, iceServers, meId: me.id });
    const [large, setLarge] = useState(false);
    const pill = 'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-gold-400 disabled:opacity-60';

    if (visio.phase !== 'in') {
        if (!visio.meeting && !canConduct) return null;

        return (
            <section aria-label="Visioconférence" className="border-b border-white/10 bg-ink-900 px-4 py-2.5 text-sm text-ink-100">
                <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gold-300" aria-hidden="true">
                        <Video className="h-4 w-4" />
                    </span>
                    {visio.meeting ? (
                        <>
                            <span>
                                <span className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                                    En direct
                                </span>
                                {visio.participants.length} participant(s) à distance.
                            </span>
                            <button type="button" disabled={visio.phase === 'joining'} onClick={() => void visio.enter()} className={`${pill} bg-gold-500 text-ink-950 hover:bg-gold-400`}>
                                {visio.phase === 'joining' ? 'Connexion…' : 'Afficher les participants ici'}
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="text-ink-200">Des membres à distance ? Ouvrez la visioconférence : ils apparaîtront ici, en haut de l’écran ({maxParticipants} au plus).</span>
                            <button type="button" disabled={visio.phase === 'joining'} onClick={() => void visio.enter('video')} className={`${pill} bg-gold-500 text-ink-950 hover:bg-gold-400`}>
                                <Video className="h-4 w-4" aria-hidden="true" /> En vidéo
                            </button>
                            <button type="button" disabled={visio.phase === 'joining'} onClick={() => void visio.enter('audio')} className={`${pill} border border-white/15 bg-white/5 text-white hover:bg-white/15`}>
                                <Mic className="h-4 w-4" aria-hidden="true" /> Audio seulement
                            </button>
                        </>
                    )}
                    {visio.error && (
                        <p role="alert" className="basis-full text-red-300">
                            {visio.error}
                        </p>
                    )}
                </div>
            </section>
        );
    }

    const count = visio.others.length;

    return (
        <section aria-label="Visioconférence" className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/90 px-4 py-2.5 text-white shadow-elevated backdrop-blur-md">
            <p role="status" aria-live="polite" className="sr-only">
                {visio.notice}
            </p>
            <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                        En direct
                    </span>
                    <h2 className="text-sm font-semibold text-ink-100">
                        Visioconférence <span className="font-normal text-ink-400">· {visio.participants.length}/{maxParticipants}</span>
                    </h2>
                </div>

                {count === 0 ? (
                    <p className="min-w-0 flex-1 text-sm text-ink-300">En attente des membres à distance : ils rejoignent depuis leur page « Visioconférence ».</p>
                ) : (
                    <ul className={`min-w-0 flex-1 gap-2 ${large ? 'grid grid-cols-2 lg:grid-cols-4' : 'flex overflow-x-auto pb-0.5'}`}>
                        {visio.others.map((p) => (
                            <MeetingTile key={p.user_id} name={p.name} stream={visio.remoteStreams[p.user_id] ?? null} cam={p.cam} mic={p.mic} compact={!large} />
                        ))}
                        <MeetingTile name={me.name} stream={visio.localStream} muted cam={visio.cam && visio.hasVideo} mic={visio.mic} self compact={!large} />
                    </ul>
                )}

                <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Control label={visio.mic ? 'Couper le micro' : 'Activer le micro'} onClick={visio.toggleMic} active={visio.mic}>
                        {visio.mic ? <Mic className="h-4 w-4" aria-hidden="true" /> : <MicOff className="h-4 w-4" aria-hidden="true" />}
                    </Control>
                    {visio.hasVideo && (
                        <Control label={visio.cam ? 'Couper la caméra' : 'Activer la caméra'} onClick={visio.toggleCam} active={visio.cam}>
                            {visio.cam ? <Video className="h-4 w-4" aria-hidden="true" /> : <VideoOff className="h-4 w-4" aria-hidden="true" />}
                        </Control>
                    )}
                    <Control label={large ? 'Réduire les images' : 'Agrandir les images'} onClick={() => setLarge(!large)}>
                        {large ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
                    </Control>
                    <Control label="Masquer la visioconférence" onClick={() => void visio.leave()}>
                        <PhoneOff className="h-4 w-4" aria-hidden="true" />
                    </Control>
                    {canConduct && (
                        <Control label="Terminer la visioconférence pour tous" onClick={() => void visio.endForAll()} danger>
                            <Power className="h-4 w-4" aria-hidden="true" />
                        </Control>
                    )}
                </div>
            </div>
        </section>
    );
}
