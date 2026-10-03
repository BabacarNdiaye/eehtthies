import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function playChime() {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        [880, 1320].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.0001, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.4);
        });
    } catch {
        // Web Audio non pris en charge ou bloqué — échec silencieux, le badge se met quand même à jour.
    }
}

/**
 * Badge de messages non lus + alerte sonore pour EEHT Connect (messages et annonces). Un clic dessus ouvre
 * EEHT Connect (passé via `href`).
 */
export default function NotificationBell({ href }: { href: string }) {
    const [count, setCount] = useState(0);
    const previousCount = useRef<number | null>(null);

    const fetchCount = async () => {
        try {
            const res = await window.axios.get(route('connect.unread-count'));
            const next = res.data.count as number;
            if (previousCount.current !== null && next > previousCount.current) {
                playChime();
            }
            previousCount.current = next;
            setCount(next);
        } catch {
            // On ignore les erreurs réseau passagères — la prochaine interrogation réessaiera.
        }
    };

    useEffect(() => {
        fetchCount();
        const id = setInterval(fetchCount, 20000);
        return () => clearInterval(id);
    }, []);

    return (
        <Link
            href={href}
            aria-label="Messages"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-50"
        >
            <Bell className="h-5 w-5" />
            {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                </span>
            )}
        </Link>
    );
}
