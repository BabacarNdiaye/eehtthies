import Avatar from '@/Components/Connect/Avatar';
import SiteLogo from '@/Components/SiteLogo';
import useDialogFocus from '@/hooks/useDialogFocus';
import useWakeLock from '@/hooks/useWakeLock';
import { CardData, readSnapshot, saveCard } from '@/lib/offline';
import { haptic } from '@/lib/portal';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { FlipHorizontal2, Sun, WifiOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    open: boolean;
    onClose: () => void;
}

/**
 * Carte d'étudiant plein écran, retournable : au verso le grand code QR de pointage (face affichée à l'ouverture,
 * c'est ce qu'on présente à l'entrée), au recto l'identité. L'écran reste allumé tant que la carte est ouverte
 * (Wake Lock). La carte est lue d'abord dans la mémoire du navigateur — elle s'affiche donc même sans réseau —
 * puis rafraîchie depuis le serveur.
 */
export default function StudentCardOverlay({ open, onClose }: Props) {
    const { auth, siteSettings } = usePage<PageProps>().props;
    const userId = auth.user?.id ?? 0;
    const panel = useRef<HTMLDivElement>(null);
    const [card, setCard] = useState<CardData | null>(null);
    const [showQr, setShowQr] = useState(true);
    const [offline, setOffline] = useState(false);
    const [loading, setLoading] = useState(false);
    const awake = useWakeLock(open);

    useDialogFocus(open, panel, onClose);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        setShowQr(true);
        setOffline(false);
        setCard(readSnapshot(userId)?.card ?? null);
        setLoading(true);

        window.axios
            .get<CardData>(route('student.card'))
            .then((response) => {
                if (cancelled) return;
                setCard(response.data);
                saveCard(userId, response.data);
            })
            .catch(() => {
                if (!cancelled) setOffline(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, userId]);

    if (!open) return null;

    const flip = () => {
        haptic(10);
        setShowQr((value) => !value);
    };

    const face = 'absolute inset-0 flex flex-col rounded-[2rem] shadow-elevated [backface-visibility:hidden]';

    return (
        <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Ma carte d'étudiant"
            tabIndex={-1}
            className="fixed inset-0 z-[60] flex animate-fade-in flex-col overflow-y-auto bg-gradient-to-b from-ink-950 via-ink-900 to-brand-900 text-white outline-none"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex items-center justify-between px-4 py-3">
                <button
                    type="button"
                    onClick={() => {
                        haptic();
                        onClose();
                    }}
                    aria-label="Fermer la carte"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors active:bg-white/20"
                >
                    <X className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold tracking-wide">Ma carte</p>
                <span className="h-11 w-11" aria-hidden="true" />
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 pb-6">
                {!card ? (
                    <div className="w-full max-w-[22rem] rounded-[2rem] bg-white/10 p-8 text-center backdrop-blur" role="status">
                        {loading ? (
                            <div className="mx-auto h-48 w-48 animate-pulse rounded-3xl bg-white/20" />
                        ) : (
                            <>
                                <WifiOff className="mx-auto h-8 w-8 text-white/70" />
                                <p className="mt-3 text-sm text-white/80">
                                    Votre carte n'est pas encore enregistrée sur cet appareil. Connectez-vous au réseau une première fois pour la récupérer.
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="w-full max-w-[22rem] [perspective:1200px]">
                            <div
                                className="relative aspect-[3/4] w-full transition-transform duration-500 ease-fluid [transform-style:preserve-3d] motion-reduce:transition-none"
                                style={{ transform: showQr ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                            >
                                {/* Recto : identité */}
                                <div className={`${face} bg-gradient-to-br from-ink-800 to-brand-800 p-6 ring-1 ring-white/15`} aria-hidden={showQr}>
                                    <div className="flex items-center gap-3">
                                        <SiteLogo size={40} tone="gold" />
                                        <div className="leading-tight">
                                            <p className="font-serif text-sm font-bold">{siteSettings?.site_short_name ?? 'EEHT'}</p>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300">Carte d'étudiant</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                                        <Avatar name={card.name} src={card.photo} size="lg" />
                                        <p className="mt-4 font-serif text-2xl font-bold leading-tight">{card.name}</p>
                                        <p className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider">{card.matricule}</p>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/15 pt-4 text-left text-xs">
                                        {card.formation && (
                                            <div className="col-span-2">
                                                <dt className="text-white/60">Formation</dt>
                                                <dd className="font-semibold">{card.formation}</dd>
                                            </div>
                                        )}
                                        {card.class_name && (
                                            <div>
                                                <dt className="text-white/60">Classe</dt>
                                                <dd className="font-semibold">{card.class_name}</dd>
                                            </div>
                                        )}
                                        {card.academic_year && (
                                            <div>
                                                <dt className="text-white/60">Année</dt>
                                                <dd className="font-semibold">{card.academic_year}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>

                                {/* Verso : code QR de pointage */}
                                <div className={`${face} items-center justify-center bg-white p-6 text-ink-900 [transform:rotateY(180deg)]`} aria-hidden={!showQr}>
                                    <img src={`data:image/svg+xml;base64,${card.qr}`} alt={`Code QR de pointage de ${card.name}`} className="w-full max-w-[17rem]" />
                                    <p className="mt-3 font-serif text-lg font-bold">{card.matricule}</p>
                                    <p className="mt-1 text-center text-xs text-ink-500">Présentez ce code au lecteur, à l'entrée de l'établissement.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={flip}
                            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink-900 shadow-lg transition-transform active:scale-95"
                        >
                            <FlipHorizontal2 className="h-4 w-4" /> {showQr ? "Voir l'identité" : 'Voir le code QR'}
                        </button>
                    </>
                )}

                <div className="min-h-[2.5rem] text-center text-xs text-white/70" aria-live="polite">
                    {offline && card && (
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 font-medium text-amber-200">
                            <WifiOff className="h-3.5 w-3.5" /> Hors ligne : carte enregistrée sur cet appareil
                        </p>
                    )}
                    {!offline && awake && (
                        <p className="inline-flex items-center gap-1.5">
                            <Sun className="h-3.5 w-3.5" /> L'écran reste allumé tant que la carte est ouverte
                        </p>
                    )}
                    {!offline && !awake && card && <p>Augmentez la luminosité de l'écran pour faciliter la lecture du code.</p>}
                </div>
            </div>
        </div>
    );
}
