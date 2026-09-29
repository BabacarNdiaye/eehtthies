import {
    AlarmClock,
    BellOff,
    ChevronDown,
    Circle,
    Lock,
    Maximize2,
    MessageSquare,
    Mic,
    MicOff,
    Minimize2,
    MonitorUp,
    Phone,
    PhoneOff,
    SwitchCamera,
    UserRound,
    Video,
    VideoOff,
    Volume1,
    Volume2,
    X,
} from 'lucide-react';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

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

/** État partagé avec l'interlocuteur (message « state » de mise en relation). */
interface PeerState {
    muted: boolean;
    video: boolean;
    screen: boolean;
    recording: boolean;
}

const END_LABELS: Record<string, string> = {
    declined: 'Appel refusé',
    missed: 'Pas de réponse',
    cancelled: 'Appel annulé',
    ended: 'Appel terminé',
};

const QUICK_REPLIES = ['Je ne peux pas répondre pour le moment.', 'Je vous rappelle dans quelques minutes.', 'Je suis en cours, écrivez-moi.', "J'arrive."];

const isTouchDevice = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

/** Retire la notification « sonnerie » de cet appel (écran verrouillé, centre de notifications). */
export function closeCallNotification(callId: number) {
    navigator.serviceWorker
        ?.getRegistration()
        .then((reg) => reg?.getNotifications({ tag: `call-${callId}` }))
        .then((list) => list?.forEach((n) => n.close()))
        .catch(() => undefined);
}

/** Sonnerie générée (aucun fichier audio) : double bip répété, avec vibration pour un appel entrant. */
export function useRingtone(active: boolean, kind: 'incoming' | 'outgoing') {
    useEffect(() => {
        if (!active) return;
        let ctx: AudioContext | null = null;
        try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            ctx = new AudioCtx();
        } catch {
            ctx = null;
        }
        const beep = () => {
            if (kind === 'incoming') navigator.vibrate?.([600, 250, 600]);
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
            if (kind === 'incoming') navigator.vibrate?.(0);
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

function formatClock(seconds: number) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(seconds / 3600))} : ${pad(Math.floor((seconds % 3600) / 60))} : ${pad(seconds % 60)}`;
}

/** Bouton de la grille de commandes (icône au trait + libellé, comme sur un téléphone). */
function ControlButton({
    icon,
    label,
    onClick,
    active = false,
    disabled = false,
    danger = false,
}: {
    icon: ReactNode;
    label: string;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            className="group flex flex-col items-center gap-2 text-white disabled:opacity-35"
        >
            <span
                className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
                    danger ? 'bg-red-500 text-white group-hover:bg-red-600' : active ? 'bg-white text-neutral-900' : 'group-hover:bg-white/10'
                }`}
            >
                {icon}
            </span>
            <span className="text-[11px] font-medium text-white/85">{label}</span>
        </button>
    );
}

/**
 * Écran d'appel EEHT Connect (présentation d'un téléphone : sonnerie avec
 * Silencieux / Messages / Rappel, puis grille de commandes pendant l'appel).
 * Communication audio/vidéo WebRTC pair à pair ; la mise en relation (offre,
 * réponse, candidats ICE, état micro/caméra) passe par l'API, interrogée
 * chaque seconde.
 */
export default function CallScreen({
    initialCall,
    iceServers,
    onClose,
    autoAnswer = false,
    onOpenConversation,
    onShowProfile,
}: {
    initialCall: CallInfo;
    iceServers: RTCIceServer[];
    onClose: () => void;
    autoAnswer?: boolean;
    onOpenConversation?: (id: number) => void;
    onShowProfile?: (conversationId: number) => void;
}) {
    const touch = isTouchDevice();
    const [call, setCall] = useState<CallInfo>(initialCall);
    const [phase, setPhase] = useState<Phase>(initialCall.status === 'active' ? 'connecting' : 'ringing');
    const [error, setError] = useState<string | null>(null);
    const [muted, setMuted] = useState(false);
    const [videoOn, setVideoOn] = useState(false);
    const [facing, setFacing] = useState<'user' | 'environment'>('user');
    const [cameraCount, setCameraCount] = useState(0);
    const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
    // Haut-parleur : activé d'office en vidéo et sur ordinateur, désactivable à tout moment.
    const [speakerOn, setSpeakerOn] = useState(initialCall.type === 'video' || !touch);
    const [sharing, setSharing] = useState(false);
    const [recording, setRecording] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [silenced, setSilenced] = useState(false);
    const [sheet, setSheet] = useState<'replies' | 'remind' | null>(null);
    const [needsTap, setNeedsTap] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [remoteHasVideo, setRemoteHasVideo] = useState(false);
    const [remote, setRemote] = useState<PeerState | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteStream = useRef<MediaStream>(new MediaStream());
    const localVideo = useRef<HTMLVideoElement>(null);
    const remoteVideo = useRef<HTMLVideoElement>(null);
    const remoteAudio = useRef<HTMLAudioElement>(null);
    const screenTrack = useRef<MediaStreamTrack | null>(null);
    const recorder = useRef<{ rec: MediaRecorder; ctx: AudioContext } | null>(null);
    const lastSignal = useRef(0);
    const offerSent = useRef(false);
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
    const closed = useRef(false);
    const connectedAt = useRef<number | null>(null);

    const outgoing = call.direction === 'outgoing';
    const isRingingIncoming = phase === 'ringing' && !outgoing;
    const canShare = !touch && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices;
    const name = call.other?.name ?? 'Correspondant';

    useRingtone(phase === 'ringing' && !silenced && !(isRingingIncoming && sheet !== null), outgoing ? 'outgoing' : 'incoming');

    const sendSignal = useCallback(
        (type: 'offer' | 'answer' | 'candidate' | 'state', payload: unknown) =>
            window.axios.post(route('connect.calls.signal', call.id), { type, payload: JSON.stringify(payload) }).catch(() => undefined),
        [call.id],
    );

    const refreshDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setOutputs(devices.filter((d) => d.kind === 'audiooutput'));
            setCameraCount(devices.filter((d) => d.kind === 'videoinput').length);
        } catch {
            // Liste indisponible : les commandes correspondantes restent simplifiées.
        }
    }, []);

    const stopRecording = useCallback(() => {
        const current = recorder.current;
        recorder.current = null;
        if (current && current.rec.state !== 'inactive') current.rec.stop();
        setRecording(false);
    }, []);

    const cleanup = useCallback(() => {
        stopRecording();
        screenTrack.current?.stop();
        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
        pcRef.current?.close();
        pcRef.current = null;
        localStream.current?.getTracks().forEach((t) => t.stop());
        localStream.current = null;
    }, [stopRecording]);

    const finish = useCallback(
        (status: string) => {
            if (closed.current) return;
            closed.current = true;
            closeCallNotification(call.id);
            cleanup();
            setPhase('ended');
            setMinimized(false);
            setError((e) => e ?? END_LABELS[status] ?? 'Appel terminé');
            setTimeout(onClose, 1800);
        },
        [call.id, cleanup, onClose],
    );

    const getMedia = useCallback(
        async (video: boolean) => {
            const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
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
                setError('Caméra indisponible : appel en audio seulement.');
            }
            localStream.current = stream;
            setVideoOn(stream.getVideoTracks().length > 0);
            if (localVideo.current) localVideo.current.srcObject = stream;
            refreshDevices();
            return stream;
        },
        [refreshDevices],
    );

    /** Émetteur vidéo de la connexion (présent même en appel vocal, pour activer la caméra en cours d'appel). */
    const videoSender = () => {
        const transceivers = (pcRef.current?.getTransceivers() ?? []).filter((t) => t.receiver.track?.kind === 'video');
        return (transceivers.find((t) => t.mid !== null) ?? transceivers[0])?.sender ?? null;
    };

    const createPeer = useCallback(
        (stream: MediaStream) => {
            const pc = new RTCPeerConnection({ iceServers });
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));
            // Appel vocal : une voie vidéo est réservée pour pouvoir passer en vidéo sans renégocier.
            if (outgoing && stream.getVideoTracks().length === 0) {
                pc.addTransceiver('video', { direction: 'sendrecv', streams: [stream] });
            }
            pc.ontrack = (e) => {
                (e.streams[0]?.getTracks() ?? [e.track]).forEach((t) => {
                    if (!remoteStream.current.getTracks().includes(t)) remoteStream.current.addTrack(t);
                });
                if (e.track.kind === 'video') setRemoteHasVideo(initialCall.type === 'video');
                if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream.current;
                if (remoteAudio.current) {
                    remoteAudio.current.srcObject = remoteStream.current;
                    remoteAudio.current.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
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
        [iceServers, sendSignal, outgoing, initialCall.type],
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
                        // Voie vidéo en émission/réception même si l'on a répondu sans caméra.
                        peer.getTransceivers().forEach((t) => {
                            if (t.receiver.track?.kind === 'video' && t.direction === 'recvonly') t.direction = 'sendrecv';
                        });
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
                    } else if (s.type === 'state') {
                        setRemote(payload as PeerState);
                    }
                }
            } catch {
                // Erreur réseau passagère : on réessaie à la seconde suivante.
            }
        }, 1000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [call.id]);

    // Mon état (micro, caméra, partage, enregistrement) est transmis à l'interlocuteur.
    useEffect(() => {
        if (phase !== 'connected') return;
        sendSignal('state', { muted, video: videoOn || sharing, screen: sharing, recording } satisfies PeerState);
    }, [phase, muted, videoOn, sharing, recording, sendSignal]);

    // Aperçu de ma caméra.
    useEffect(() => {
        if (localVideo.current && localStream.current && localVideo.current.srcObject !== localStream.current) {
            localVideo.current.srcObject = localStream.current;
        }
    });

    // Sortie audio : haut-parleur ou écouteur.
    useEffect(() => {
        const el = remoteAudio.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
        if (!el) return;
        const pick = speakerOn
            ? (outputs.find((d) => /speaker|haut-parleur/i.test(d.label)) ?? outputs.find((d) => d.deviceId === 'default'))
            : outputs.find((d) => /earpiece|écouteur|ecouteur|receiver|combiné|handset|headset|headphone|casque/i.test(d.label));
        if (typeof el.setSinkId === 'function' && outputs.length > 1 && pick) {
            el.volume = 1;
            el.setSinkId(pick.deviceId).catch(() => (el.volume = speakerOn ? 1 : 0.3));
        } else {
            // Navigateur sans choix de sortie : volume réduit, comme un combiné.
            el.volume = speakerOn ? 1 : 0.3;
        }
    }, [speakerOn, outputs]);

    useEffect(() => {
        navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
        return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
    }, [refreshDevices]);

    // L'écran reste allumé pendant l'appel.
    useEffect(() => {
        if (phase !== 'connected' && phase !== 'connecting') return;
        type Lock = { release: () => Promise<void> };
        let lock: Lock | null = null;
        const request = () => {
            const wakeLock = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Lock> } }).wakeLock;
            if (document.visibilityState === 'visible') wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
        };
        request();
        document.addEventListener('visibilitychange', request);
        return () => {
            document.removeEventListener('visibilitychange', request);
            lock?.release().catch(() => undefined);
        };
    }, [phase]);

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

    const accept = async (video: boolean, fromNotification = false) => {
        closeCallNotification(call.id);
        setPhase('connecting');
        setSheet(null);
        try {
            const stream = await getMedia(video);
            createPeer(stream);
            await window.axios.post(route('connect.calls.answer', call.id));
        } catch (e) {
            const status = (e as { response?: { status?: number } }).response?.status;
            if (!status && fromNotification) {
                // Ouvert depuis la notification : on laisse la personne décrocher d'un geste.
                cleanup();
                setPhase('ringing');
                return;
            }
            setError(status ? 'Cet appel n’est plus disponible.' : mediaError(e));
            window.axios.post(route('connect.calls.decline', call.id)).catch(() => undefined);
            finish('cancelled');
        }
    };

    // « Répondre » depuis la notification : décroche directement.
    useEffect(() => {
        if (autoAnswer && isRingingIncoming) accept(call.type === 'video', true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const decline = (remindIn?: number) => {
        window.axios.post(route('connect.calls.decline', call.id), remindIn ? { remind_in: remindIn } : {}).catch(() => undefined);
        if (remindIn) setError(remindIn >= 60 ? 'Rappel programmé dans 1 heure' : `Rappel programmé dans ${remindIn} minutes`);
        finish('declined');
    };

    const replyWithMessage = (body: string) => {
        window.axios.post(route('connect.send', call.conversation_id), { body }).catch(() => undefined);
        setError('Message envoyé');
        decline();
    };

    const hangup = () => {
        window.axios.post(route('connect.calls.hangup', call.id)).catch(() => undefined);
        finish('ended');
    };

    const toggleMute = () => {
        localStream.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
        setMuted(!muted);
    };

    const openCamera = (mode: 'user' | 'environment') =>
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } } }).then((s) => s.getVideoTracks()[0]);

    const swapLocalVideoTrack = (track: MediaStreamTrack | null) => {
        const stream = localStream.current;
        if (!stream) return;
        stream.getVideoTracks().forEach((t) => {
            t.stop();
            stream.removeTrack(t);
        });
        if (track) stream.addTrack(track);
        if (!sharing) videoSender()?.replaceTrack(track).catch(() => undefined);
        if (localVideo.current) localVideo.current.srcObject = stream;
    };

    /** Active ou coupe la caméra (y compris pour passer un appel vocal en vidéo). */
    const toggleVideo = async () => {
        if (videoOn) {
            swapLocalVideoTrack(null);
            setVideoOn(false);
            return;
        }
        try {
            const track = await openCamera(facing);
            swapLocalVideoTrack(track);
            setVideoOn(true);
            setError(null);
            refreshDevices();
        } catch (e) {
            setError(mediaError(e));
        }
    };

    /** Caméra avant ↔ caméra arrière. */
    const flipCamera = async () => {
        if (!videoOn) return;
        const next = facing === 'user' ? 'environment' : 'user';
        // Beaucoup de téléphones n'ouvrent qu'une caméra à la fois : on libère d'abord l'actuelle.
        swapLocalVideoTrack(null);
        try {
            swapLocalVideoTrack(await openCamera(next));
            setFacing(next);
        } catch {
            const previous = await openCamera(facing).catch(() => null);
            swapLocalVideoTrack(previous);
            if (!previous) setVideoOn(false);
        }
    };

    const stopSharing = () => {
        screenTrack.current?.stop();
        screenTrack.current = null;
        setSharing(false);
        videoSender()
            ?.replaceTrack(localStream.current?.getVideoTracks()[0] ?? null)
            .catch(() => undefined);
    };

    const toggleShare = async () => {
        if (sharing) return stopSharing();
        try {
            const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const track = display.getVideoTracks()[0];
            screenTrack.current = track;
            track.onended = stopSharing;
            await videoSender()?.replaceTrack(track);
            setSharing(true);
        } catch {
            // Partage annulé.
        }
    };

    /** Enregistrement audio de l'appel (les deux voix), téléchargé à la fin. L'interlocuteur en est averti. */
    const toggleRecording = () => {
        if (recording) return stopRecording();
        try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioCtx();
            const dest = ctx.createMediaStreamDestination();
            [localStream.current, remoteStream.current].forEach((s) => {
                const tracks = s?.getAudioTracks() ?? [];
                if (tracks.length) ctx.createMediaStreamSource(new MediaStream(tracks)).connect(dest);
            });
            const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m));
            const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined);
            const chunks: Blob[] = [];
            rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
            rec.onstop = () => {
                ctx.close().catch(() => undefined);
                const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `appel-${name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'}`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 10000);
            };
            rec.start(1000);
            recorder.current = { rec, ctx };
            setRecording(true);
        } catch {
            setError("L'enregistrement n'est pas pris en charge par ce navigateur.");
        }
    };

    const minimizeTo = (action?: 'chat' | 'profile') => {
        setMinimized(true);
        if (action === 'chat') onOpenConversation?.(call.conversation_id);
        if (action === 'profile') onShowProfile?.(call.conversation_id);
    };

    const showRemoteVideo = phase === 'connected' && (remote ? remote.video : remoteHasVideo);
    const showLocalVideo = (videoOn || sharing) && phase !== 'ended' && !isRingingIncoming;
    const statusText =
        phase === 'ended'
            ? error
            : phase === 'connected'
              ? call.type === 'video' || videoOn || showRemoteVideo
                  ? 'Appel vidéo · EEHT Connect'
                  : 'Appel vocal · EEHT Connect'
              : phase === 'connecting'
                ? 'Connexion…'
                : outgoing
                  ? 'Sonnerie…'
                  : call.type === 'video'
                    ? 'Appel vidéo entrant'
                    : 'Appel vocal entrant';

    const bigAvatar = call.other?.avatar ? (
        <img src={call.other.avatar} alt="" className="h-32 w-32 rounded-full object-cover shadow-elevated" />
    ) : (
        <span className="flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-elevated">
            <UserRound className="h-16 w-16 text-neutral-400" strokeWidth={1.5} />
        </span>
    );

    return (
        <>
            {/* Toujours monté : le son continue quand l'écran d'appel est réduit. */}
            <audio ref={remoteAudio} autoPlay playsInline className="hidden" />

            {minimized && phase !== 'ended' && (
                <div className="fixed left-1/2 top-3 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full bg-emerald-600 py-1.5 pl-4 pr-1.5 text-white shadow-elevated">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    <button onClick={() => setMinimized(false)} className="flex items-center gap-2 text-sm font-semibold">
                        <span className="max-w-[9rem] truncate">{name}</span>
                        <span className="font-normal tabular-nums text-white/90">{phase === 'connected' ? formatClock(elapsed).replace(/ /g, '') : 'Connexion…'}</span>
                        <Maximize2 className="h-4 w-4" />
                    </button>
                    <button onClick={hangup} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 hover:bg-red-600" aria-label="Raccrocher">
                        <PhoneOff className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div
                className={`fixed inset-0 z-[70] flex flex-col overflow-hidden bg-gradient-to-b from-neutral-800 via-neutral-900 to-black text-white ${minimized && phase !== 'ended' ? 'hidden' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={`Appel avec ${name}`}
            >
                {/* Vidéo de l'interlocuteur en plein écran */}
                <video
                    ref={remoteVideo}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 h-full w-full bg-black transition-opacity ${remote?.screen ? 'object-contain' : 'object-cover'} ${
                        showRemoteVideo ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                {showRemoteVideo && <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 to-transparent" />}

                {/* Ma caméra en incrustation */}
                <video
                    ref={localVideo}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute right-4 top-16 z-10 h-40 w-28 rounded-2xl border-2 border-white/30 bg-black object-cover shadow-elevated sm:h-48 sm:w-36 ${
                        showLocalVideo && !sharing ? '' : 'hidden'
                    }`}
                    style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
                />
                {sharing && (
                    <span className="absolute right-4 top-16 z-10 flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold">
                        <MonitorUp className="h-3.5 w-3.5" /> Vous partagez votre écran
                    </span>
                )}

                {/* Barre du haut */}
                <div className="relative z-10 flex items-center justify-between px-4 pt-4" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
                    {phase !== 'ended' && !isRingingIncoming ? (
                        <button onClick={() => minimizeTo()} className="rounded-full p-2 text-white/80 hover:bg-white/10" aria-label="Réduire l'appel">
                            <ChevronDown className="h-6 w-6" />
                        </button>
                    ) : (
                        <span className="w-10" />
                    )}
                    <span className="flex items-center gap-1.5 text-[11px] text-white/60">
                        <Lock className="h-3 w-3" /> Chiffré de bout en bout
                    </span>
                    <span className="w-10" />
                </div>

                {/* Identité, statut, durée */}
                <div className={`relative z-0 flex flex-col items-center px-6 text-center ${showRemoteVideo ? 'pt-2' : 'pt-10 sm:pt-16'}`}>
                    {!showRemoteVideo && (
                        <span className={`mb-6 rounded-full ${phase === 'ringing' ? 'animate-pulse ring-[10px] ring-white/10' : ''}`}>{bigAvatar}</span>
                    )}
                    <p className="text-3xl font-light tracking-wide drop-shadow">{name}</p>
                    <p className={`mt-1 text-sm drop-shadow ${phase === 'ended' ? 'text-amber-300' : 'text-sky-400'}`}>{statusText}</p>
                    {phase === 'connected' && <p className="mt-5 text-4xl font-light tabular-nums tracking-wider drop-shadow">{formatClock(elapsed)}</p>}

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {remote?.muted && phase === 'connected' && (
                            <span className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs">
                                <MicOff className="h-3.5 w-3.5" /> {name} a coupé son micro
                            </span>
                        )}
                        {remote?.recording && phase === 'connected' && (
                            <span className="flex items-center gap-1.5 rounded-full bg-red-600/80 px-3 py-1 text-xs font-semibold">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {name} enregistre l'appel
                            </span>
                        )}
                        {recording && (
                            <span className="flex items-center gap-1.5 rounded-full bg-red-600/80 px-3 py-1 text-xs font-semibold">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Enregistrement en cours
                            </span>
                        )}
                        {needsTap && (
                            <button
                                onClick={() => remoteAudio.current?.play().then(() => setNeedsTap(false)).catch(() => undefined)}
                                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900"
                            >
                                <Volume2 className="h-3.5 w-3.5" /> Touchez pour activer le son
                            </button>
                        )}
                    </div>
                    {error && phase !== 'ended' && <p className="mt-3 max-w-sm rounded-lg bg-red-500/25 px-3 py-2 text-xs text-red-100">{error}</p>}
                </div>

                <div className="flex-1" />

                {isRingingIncoming ? (
                    <div className="relative z-10 px-8" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
                        {/* Silencieux / Messages / Rappel */}
                        <div className="mx-auto mb-12 grid max-w-xs grid-cols-3 gap-4">
                            <ControlButton icon={<BellOff className="h-7 w-7" strokeWidth={1.4} />} label="Silencieux" active={silenced} onClick={() => setSilenced(!silenced)} />
                            <ControlButton icon={<MessageSquare className="h-7 w-7" strokeWidth={1.4} />} label="Messages" active={sheet === 'replies'} onClick={() => setSheet(sheet === 'replies' ? null : 'replies')} />
                            <ControlButton icon={<AlarmClock className="h-7 w-7" strokeWidth={1.4} />} label="Rappel" active={sheet === 'remind'} onClick={() => setSheet(sheet === 'remind' ? null : 'remind')} />
                        </div>

                        {sheet && (
                            <div className="mx-auto -mt-8 mb-8 max-w-sm overflow-hidden rounded-2xl bg-neutral-700/90 text-sm backdrop-blur">
                                {sheet === 'replies'
                                    ? QUICK_REPLIES.map((r) => (
                                          <button key={r} onClick={() => replyWithMessage(r)} className="block w-full border-b border-white/10 px-4 py-3 text-left last:border-0 hover:bg-white/10">
                                              {r}
                                          </button>
                                      ))
                                    : [
                                          [10, 'Dans 10 minutes'],
                                          [60, 'Dans 1 heure'],
                                      ].map(([min, label]) => (
                                          <button key={min} onClick={() => decline(min as number)} className="block w-full border-b border-white/10 px-4 py-3 text-left last:border-0 hover:bg-white/10">
                                              ⏰ Me le rappeler {String(label).toLowerCase()}
                                          </button>
                                      ))}
                            </div>
                        )}

                        <div className="mx-auto flex max-w-xs items-start justify-between">
                            <div className="flex flex-col items-center gap-2">
                                <button onClick={() => decline()} className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 hover:bg-white/10" aria-label="Refuser">
                                    <X className="h-8 w-8" strokeWidth={1.5} />
                                </button>
                                <span className="text-xs text-white/80">Refuser</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={() => accept(call.type === 'video')}
                                    className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
                                    aria-label="Décrocher"
                                >
                                    {call.type === 'video' ? <Video className="h-7 w-7" fill="currentColor" /> : <Phone className="h-7 w-7" fill="currentColor" />}
                                </button>
                                <span className="text-xs text-white/80">Décrocher</span>
                                {call.type === 'video' && (
                                    <button onClick={() => accept(false)} className="text-[11px] text-sky-400 underline-offset-2 hover:underline">
                                        Sans caméra
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : phase !== 'ended' ? (
                    <div
                        className={`relative z-10 mx-3 mb-3 rounded-[2rem] px-4 pb-6 pt-7 backdrop-blur-md sm:mx-auto sm:w-[26rem] ${showRemoteVideo ? 'bg-black/45' : 'bg-neutral-600/60'}`}
                        style={{ marginBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
                    >
                        <div className="grid grid-cols-3 gap-y-6">
                            <ControlButton
                                icon={muted ? <MicOff className="h-7 w-7" strokeWidth={1.4} /> : <Mic className="h-7 w-7" strokeWidth={1.4} />}
                                label={muted ? 'Micro coupé' : 'Muet'}
                                active={muted}
                                onClick={toggleMute}
                            />
                            <ControlButton
                                icon={<SwitchCamera className="h-7 w-7" strokeWidth={1.4} />}
                                label="Retourner"
                                disabled={!videoOn || sharing || (cameraCount > 0 && cameraCount < 2 && !touch)}
                                onClick={flipCamera}
                            />
                            <ControlButton
                                icon={speakerOn ? <Volume2 className="h-7 w-7" strokeWidth={1.4} /> : <Volume1 className="h-7 w-7" strokeWidth={1.4} />}
                                label={speakerOn ? 'Haut-parleur' : 'Écouteur'}
                                active={speakerOn}
                                onClick={() => setSpeakerOn(!speakerOn)}
                            />
                            <ControlButton
                                icon={videoOn ? <Video className="h-7 w-7" strokeWidth={1.4} /> : <VideoOff className="h-7 w-7" strokeWidth={1.4} />}
                                label={videoOn ? 'Caméra' : 'Appel vidéo'}
                                active={videoOn}
                                onClick={toggleVideo}
                            />
                            <ControlButton icon={<MessageSquare className="h-7 w-7" strokeWidth={1.4} />} label="Messages" onClick={() => minimizeTo('chat')} />
                            <ControlButton icon={<UserRound className="h-7 w-7" strokeWidth={1.4} />} label="Contact" onClick={() => minimizeTo('profile')} />
                            <ControlButton
                                icon={<Circle className={`h-7 w-7 ${recording ? 'fill-red-500 text-red-500' : ''}`} strokeWidth={1.4} />}
                                label={recording ? 'Arrêter' : 'Enregistrer'}
                                disabled={phase !== 'connected'}
                                onClick={toggleRecording}
                            />
                            <ControlButton icon={<Phone className="h-7 w-7 rotate-[135deg]" fill="currentColor" />} label="Raccrocher" danger onClick={hangup} />
                            {canShare ? (
                                <ControlButton icon={<MonitorUp className="h-7 w-7" strokeWidth={1.4} />} label={sharing ? 'Arrêter' : 'Partager'} active={sharing} disabled={phase !== 'connected'} onClick={toggleShare} />
                            ) : (
                                <ControlButton icon={<Minimize2 className="h-7 w-7" strokeWidth={1.4} />} label="Réduire" onClick={() => minimizeTo()} />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-24" />
                )}
            </div>
        </>
    );
}
