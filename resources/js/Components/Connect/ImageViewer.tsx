import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { clockTime, dayLabel } from './utils';

export interface ViewerImage {
    id: number;
    url: string;
    name: string;
    sender_name: string | null;
    created_at: string;
}

/**
 * Visionneuse plein écran des photos d'une conversation : flèches, clavier
 * (← → Échap), balayage du doigt sur mobile, téléchargement.
 */
export default function ImageViewer({ images, startId, onClose }: { images: ViewerImage[]; startId: number; onClose: () => void }) {
    const [index, setIndex] = useState(() => Math.max(0, images.findIndex((i) => i.id === startId)));
    const touchX = useRef<number | null>(null);
    const image = images[index];

    const go = (delta: number) => setIndex((i) => Math.min(images.length - 1, Math.max(0, i + delta)));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') go(-1);
            if (e.key === 'ArrowRight') go(1);
        };
        window.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!image) return null;

    const arrow = 'absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 sm:flex';

    return (
        <div
            className="fixed inset-0 z-[75] flex flex-col text-white"
            style={{ backgroundColor: 'rgba(8, 10, 14, 0.96)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Visionneuse de photos"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
                touchX.current = null;
            }}
        >
            <div className="flex items-center gap-3 px-4 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-semibold">{image.sender_name ?? 'EEHT Connect'}</p>
                    <p className="text-xs text-white/60">
                        {dayLabel(image.created_at)} à {clockTime(image.created_at)}
                        {images.length > 1 && ` · ${index + 1} / ${images.length}`}
                    </p>
                </div>
                <a href={`${image.url}?download=1`} className="rounded-full p-2.5 hover:bg-white/10" aria-label="Télécharger la photo" title="Télécharger">
                    <Download className="h-5 w-5" />
                </a>
                <button onClick={onClose} className="rounded-full p-2.5 hover:bg-white/10" aria-label="Fermer la visionneuse">
                    <X className="h-6 w-6" />
                </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-20" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <img key={image.id} src={image.url} alt={image.name} className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl" draggable={false} />
                <button onClick={() => go(-1)} disabled={index === 0} className={`${arrow} left-4`} aria-label="Photo précédente">
                    <ChevronLeft className="h-7 w-7" />
                </button>
                <button onClick={() => go(1)} disabled={index === images.length - 1} className={`${arrow} right-4`} aria-label="Photo suivante">
                    <ChevronRight className="h-7 w-7" />
                </button>
            </div>

            {images.length > 1 && (
                <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                    {images.map((img, i) => (
                        <button
                            key={img.id}
                            onClick={() => setIndex(i)}
                            className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            aria-label={`Photo ${i + 1}`}
                        >
                            <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
