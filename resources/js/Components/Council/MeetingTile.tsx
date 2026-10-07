import { MicOff } from 'lucide-react';
import { useEffect, useRef } from 'react';

const initials = (name: string | null) =>
    (name ?? '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

/** Vignette d'un participant de la visioconférence : son image, sinon ses initiales ; le son passe par la même balise. */
export default function MeetingTile({ name, stream, muted, cam, mic, self, compact = false }: { name: string | null; stream: MediaStream | null; muted?: boolean; cam: boolean; mic: boolean; self?: boolean; compact?: boolean }) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (ref.current && stream && ref.current.srcObject !== stream) {
            ref.current.srcObject = stream;
            ref.current.play().catch(() => undefined);
        }
    }, [stream]);

    return (
        <li className={`relative aspect-video shrink-0 overflow-hidden rounded-xl bg-ink-800 ring-1 ring-white/10 ${compact ? 'w-32 sm:w-36' : 'w-full'} ${self ? 'ring-gold-400/50' : ''}`}>
            <video ref={ref} autoPlay playsInline muted={muted} className={`h-full w-full object-cover ${self ? '-scale-x-100' : ''} ${cam ? '' : 'invisible'}`} />
            {!cam && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900">
                    <span className={`flex items-center justify-center rounded-full bg-gold-500/20 font-semibold text-gold-200 ring-1 ring-gold-400/40 ${compact ? 'h-10 w-10 text-sm' : 'h-16 w-16 text-xl'}`} aria-hidden="true">
                        {initials(name)}
                    </span>
                </div>
            )}
            <p className={`absolute bottom-1 left-1 flex max-w-[calc(100%-0.5rem)] items-center gap-1 truncate rounded-full bg-black/60 font-medium text-white backdrop-blur ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}>
                {!mic && <MicOff className="h-3.5 w-3.5 shrink-0 text-red-300" aria-label="micro coupé" />}
                <span className="truncate">
                    {name}
                    {self && ' (vous)'}
                </span>
            </p>
        </li>
    );
}
