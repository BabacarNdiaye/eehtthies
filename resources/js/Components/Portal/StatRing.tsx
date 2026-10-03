import { averageTone, formatAverage } from '@/lib/portal';
import { useEffect, useState } from 'react';

const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Anneau de progression d'une moyenne sur 20 : vert, doré ou rouge selon le niveau, dessiné avec une courte
 * animation à l'affichage. Sans note, l'anneau reste vide.
 */
export default function StatRing({ value, label }: { value: number | null; label: string }) {
    const [drawn, setDrawn] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setDrawn(true));

        return () => cancelAnimationFrame(id);
    }, []);

    const progress = value === null ? 0 : Math.min(1, value / 20);
    const tone = value === null ? null : averageTone(value);

    return (
        <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="relative h-[72px] w-[72px]" role="img" aria-label={value === null ? `${label} : aucune note` : `${label} : ${formatAverage(value)} sur 20`}>
                <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                    <circle cx="36" cy="36" r={RADIUS} fill="none" strokeWidth="7" className="stroke-ink-100" />
                    <circle
                        cx="36"
                        cy="36"
                        r={RADIUS}
                        fill="none"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={drawn ? CIRCUMFERENCE * (1 - progress) : CIRCUMFERENCE}
                        className={`${tone?.ring ?? 'stroke-ink-200'} transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none`}
                    />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-base font-bold ${tone?.text ?? 'text-ink-300'}`}>
                    {value === null ? '—' : formatAverage(value)}
                </span>
            </div>
            <span className="text-[11px] font-medium leading-tight text-ink-500">{label}</span>
        </div>
    );
}
