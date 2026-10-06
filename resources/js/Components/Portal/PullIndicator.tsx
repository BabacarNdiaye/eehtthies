import { PULL_THRESHOLD } from '@/hooks/usePullToRefresh';
import { RefreshCw } from 'lucide-react';

/** Pastille « tirer pour actualiser » qui descend avec le doigt, puis tourne pendant le rechargement. */
export default function PullIndicator({ pull, refreshing }: { pull: number; refreshing: boolean }) {
    if (pull <= 0 && !refreshing) return null;

    const progress = Math.min(1, pull / PULL_THRESHOLD);

    return (
        <div
            className="pointer-events-none fixed inset-x-0 z-[55] flex justify-center"
            style={{
                top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
                transform: `translateY(${refreshing ? 24 : pull * 0.6}px)`,
                opacity: refreshing ? 1 : progress,
            }}
            role="status"
            aria-label={refreshing ? 'Actualisation en cours' : 'Tirez pour actualiser'}
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-elevated ring-1 ring-ink-100">
                <RefreshCw
                    className={`h-5 w-5 text-ink-700 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
                />
            </span>
        </div>
    );
}
