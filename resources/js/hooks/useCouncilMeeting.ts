import { useCallback, useEffect, useRef, useState } from 'react';

export interface MeetingParticipant {
    user_id: number;
    name: string | null;
    mic: boolean;
    cam: boolean;
    joined_at: string;
}

interface PollState {
    meeting: { id: number; type: string; open: boolean } | null;
    me: number;
    joined: boolean;
    participants: MeetingParticipant[];
    signals: { id: number; from: number; type: string; payload: string }[];
}

interface Peer {
    pc: RTCPeerConnection;
    stream: MediaStream;
    pending: RTCIceCandidateInit[];
    /** Heure de l'offre envoyée par ce navigateur (null : c'est l'autre qui a appelé). */
    offeredAt: number | null;
}

export type MeetingPhase = 'lobby' | 'joining' | 'in' | 'ended';

/** Une offre restée sans réponse au-delà de ce délai est renvoyée (message perdu, réseau mobile). */
const OFFER_RETRY_MS = 8000;
// Maillage : chaque participant envoie sa vidéo à chacun des autres ; une image modeste ménage les connexions mobiles.
const VIDEO_CONSTRAINTS: MediaTrackConstraints = { width: { ideal: 480 }, height: { ideal: 270 }, frameRate: { ideal: 15, max: 20 } };
const AUDIO_CONSTRAINTS: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

interface Options {
    councilId: number;
    initialMeeting: { id: number; type: string } | null;
    iceServers: RTCIceServer[];
    meId: number;
}

/**
 * Visioconférence du conseil, partagée par la page « Visioconférence » et l'écran de séance. Chaque navigateur est relié
 * directement à chacun des autres (WebRTC) ; le serveur ne fait que la présence et le relais des messages de mise en
 * relation, interrogés chaque seconde. Celui qui arrive appelle ceux qui sont déjà là : deux navigateurs ne s'appellent
 * jamais en même temps.
 */
export default function useCouncilMeeting({ councilId, initialMeeting, iceServers, meId }: Options) {
    const [phase, setPhase] = useState<MeetingPhase>('lobby');
    const [meeting, setMeeting] = useState(initialMeeting);
    const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [mic, setMic] = useState(true);
    const [cam, setCam] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState('');

    const peers = useRef(new Map<number, Peer>());
    const lastSignal = useRef(0);
    const local = useRef<MediaStream | null>(null);
    const joinedAt = useRef<string | null>(null);
    const known = useRef(new Map<number, string | null>());

    const post = useCallback(<T>(name: string, data: Record<string, unknown> = {}) => window.axios.post<T>(route(name, councilId), data).then((response) => response.data), [councilId]);

    // Un message de mise en relation perdu bloquerait la liaison : on réessaie deux fois avant d'abandonner.
    const send = useCallback(
        async (to: number, type: string, payload: unknown) => {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await post('council.meeting.signal', { to, type, payload: JSON.stringify(payload) });
                    return;
                } catch {
                    await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
                }
            }
        },
        [post],
    );

    const closePeer = useCallback((id: number) => {
        const peer = peers.current.get(id);
        if (!peer) return;
        peer.pc.close();
        peers.current.delete(id);
        setRemoteStreams((all) => {
            const next = { ...all };
            delete next[id];
            return next;
        });
    }, []);

    const createPeer = useCallback(
        (id: number) => {
            closePeer(id);
            const pc = new RTCPeerConnection({ iceServers });
            const stream = new MediaStream();
            const tracks = local.current?.getTracks() ?? [];
            tracks.forEach((track) => pc.addTrack(track, local.current!));
            // Sans micro ni caméra, on reçoit quand même le son et l'image des autres.
            if (!tracks.some((t) => t.kind === 'audio')) pc.addTransceiver('audio', { direction: 'recvonly' });
            if (!tracks.some((t) => t.kind === 'video')) pc.addTransceiver('video', { direction: 'recvonly' });
            pc.ontrack = (event) => {
                if (!stream.getTracks().includes(event.track)) stream.addTrack(event.track);
                setRemoteStreams((all) => ({ ...all, [id]: stream }));
            };
            pc.onicecandidate = (event) => event.candidate && send(id, 'candidate', event.candidate.toJSON());
            const peer: Peer = { pc, stream, pending: [], offeredAt: null };
            peers.current.set(id, peer);
            return peer;
        },
        [closePeer, iceServers, send],
    );

    const call = useCallback(
        async (id: number) => {
            const peer = createPeer(id);
            const offer = await peer.pc.createOffer();
            await peer.pc.setLocalDescription(offer);
            peer.offeredAt = Date.now();
            await send(id, 'offer', offer);
        },
        [createPeer, send],
    );

    const handleSignal = useCallback(
        async (signal: PollState['signals'][number]) => {
            const payload = JSON.parse(signal.payload);
            if (signal.type === 'offer') {
                const peer = createPeer(signal.from);
                await peer.pc.setRemoteDescription(payload);
                const answer = await peer.pc.createAnswer();
                await peer.pc.setLocalDescription(answer);
                await send(signal.from, 'answer', answer);
                for (const candidate of peer.pending.splice(0)) await peer.pc.addIceCandidate(candidate).catch(() => undefined);
            } else if (signal.type === 'answer') {
                const peer = peers.current.get(signal.from);
                if (peer && peer.pc.signalingState === 'have-local-offer') {
                    await peer.pc.setRemoteDescription(payload);
                    for (const candidate of peer.pending.splice(0)) await peer.pc.addIceCandidate(candidate).catch(() => undefined);
                }
            } else if (signal.type === 'candidate') {
                const peer = peers.current.get(signal.from);
                if (!peer) return;
                if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(payload).catch(() => undefined);
                else peer.pending.push(payload);
            } else if (signal.type === 'bye') {
                closePeer(signal.from);
            }
        },
        [closePeer, createPeer, send],
    );

    const stopAll = useCallback(() => {
        [...peers.current.keys()].forEach(closePeer);
        local.current?.getTracks().forEach((track) => track.stop());
        local.current = null;
        setLocalStream(null);
    }, [closePeer]);

    // Hors de la visio : on regarde tout de suite, puis toutes les 3 s, si elle est ouverte et qui s'y trouve.
    useEffect(() => {
        if (phase !== 'lobby') return;
        const look = async () => {
            try {
                const state = await post<PollState>('council.meeting.poll', { after: 0 });
                setMeeting(state.meeting);
                setParticipants(state.participants);
            } catch {
                // Nouvel essai au tour suivant.
            }
        };
        void look();
        const timer = window.setInterval(look, 3000);
        return () => window.clearInterval(timer);
    }, [phase, post]);

    // Dans la visio : signe de vie, présents et messages de mise en relation, chaque seconde.
    useEffect(() => {
        if (phase !== 'in') return;
        let busy = false;
        const timer = window.setInterval(async () => {
            if (busy) return;
            busy = true;
            try {
                const state = await post<PollState>('council.meeting.poll', { after: lastSignal.current, mic, cam: cam && !!local.current?.getVideoTracks().length });
                if (!state.meeting || !state.joined) {
                    stopAll();
                    setMeeting(state.meeting);
                    setPhase(state.meeting ? 'lobby' : 'ended');
                    return;
                }
                for (const signal of state.signals) {
                    lastSignal.current = Math.max(lastSignal.current, signal.id);
                    await handleSignal(signal).catch(() => undefined);
                }
                const others = state.participants.filter((p) => p.user_id !== meId);
                const present = new Set(others.map((p) => p.user_id));
                for (const other of others) {
                    if (!known.current.has(other.user_id)) setNotice(`${other.name} a rejoint la visioconférence.`);
                    // Le dernier arrivé appelle ceux qui étaient déjà là.
                    const newcomer = joinedAt.current !== null && (joinedAt.current > other.joined_at || (joinedAt.current === other.joined_at && meId > other.user_id));
                    const peer = peers.current.get(other.user_id);
                    const unanswered = peer?.offeredAt && peer.pc.signalingState === 'have-local-offer' && Date.now() - peer.offeredAt > OFFER_RETRY_MS;
                    if (newcomer && (!peer || unanswered)) await call(other.user_id).catch(() => undefined);
                }
                for (const [id, name] of known.current) {
                    if (!present.has(id)) setNotice(`${name ?? 'Un participant'} a quitté la visioconférence.`);
                }
                for (const [id, peer] of peers.current) {
                    if (!present.has(id) || peer.pc.connectionState === 'failed') closePeer(id);
                }
                known.current = new Map(others.map((p) => [p.user_id, p.name]));
                setParticipants(state.participants);
            } catch {
                // Réseau momentanément absent : la présence tient 15 s.
            } finally {
                busy = false;
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [phase, post, mic, cam, meId, call, handleSignal, closePeer, stopAll]);

    // Quitter l'écran (changement de page dans l'application) = quitter la visio, connexions fermées.
    const phaseRef = useRef(phase);
    phaseRef.current = phase;
    useEffect(
        () => () => {
            if (phaseRef.current === 'in') {
                const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
                fetch(route('council.meeting.leave', councilId), { method: 'POST', keepalive: true, headers: { 'X-XSRF-TOKEN': token, Accept: 'application/json' }, credentials: 'same-origin' });
            }
            [...peers.current.values()].forEach((peer) => peer.pc.close());
            peers.current.clear();
            local.current?.getTracks().forEach((track) => track.stop());
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    // Fermer l'onglet = quitter.
    useEffect(() => {
        if (phase !== 'in') return;
        const leave = () => {
            const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
            fetch(route('council.meeting.leave', councilId), { method: 'POST', keepalive: true, headers: { 'X-XSRF-TOKEN': token, Accept: 'application/json' }, credentials: 'same-origin' });
        };
        window.addEventListener('pagehide', leave);
        return () => window.removeEventListener('pagehide', leave);
    }, [phase, councilId]);

    const enter = async (start?: 'video' | 'audio') => {
        setError(null);
        setPhase('joining');
        const type = start ?? meeting?.type ?? 'video';
        let stream: MediaStream | null = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: type === 'video' && cam ? VIDEO_CONSTRAINTS : false });
        } catch {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
                setCam(false);
            } catch {
                setNotice('Micro et caméra indisponibles : vous suivez la visioconférence sans être entendu.');
            }
        }
        local.current = stream;
        setLocalStream(stream);

        try {
            const state = start ? await post<PollState>('council.meeting.start', { type: start }) : await post<PollState>('council.meeting.join');
            setMeeting(state.meeting);
            joinedAt.current = state.participants.find((p) => p.user_id === meId)?.joined_at ?? new Date().toISOString();
            known.current = new Map(state.participants.filter((p) => p.user_id !== meId).map((p) => [p.user_id, p.name]));
            setParticipants(state.participants);
            setPhase('in');
        } catch (failure: unknown) {
            stopAll();
            setError((failure as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Impossible de rejoindre la visioconférence.');
            setPhase('lobby');
        }
    };

    const leave = async () => {
        for (const id of peers.current.keys()) void send(id, 'bye', {});
        await post('council.meeting.leave').catch(() => undefined);
        stopAll();
        setPhase('lobby');
    };

    const endForAll = async () => {
        await post('council.meeting.end').catch(() => undefined);
        stopAll();
        setMeeting(null);
        setPhase('ended');
    };

    const toggleMic = () => {
        const next = !mic;
        local.current?.getAudioTracks().forEach((track) => (track.enabled = next));
        setMic(next);
    };

    const toggleCam = () => {
        const next = !cam;
        local.current?.getVideoTracks().forEach((track) => (track.enabled = next));
        setCam(next);
    };

    return {
        phase,
        meeting,
        participants,
        others: participants.filter((p) => p.user_id !== meId),
        remoteStreams,
        localStream,
        hasVideo: !!localStream?.getVideoTracks().length,
        mic,
        cam,
        setCam,
        error,
        notice,
        enter,
        leave,
        endForAll,
        toggleMic,
        toggleCam,
    };
}
