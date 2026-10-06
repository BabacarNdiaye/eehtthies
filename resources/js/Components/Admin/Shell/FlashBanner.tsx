import { X } from 'lucide-react';
import { useState } from 'react';

/** Bandeau de confirmation ou d'erreur sous l'en-tête ; annoncé par les lecteurs d'écran (status / alert). */
export default function FlashBanner({ message, tone }: { message: string; tone: 'success' | 'error' }) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const toneClasses = tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';

    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={`mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium animate-fade-in-up sm:mx-6 ${toneClasses}`}
        >
            <span>{message}</span>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Fermer"
                className="rounded-md p-1 transition-colors hover:bg-black/5"
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
