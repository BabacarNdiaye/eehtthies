import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { PageProps, SchoolClass } from '@/types';
import SiteLogo from '@/Components/SiteLogo';
import { AlertCircle, Check, Loader2, Pause, Play, ScanLine, SwitchCamera, Video } from 'lucide-react';

type StudentRow = {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    school_class_id?: number | null;
    photo?: string | null;
};

type MessageState = {
    type: 'success' | 'error' | 'info';
    text: string;
};

type Celebration = {
    id: number;
    firstName: string;
    fullName: string;
    className: string;
    photo?: string | null;
    late?: boolean;
    lateMinutes?: number;
};

type CameraOption = { id: string; label: string };

// Un court carillon agréable de deux ou trois notes, synthétisé à la volée (API Web Audio) — aucun fichier
// audio à livrer ni héberger, fonctionne hors ligne, et ne nécessite aucun enregistrement par élève.
function playChime(kind: 'success' | 'error' | 'late') {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notes = kind === 'success' ? [659.25, 830.61, 987.77] : kind === 'late' ? [587.33, 493.88] : [329.63, 246.94];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = ctx.currentTime + i * 0.1;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.42);
        });
        setTimeout(() => ctx.close().catch(() => undefined), 900);
    } catch {
        // Non critique — une borne silencieuse fonctionne toujours, ne jamais bloquer le flux de scan pour
        // cela.
    }
}

// Prononce un court message d'accueil en français via la synthèse vocale intégrée au navigateur, pour
// qu'aucun fichier audio n'ait à être enregistré ni hébergé pour chaque phrase.
function speak(text: string) {
    try {
        if (!('speechSynthesis' in window)) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 1;
        utterance.pitch = 1.05;
        const frVoice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr'));
        if (frVoice) utterance.voice = frVoice;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } catch {
        // Non critique.
    }
}

interface Props {
    schoolClasses: SchoolClass[];
    students: StudentRow[];
    date: string;
    mode?: 'classroom' | 'gate';
}

export default function Kiosk({ students, date, mode = 'classroom' }: Props) {
    const { props } = usePage<PageProps>();
    const siteName = props.siteSettings?.site_name ?? 'EEHT de Thiès';
    const siteTagline = props.siteSettings?.site_tagline;

    const [message, setMessage] = useState<MessageState>({
        type: 'info',
        text: mode === 'gate' ? "Présentez votre carte d'étudiant devant la caméra." : 'Placez le QR du badge devant la caméra.',
    });
    const [scanned, setScanned] = useState<Array<{ id: number; name: string; className: string; time: string }>>([]);
    const [celebration, setCelebration] = useState<Celebration | null>(null);
    const [now, setNow] = useState(new Date());

    const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
    const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
    const [cameras, setCameras] = useState<CameraOption[]>([]);
    const [cameraIndex, setCameraIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
    const resumeTimeoutRef = useRef<number | null>(null);
    const handleScanRef = useRef<(text: string) => void>(() => undefined);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Chrome charge les voix de façon asynchrone ; consulter la liste une fois en amont rend plus probable
    // qu'une voix française soit déjà disponible au premier appel de `speak()` après un scan.
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }
    }, []);

    useEffect(() => {
        if (!celebration) return;
        const timeout = setTimeout(() => setCelebration(null), 4200);
        return () => clearTimeout(timeout);
    }, [celebration]);

    const scanRoute = useMemo(() => {
        try {
            const generated = route('admin.pointage.scan');
            if (generated && new URL(generated, window.location.origin).origin === window.location.origin) {
                return generated;
            }
        } catch {
            // on passe au repli sur la même origine ci-dessous
        }

        // Si un jeton de borne est présent dans l'URL, on utilise le point d'entrée public de scan et on
        // inclut le jeton dans le corps
        const params = new URLSearchParams(window.location.search);
        const kioskToken = params.get('token');
        if (kioskToken) {
            return `${window.location.origin}/borne/pointage/scan/open`;
        }

        return `${window.location.origin}/admin/pointage/scan`;
    }, []);

    const kioskToken = useMemo(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('token');
        } catch {
            return null;
        }
    }, []);

    const parseQrPayload = (raw: string) => {
        const value = raw.trim();
        if (!value) {
            throw new Error('Le QR est vide.');
        }

        if (value.startsWith('{')) {
            const parsed = JSON.parse(value) as {
                student_id?: number;
                studentId?: number;
                school_class_id?: number;
                schoolClassId?: number;
            };

            return {
                studentId: Number(parsed.student_id ?? parsed.studentId ?? 0),
                schoolClassId: Number(parsed.school_class_id ?? parsed.schoolClassId ?? 0),
            };
        }

        if (value.startsWith('http')) {
            const parsed = new URL(value);
            return {
                studentId: Number(parsed.searchParams.get('student_id') ?? parsed.searchParams.get('studentId') ?? 0),
                schoolClassId: Number(parsed.searchParams.get('school_class_id') ?? parsed.searchParams.get('schoolClassId') ?? 0),
            };
        }

        return {
            studentId: Number(value),
            schoolClassId: 0,
        };
    };

    // Html5Qrcode.pause() de html5-qrcode injecte sa propre bannière brute « Scanner paused » (sans style,
    // sans id ni classe à cibler) — on affiche à la place notre propre état de pause via l'icône de la barre
    // du bas, donc on masque celle de la bibliothèque. Appelé de façon synchrone juste après pause(), avant
    // que le navigateur ne dessine, si bien qu'elle ne clignote jamais réellement à l'écran.
    const suppressNativePausedBanner = () => {
        document.getElementById('qr-reader')?.querySelectorAll<HTMLDivElement>(':scope > div').forEach((el) => {
            if (el.style.position === 'absolute' && el.style.width === '100%' && el.style.top === '0px') {
                el.style.display = 'none';
            }
        });
    };

    // Après un scan réussi, on met en pause quelques secondes (même durée que l'écran d'accueil) pour que le
    // même badge tenu devant la caméra ne redéclenche pas une rafale de scans et de sons pendant que l'élève
    // passe encore.
    const triggerPostScanCooldown = () => {
        setPaused(true);
        html5QrcodeRef.current?.pause(true);
        suppressNativePausedBanner();
        if (resumeTimeoutRef.current) window.clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = window.setTimeout(() => {
            html5QrcodeRef.current?.resume();
            setPaused(false);
        }, 4200);
    };

    const handleGateScan = (decodedText: string) => {
        const token = decodedText.trim();
        if (!token) {
            setMessage({ type: 'error', text: 'Le QR est vide.' });
            return;
        }

        window.axios
            .post(scanRoute, {
                qr_token: token,
                date,
                status: 'present',
                ...(kioskToken ? { kiosk_token: kioskToken } : {}),
            })
            .then(({ data }) => {
                const now = new Date();
                const className = data.school_class ?? 'Classe inconnue';
                const isLate = data.status === 'retard';
                const next = {
                    id: data.student.id,
                    name: data.student.full_name,
                    className,
                    time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                };

                setScanned((prev) => {
                    const existing = prev.filter((item) => item.id !== next.id);
                    return [next, ...existing].slice(0, 8);
                });
                setMessage({
                    type: isLate ? 'info' : 'success',
                    text: isLate ? `${next.name} : arrivée en retard.` : `${next.name} : présence validée.`,
                });
                setCelebration({
                    id: data.student.id,
                    firstName: data.student.first_name ?? data.student.full_name.split(' ')[0],
                    fullName: data.student.full_name,
                    className,
                    photo: data.student.photo,
                    late: isLate,
                    lateMinutes: data.late_minutes,
                });
                playChime(isLate ? 'late' : 'success');
                speak(
                    isLate
                        ? `${data.student.first_name ?? ''} est en retard.`
                        : `Merci ${data.student.first_name ?? ''}, bienvenue !`,
                );
                triggerPostScanCooldown();
            })
            .catch((error) => {
                const text = error?.response?.data?.message ?? 'Badge non reconnu ou scan impossible.';
                setMessage({ type: 'error', text });
                playChime('error');
            });
    };

    const handleClassroomScan = (decodedText: string) => {
        try {
            const payload = parseQrPayload(decodedText);
            if (!payload.studentId || !Number.isFinite(payload.studentId)) {
                throw new Error('QR d’élève invalide.');
            }

            const student = students.find((item) => item.id === payload.studentId);
            if (!student) {
                throw new Error('Élève introuvable.');
            }

            const schoolClassId = payload.schoolClassId || student.school_class_id || 0;

            // axios simple, et non router.post d'Inertia : ce point d'entrée renvoie du JSON brut (partagé
            // avec le scan du mode portique), et le client d'Inertia lève une erreur si une requête qu'il a
            // émise ne revient pas sous forme de réponse Inertia valide.
            window.axios
                .post(scanRoute, {
                    student_id: student.id,
                    school_class_id: schoolClassId || student.school_class_id,
                    date,
                    status: 'present',
                    ...(kioskToken ? { kiosk_token: kioskToken } : {}),
                })
                .then(({ data }) => {
                    const now = new Date();
                    const className = data.school_class ?? 'Classe inconnue';
                    const isLate = data.status === 'retard';
                    const next = {
                        id: data.student.id,
                        name: data.student.full_name,
                        className,
                        time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    };

                    setScanned((prev) => {
                        const existing = prev.filter((item) => item.id !== next.id);
                        return [next, ...existing].slice(0, 8);
                    });
                    setMessage({
                        type: isLate ? 'info' : 'success',
                        text: isLate
                            ? `${next.name} (${className}) : arrivée en retard.`
                            : `${next.name} (${className}) : présence validée.`,
                    });
                    setCelebration({
                        id: data.student.id,
                        firstName: data.student.first_name ?? data.student.full_name.split(' ')[0],
                        fullName: data.student.full_name,
                        className,
                        photo: data.student.photo,
                        late: isLate,
                        lateMinutes: data.late_minutes,
                    });
                    playChime(isLate ? 'late' : 'success');
                    speak(
                        isLate
                            ? `${data.student.first_name ?? ''} est en retard.`
                            : `Merci ${data.student.first_name ?? ''}, bienvenue !`,
                    );
                    triggerPostScanCooldown();
                })
                .catch((error) => {
                    const text = error?.response?.data?.message ?? 'Le scan n’a pas pu être enregistré.';
                    setMessage({ type: 'error', text });
                    playChime('error');
                });
        } catch (error) {
            const text = error instanceof Error ? error.message : 'Le QR n’est pas exploitable.';
            setMessage({ type: 'error', text });
        }
    };

    // Mis à jour à chaque rendu (aucun effet nécessaire — modifier une ref pendant le rendu est sûr tant que
    // rien ne la relit pendant ce même rendu) pour que le callback stable ci-dessous appelle toujours le
    // mode, les props et l'état courants.
    handleScanRef.current = mode === 'gate' ? handleGateScan : handleClassroomScan;

    // Identité de fonction stable passée à Html5Qrcode.start() : la caméra n'a jamais besoin de redémarrer
    // quand le mode, la date ou les élèves changent, elle transmet simplement à ce que handleScanRef désigne
    // à cet instant.
    const stableSuccessCallback = useRef((text: string) => handleScanRef.current(text)).current;

    const startCamera = async (preferredCameraId?: string) => {
        setCameraStatus('starting');
        setCameraErrorMessage(null);

        try {
            if (!html5QrcodeRef.current) {
                html5QrcodeRef.current = new Html5Qrcode('qr-reader', {
                    verbose: false,
                    // La détection native de codes-barres du navigateur ou du système (lorsqu'elle est
                    // disponible) est bien plus rapide que le décodeur JS pur de secours, et se limiter aux
                    // codes QR (au lieu de chercher tous les formats de codes-barres) réduit le travail par
                    // image — les deux réduisent le temps de détection.
                    useBarCodeDetectorIfSupported: true,
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                });
            }

            let list = cameras;
            if (list.length === 0) {
                list = await Html5Qrcode.getCameras();
                setCameras(list);
            }

            if (list.length === 0) {
                throw new Error('Aucune caméra détectée sur cet appareil.');
            }

            const targetId = preferredCameraId ?? list[cameraIndex]?.id ?? list[0].id;

            await html5QrcodeRef.current.start(
                targetId,
                { fps: 20, qrbox: { width: 300, height: 300 }, aspectRatio: 1 },
                stableSuccessCallback,
                () => undefined,
            );

            setPaused(false);
            setCameraStatus('running');
        } catch (err) {
            setCameraStatus('error');
            setCameraErrorMessage(
                err instanceof Error && err.message ? err.message : 'Impossible de démarrer la caméra. Vérifiez les autorisations du navigateur.',
            );
        }
    };

    const switchCamera = async () => {
        if (cameras.length < 2 || !html5QrcodeRef.current) return;

        const nextIndex = (cameraIndex + 1) % cameras.length;
        try {
            await html5QrcodeRef.current.stop();
        } catch {
            // Peut être déjà arrêtée ou en pause — on peut l'ignorer et tenter quand même de démarrer.
        }
        setCameraIndex(nextIndex);
        await startCamera(cameras[nextIndex].id);
    };

    const togglePause = () => {
        if (!html5QrcodeRef.current || cameraStatus !== 'running') return;

        if (paused) {
            html5QrcodeRef.current.resume();
            setPaused(false);
        } else {
            if (resumeTimeoutRef.current) {
                window.clearTimeout(resumeTimeoutRef.current);
                resumeTimeoutRef.current = null;
            }
            html5QrcodeRef.current.pause(true);
            suppressNativePausedBanner();
            setPaused(true);
        }
    };

    useEffect(() => {
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
            setMessage({
                type: 'error',
                text: 'La borne doit être ouverte avec HTTPS pour autoriser la caméra. Utilisez une URL sécurisée comme https://192.168.1.95:9443/borne/pointage.',
            });
        }

        // Crochet réservé au développement pour déclencher un scan de façon déterministe sans vraie caméra ni
        // QR (Vite le retire des builds de production — import.meta.env.DEV y vaut statiquement false, donc
        // toute la branche est éliminée comme code mort).
        if (import.meta.env.DEV) {
            (window as unknown as { __kioskTestScan?: (text: string) => void }).__kioskTestScan = (text) => handleScanRef.current(text);
        }

        return () => {
            if (resumeTimeoutRef.current) window.clearTimeout(resumeTimeoutRef.current);
            html5QrcodeRef.current?.stop().catch(() => undefined);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Head title={`Borne d’entrée — ${siteName}`} />

            <style>{`
                @keyframes kiosk-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes kiosk-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes kiosk-card-in {
                    0% { opacity: 0; transform: scale(0.82) translateY(14px); }
                    60% { opacity: 1; transform: scale(1.03) translateY(0); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes kiosk-ring-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(200, 148, 42, 0.55); }
                    100% { box-shadow: 0 0 0 22px rgba(200, 148, 42, 0); }
                }
                @keyframes kiosk-ring-pulse-late {
                    0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.55); }
                    100% { box-shadow: 0 0 0 22px rgba(217, 119, 6, 0); }
                }
                @keyframes kiosk-check-pop {
                    0% { transform: scale(0); }
                    60% { transform: scale(1.25); }
                    100% { transform: scale(1); }
                }
                @keyframes kiosk-bar-in { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
                @keyframes kiosk-cta-pulse {
                    0%, 100% { box-shadow: 0 8px 24px rgba(200, 148, 42, 0.35), 0 0 0 0 rgba(200, 148, 42, 0.45); }
                    50% { box-shadow: 0 8px 24px rgba(200, 148, 42, 0.45), 0 0 0 14px rgba(200, 148, 42, 0); }
                }
                @keyframes kiosk-spin { to { transform: rotate(360deg); } }
                @keyframes kiosk-live-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
                @keyframes kiosk-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .kiosk-toast { animation: kiosk-toast-in 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
                .kiosk-backdrop { animation: kiosk-backdrop-in 0.25s ease-out; }
                .kiosk-card { animation: kiosk-card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
                .kiosk-ring { animation: kiosk-ring-pulse 1.6s ease-out infinite; }
                .kiosk-ring-late { animation: kiosk-ring-pulse-late 1.6s ease-out infinite; }
                .kiosk-check { animation: kiosk-check-pop 0.4s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; }
                .kiosk-bar { animation: kiosk-bar-in 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
                .kiosk-cta { animation: kiosk-cta-pulse 2.6s ease-in-out infinite; }
                .kiosk-spin { animation: kiosk-spin 0.9s linear infinite; }
                .kiosk-live-dot { animation: kiosk-live-dot 1.8s ease-in-out infinite; }
                .kiosk-fade-up { animation: kiosk-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards; }

                /* Rebrand html5-qrcode's own scan-box viewfinder (plain white corner
                   brackets + pure-black dimming) to match the gold/navy kiosk theme. */
                #qr-shaded-region {
                    border-color: rgba(5, 9, 15, 0.68) !important;
                }
                #qr-shaded-region > div {
                    background-color: #d9a544 !important;
                    box-shadow: 0 0 14px rgba(217, 165, 68, 0.7);
                    border-radius: 2px;
                }
            `}</style>

            <div className="fixed inset-0 flex flex-col bg-[radial-gradient(ellipse_at_top,#16233a_0%,#0b1728_45%,#05090f_100%)]">
                {/* En-tête de marque : logo de l'école, nom et horloge en direct */}
                <header className="relative z-10 flex items-center justify-between border-b border-gold-500/20 bg-ink-900/80 px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
                    <div className="flex items-center gap-3">
                        <SiteLogo size={44} tone="gold" className="ring-2 ring-gold-500/40" />
                        <div className="leading-tight">
                            <div className="font-serif text-lg font-bold text-white sm:text-xl">{siteName}</div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-gold-400">
                                <ScanLine className="h-3.5 w-3.5" />
                                {mode === 'gate' ? "Borne d'entrée — Carte d'étudiant" : 'Borne de pointage — Classe'}
                            </div>
                            {siteTagline && <div className="hidden text-xs text-white/50 sm:block">{siteTagline}</div>}
                        </div>
                    </div>

                    <div className="text-right text-white/80">
                        <div className="font-serif text-lg font-semibold tabular-nums text-white sm:text-xl">
                            {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[11px] uppercase tracking-wide text-white/50">
                            {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </header>

                {/* La zone caméra occupe l'espace restant */}
                <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,#111d30_0%,#05090f_75%)] ring-1 ring-inset ring-white/5">
                    <div id="qr-reader" className="h-full w-full [&_video]:mx-auto [&_video]:h-full [&_video]:object-cover" />

                    {/* Vignette cinématographique pour que le texte de l'en-tête et du pied de page reste lisible sur n'importe quel flux caméra */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

                    <div className="pointer-events-none absolute inset-x-0 top-4 flex flex-col items-center gap-2">
                        <div className="rounded-full border border-gold-500/30 bg-ink-950/70 px-5 py-2 text-xs font-medium tracking-wide text-white/80 shadow-lg backdrop-blur">
                            {mode === 'gate'
                                ? "Scannez le QR code de votre carte d'étudiant"
                                : 'Scannez le QR code affiché sur la feuille de classe'}
                        </div>
                        {cameraStatus === 'running' && (
                            <div className="kiosk-fade-up flex items-center gap-1.5 rounded-full bg-ink-950/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400 backdrop-blur">
                                <span className="kiosk-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Caméra active
                            </div>
                        )}
                    </div>

                    {/*  État avant scan : un écran d'accueil de marque + un seul bouton d'appel à l'action
                         * élégant, au lieu du bouton d'autorisation par défaut de la bibliothèque de scan
                         * (invisible sur fond sombre).
                        permission button. */}
                    {cameraStatus !== 'running' && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-6 text-center">
                            {cameraStatus !== 'error' && (
                                <div className="kiosk-fade-up flex flex-col items-center gap-3">
                                    <SiteLogo size={72} tone="gold" className="shadow-[0_0_40px_rgba(200,148,42,0.25)]" />
                                    <div>
                                        <div className="font-serif text-2xl font-bold text-white sm:text-3xl">Bienvenue</div>
                                        <div className="mt-1 text-sm text-white/50">
                                            {mode === 'gate'
                                                ? "Touchez le bouton ci-dessous pour pointer votre arrivée"
                                                : 'Touchez le bouton ci-dessous pour commencer le pointage'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {cameraStatus === 'error' && (
                                <div className="kiosk-fade-up flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-red-500/30 bg-red-950/40 px-6 py-5 text-center shadow-xl backdrop-blur">
                                    <AlertCircle className="h-6 w-6 text-red-400" />
                                    <p className="text-sm font-medium text-red-100">{cameraErrorMessage}</p>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => startCamera()}
                                disabled={cameraStatus === 'starting'}
                                className={`inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#e0ae4f] to-gold-600 px-8 py-4 text-sm font-semibold text-ink-900 transition-transform active:scale-95 disabled:opacity-70 ${
                                    cameraStatus === 'idle' ? 'kiosk-cta' : ''
                                }`}
                            >
                                {cameraStatus === 'starting' ? (
                                    <Loader2 className="kiosk-spin h-4 w-4" />
                                ) : (
                                    <Video className="h-4 w-4" />
                                )}
                                {cameraStatus === 'starting' ? 'Activation en cours…' : cameraStatus === 'error' ? 'Réessayer' : 'Activer la caméra'}
                            </button>
                        </div>
                    )}

                    <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs">
                        <div
                            key={message.text}
                            className={`kiosk-toast pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur ${
                                message.type === 'success'
                                    ? 'bg-emerald-600/90 text-white'
                                    : message.type === 'error'
                                        ? 'bg-red-600/90 text-white'
                                        : 'bg-ink-900/80 text-white/90 ring-1 ring-white/10'
                            }`}
                        >
                            {message.text}
                        </div>
                    </div>

                    {scanned.length > 0 && (
                        <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-white/10 bg-ink-900/70 px-4 py-1.5 text-xs font-medium text-white/70 shadow-lg backdrop-blur">
                            {scanned.length} pointage{scanned.length > 1 ? 's' : ''} cette session
                        </div>
                    )}

                    {/*  Barre de contrôle personnalisée (changement de caméra / pause-reprise), qui
                         * remplace le tableau de bord en texte brut de html5-qrcode pour rester lisible et à
                         * l'image de la marque.
                        own plain-text dashboard so it stays legible and on-brand. */}
                    {cameraStatus === 'running' && (
                        <div className="kiosk-bar pointer-events-auto absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-ink-950/80 p-2 shadow-2xl backdrop-blur">
                            {cameras.length > 1 && (
                                <button
                                    type="button"
                                    onClick={switchCamera}
                                    title="Changer de caméra"
                                    className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    <SwitchCamera className="h-5 w-5" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={togglePause}
                                title={paused ? 'Reprendre le scan' : 'Mettre en pause'}
                                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#e0ae4f] to-gold-600 text-ink-900 shadow-md transition-transform active:scale-90"
                            >
                                {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                            </button>
                        </div>
                    )}

                    {/* Célébration « bienvenue » plein écran affichée quelques secondes après un scan réussi */}
                    {celebration && (
                        <div className="kiosk-backdrop pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-ink-950/75 backdrop-blur-md">
                            <div
                                className={`kiosk-card mx-6 flex flex-col items-center gap-5 rounded-[2rem] border bg-gradient-to-b from-ink-900/95 to-ink-950/95 px-14 py-12 text-center shadow-2xl ${
                                    celebration.late ? 'border-amber-500/30' : 'border-gold-500/30'
                                }`}
                            >
                                <div className="relative">
                                    <div className={`kiosk-ring absolute inset-0 rounded-full ${celebration.late ? 'kiosk-ring-late' : ''}`} />
                                    {celebration.photo ? (
                                        <img
                                            src={`/storage/${celebration.photo}`}
                                            alt={celebration.fullName}
                                            className={`h-28 w-28 rounded-full border-4 object-cover shadow-xl sm:h-32 sm:w-32 ${
                                                celebration.late ? 'border-amber-500' : 'border-gold-500'
                                            }`}
                                        />
                                    ) : (
                                        <div
                                            className={`flex h-28 w-28 items-center justify-center rounded-full border-4 bg-ink-800 font-serif text-4xl font-bold shadow-xl sm:h-32 sm:w-32 ${
                                                celebration.late ? 'border-amber-500 text-amber-400' : 'border-gold-500 text-gold-400'
                                            }`}
                                        >
                                            {celebration.firstName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div
                                        className={`kiosk-check absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-ink-900 ${
                                            celebration.late ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}
                                    >
                                        {celebration.late ? (
                                            <AlertCircle className="h-5 w-5" strokeWidth={3} />
                                        ) : (
                                            <Check className="h-5 w-5" strokeWidth={3} />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div
                                        className={`text-xs font-semibold uppercase tracking-[0.3em] ${
                                            celebration.late ? 'text-amber-400' : 'text-gold-400'
                                        }`}
                                    >
                                        {celebration.late
                                            ? `En retard${celebration.lateMinutes ? ` · ${celebration.lateMinutes} min` : ''}`
                                            : 'Bienvenue'}
                                    </div>
                                    <div className="mt-2 font-serif text-3xl font-bold text-white sm:text-4xl">{celebration.fullName}</div>
                                    <div className="mt-1.5 text-sm text-white/60">{celebration.className}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
