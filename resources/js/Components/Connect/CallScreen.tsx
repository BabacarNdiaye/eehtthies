import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';

export interface CallInfo {
    id: number;
    conversation_id: number;
    type: 'audio' | 'video';
    status: 'ringing' | 'active' | 'ended' | 'declined' | 'missed' | 'cancelled';
    direction: 'outgoing' | 'incoming';
    other: { id: number; name: string; avatar: string | null } | null;
    answered_at: string | null;
    created_at: string;
}

type Phase = 'ringing' | 'connecting' | 'connected' | 'ended';

const END_LABELS: Record<string, string> = {
    declined: 'Appel refusé',
    missed: 'Pas de réponse',
    cancelled: 'Appel annulé',
    ended: 'Appel terminé',
};

/** Sonnerie générée (aucun fichier audio) : double bip répété. */
function useRingtone(active: boolean, kind: 'incoming' | 'outgoing') {
    useEffect(() => {
        if (!active) return;
        let ctx: AudioContext | null = null;
        try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            ctx = new AudioCtx();
        } catch {
            return;
        }
        const beep = () => {
            if (!ctx) return;
            const now = ctx.currentTime;
            const freqs = kind === 'incoming' ? [880, 1100] : [440, 440];
            freqs.forEach((f, i) => {
                const osc = ctx!.createOscillator();
                const gain = ctx!.createGain();
                osc.frequency.value = f;
                gain.gain.setValueAtTime(0.0001, now + i * 0.25);
                gain.gain.exponentialRampToValueAtTime(kind === 'incoming' ? 0.25 : 0.08, now + i * 0.25 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.25 + 0.22);
                osc.connect(gain).connect(ctx!.destination);
                osc.start(now + i * 0.25);
                osc.stop(now + i * 0.25 + 0.25);
            });
        };
        beep();
        const id = setInterval(beep, kind === 'incoming' ? 1800 : 3000);
        return () => {
            clearInterval(id);
            ctx?.close().catch(() => undefined);
        };
    }, [active, kind]);
}

function mediaError(e: unknown): string {
    const name = (e as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return "Accès au micro/à la caméra refusé. Autorisez-le dans votre navigateur puis réessayez.";
    if (name === 'NotFoundError') return 'Aucun micro ou caméra détecté sur cet appareil.';
    if (!window.isSecureContext) return 'Les appels nécessitent une connexion sécurisée (https).';
    return "Impossible d'accéder au micro ou à la caméra.";
}

/**
 * Écran d'appel EEHT Connect : sonnerie, décrocher/refuser, puis
 * communication audio/vidéo WebRTC pair à pair. La mise en relation (offre,
 * réponse, candidats ICE) passe par l'API, interrogée chaque seconde.
 */
export default function CallScreen({
    initialCall,
    iceServers,
    onClose,
}: {
    initialCall: CallInfo;
    iceServers: RTCIceServer[];
    onClose: () => void;
}) {
    const [call, setCall] = useState<CallInfo>(initialCall);
    const [phase, setPhase] = useState<Phase>(initialCall.status === 'active' ? 'connecting' : 'ringing');
    const [error, setError] = useState<string | null>(null);
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [withVideo, setWithVideo] = useState(initialCall.type === 'video');
    const [elapsed, setElapsed] = useState(0);
    const [remoteHasVideo, setRemoteHasVideo] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream>(new MediaStream());
    const localVideo = useRef<HTMLVideoElement>(null);
    const remoteVideo = useRef<HTMLVideoElement>(null);
    const remoteAudio = useRef<HTMLAudioElement>(null);
    const lastSignal = useRef(0);
    const offerSent = useRef(false);
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
    const closed = useRef(false);
    const connectedAt = useRef<number | null>(null);

    const outgoing = call.direction === 'outgoing';
    const isRingingIncoming = phase === 'ringing' && !outgoing;

    useRingtone(phase === 'ringing', outgoing ? 'outgoing' : 'incoming');

    const sendSignal = useCallback(
        (type: 'offer' | 'answer' | 'candidate', payload: unknown) =>
            window.axios.post(route('connect.calls.signal', call.id), { type, payload: JSON.stringify(payload) }).catch(() => undefined),
        [call.id],
    );

    const cleanup = useCallback(() => {
        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
        pcRef.current?.close();
        pcRef.current = null;
        localStream.current?.getTracks().forEach((t) => t.stop());
        localStream.current = null;
    }, []);

    const finish = useCallback(
        (status: string) => {
            if (closed.current) return;
            closed.current = true;
            cleanup();
            setPhase('ended');
            setError((e) => e ?? END_LABELS[status] ?? 'Appel terminé');
            setTimeout(onClose, 1800);
        },
        [cleanup, onClose],
    );

    const getMedia = useCallback(async (video: boolean) => {
        const audio = { echoCancellation: true, noiseSuppression: true };
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio,
                video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
            });
        } catch (e) {
            // Pas de caméra (ou caméra refusée) : l'appel vidéo continue en audio.
            if (!video) throw e;
            stream = await navigator.mediaDevices.getUserMedia({ audio });
            setWithVideo(false);
            setError('Caméra indisponible : appel en audio seulement.');
        }
        localStream.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        return stream;
    }, []);

    const createPeer = useCallback(
        (stream: MediaStream) => {
            const pc = new RTCPeerConnection({ iceServers });
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));
            pc.ontrack = (e) => {
                e.streams[0]?.getTracks().forEach((t) => {
                    if (!remoteStream.current.getTracks().includes(t)) remoteStream.current.addTrack(t);
                });
                if (e.track.kind === 'video') setRemoteHasVideo(true);
                if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream.current;
                if (remoteAudio.current) {
                    remoteAudio.current.srcObject = remoteStream.current;
                    remoteAudio.current.play().catch(() => undefined);
                }
            };
            pc.onicecandidate = (e) => e.candidate && sendSignal('candidate', e.candidate.toJSON());
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') {
                    connectedAt.current ??= Date.now();
                    setPhase('connected');
                    setError(null);
                }
                if (pc.connectionState === 'failed') {
                    setError('Connexion impossible entre les deux appareils (réseau trop restrictif).');
                }
            };
            pcRef.current = pc;
            return pc;
        },
        [iceServers, sendSignal],
    );

    const flushCandidates = async (pc: RTCPeerConnection) => {
        for (const c of pendingCandidates.current.splice(0)) {
            await pc.addIceCandidate(c).catch(() => undefined);
        }
    };

    // Appel sortant : micro/caméra ouverts dès la sonnerie.
    useEffect(() => {
        if (!outgoing) return;
        getMedia(call.type === 'video')
            .then((stream) => createPeer(stream))
            .catch((e) => {
                setError(mediaError(e));
                window.axios.post(route('connect.calls.hangup', call.id)).catch(() => undefined);
                finish('cancelled');
            });
        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Interrogation : état de l'appel et messages de mise en relation.
    useEffect(() => {
        const id = setInterval(async () => {
            if (closed.current) return;
            try {
                const res = await window.axios.get(route('connect.calls.show', call.id), { params: { after: lastSignal.current } });
                const next: CallInfo = res.data.call;
                setCall(next);

                if (!['ringing', 'active'].includes(next.status)) {
                    finish(next.status);
                    return;
                }

                const pc = pcRef.current;

                // L'appelé a décroché : l'appelant envoie son offre.
                if (outgoing && next.status === 'active' && pc && !offerSent.current) {
                    offerSent.current = true;
                    setPhase('connecting');
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    sendSignal('offer', offer);
                }

                for (const s of res.data.signals as { id: number; type: string; payload: string }[]) {
                    const peer = pcRef.current;
                    if (!peer) break; // connexion pas encore prête : relu au prochain passage
                    lastSignal.current = Math.max(lastSignal.current, s.id);
                    const payload = JSON.parse(s.payload);

                    if (s.type === 'offer') {
                        await peer.setRemoteDescription(payload);
                        await flushCandidates(peer);
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        sendSignal('answer', answer);
                    } else if (s.type === 'answer') {
                        await peer.setRemoteDescription(payload);
                        await flushCandidates(peer);
                    } else if (s.type === 'candidate') {
                        if (peer.remoteDescription) await peer.addIceCandidate(payload).catch(() => undefined);
                        else pendingCandidates.current.push(payload);
                    }
                }
            } catch {
                // Erreur réseau passagère : on réessaie à la seconde suivante.
            }
        }, 1000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [call.id]);

    // Aperçu de ma caméra (l'élément vidéo apparaît après avoir décroché en vidéo).
    useEffect(() => {
        if (withVideo && localVideo.current && localStream.current && localVideo.current.srcObject !== localStream.current) {
            localVideo.current.srcObject = localStream.current;
        }
    });

    // Chronomètre.
    useEffect(() => {
        if (phase !== 'connected') return;
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - (connectedAt.current ?? Date.now())) / 1000)), 1000);
        return () => clearInterval(id);
    }, [phase]);

    // Raccrocher proprement si la page est fermée pendant l'appel.
    useEffect(() => {
        const onUnload = () => {
            if (closed.current) return;
            // keepalive : la requête part même si l'onglet se ferme.
            const xsrf = decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1] ?? '');
            fetch(route('connect.calls.hangup', call.id), {
                method: 'POST',
                keepalive: true,
                credentials: 'same-origin',
                headers: { 'X-XSRF-TOKEN': xsrf, 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
            }).catch(() => undefined);
        };
        window.addEventListener('pagehide', onUnload);
        return () => window.removeEventListener('pagehide', onUnload);
    }, [call.id]);

    const accept = async (video: boolean) => {
        setWithVideo(video);
        setPhase('connecting');
        try {
            const stream = await getMedia(video);
            createPeer(stream);
            await window.axios.post(route('connect.calls.answer', call.id));
        } catch (e) {
            const status = (e as { response?: { status?: number } }).response?.status;
            setError(status ? 'Cet appel n’est plus disponible.' : mediaError(e));
            window.axios.post(route('connect.calls.decline', call.id)).catch(() => undefined);
            finish('cancelled');
        }
    };

    const decline = () => {
        window.axios.post(route('connect.calls.decline', call.id)).catch(() => undefined);
        finish('declined');
    };

    const hangup = () => {
        window.axios.post(route('connect.calls.hangup', call.id)).catch(() => undefined);
        finish('ended');
    };

    const toggleMute = () => {
        localStream.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
        setMuted(!muted);
    };

    const toggleCamera = () => {
        localStream.current?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
        setCameraOff(!cameraOff);
    };

    const name = call.other?.name ?? 'Correspondant';
    const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    const statusText =
        phase === 'ended'
            ? error
            : phase === 'connected'
              ? clock
              : phase === 'connecting'
                ? 'Connexion…'
                : outgoing
                  ? 'Sonnerie…'
                  : call.type === 'video'
                    ? 'Appel vidéo entrant'
                    : 'Appel vocal entrant';
    const showRemoteVideo = remoteHasVideo && phase === 'connected';
    const roundButton = 'flex h-14 w-14 items-center justify-center rounded-full transition';

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-gradient-to-b from-ink-900 to-ink-950 text-white" role="dialog" aria-label={`Appel avec ${name}`}>
            <audio ref={remoteAudio} autoPlay playsInline className="hidden" />

            {/* Vidéo de l'interlocuteur en plein écran */}
            <video
                ref={remoteVideo}
                autoPlay
                playsInline
                className={`absolute inset-0 h-full w-full bg-black object-cover transition-opacity ${showRemoteVideo ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Ma caméra en incrustation */}
            {withVideo && phase !== 'ended' && !isRingingIncoming && (
                <video
                    ref={localVideo}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute right-4 top-4 z-10 h-40 w-28 rounded-2xl border-2 border-white/30 bg-black object-cover shadow-elevated sm:h-48 sm:w-36 ${
                        cameraOff ? 'opacity-30' : ''
                    }`}
                    style={{ transform: 'scaleX(-1)' }}
                />
            )}

            <div className={`relative z-0 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center ${showRemoteVideo ? 'justify-start pt-10' : ''}`}>
                {!showRemoteVideo && (
                    <span className={`rounded-full ${phase === 'ringing' ? 'animate-pulse ring-8 ring-gold-500/30' : ''}`}>
                        <Avatar name={name} src={call.other?.avatar} size="lg" />
                    </span>
                )}
                <p className="font-serif text-2xl font-bold drop-shadow">{name}</p>
                <p className={`text-sm drop-shadow ${phase === 'ended' ? 'text-gold-300' : 'text-white/80'}`}>{statusText}</p>
                {error && phase !== 'ended' && <p className="max-w-sm rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-100">{error}</p>}
            </div>

            <div className="relative z-10 flex items-center justify-center gap-6 pb-12 pt-6" style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}>
                {isRingingIncoming ? (
                    <>
                        <div className="flex flex-col items-center gap-2">
                            <button onClick={decline} className={`${roundButton} bg-red-600 hover:bg-red-700`} aria-label="Refuser">
                                <PhoneOff className="h-6 w-6" />
                            </button>
                            <span className="text-xs text-white/80">Refuser</span>
                        </div>
                        {call.type === 'video' && (
                            <div className="flex flex-col items-center gap-2">
                                <button onClick={() => accept(false)} className={`${roundButton} bg-white/15 hover:bg-white/25`} aria-label="Répondre sans caméra">
                                    <Phone className="h-6 w-6" />
                                </button>
                                <span className="text-xs text-white/80">Sans caméra</span>
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={() => accept(call.type === 'video')}
                                className={`${roundButton} animate-pulse bg-emerald-500 hover:bg-emerald-600`}
                                aria-label="Décrocher"
                            >
                                {call.type === 'video' ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
                            </button>
                            <span className="text-xs text-white/80">Décrocher</span>
                        </div>
                    </>
                ) : phase !== 'ended' ? (
                    <>
                        <button onClick={toggleMute} className={`${roundButton} ${muted ? 'bg-white text-ink-900' : 'bg-white/15 hover:bg-white/25'}`} aria-label={muted ? 'Réactiver le micro' : 'Couper le micro'}>
                            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                        </button>
                        {withVideo && (
                            <button onClick={toggleCamera} className={`${roundButton} ${cameraOff ? 'bg-white text-ink-900' : 'bg-white/15 hover:bg-white/25'}`} aria-label={cameraOff ? 'Réactiver la caméra' : 'Couper la caméra'}>
                                {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                            </button>
                        )}
                        <button onClick={hangup} className={`${roundButton} bg-red-600 hover:bg-red-700`} aria-label="Raccrocher">
                            <PhoneOff className="h-6 w-6" />
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
