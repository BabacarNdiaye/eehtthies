import { haptic } from '@/lib/portal';
import { Share2 } from 'lucide-react';

/**
 * Bouton « Partager » : ouvre la feuille de partage du téléphone (WhatsApp, SMS, e-mail…) quand le navigateur la
 * propose, sinon un message WhatsApp prérempli — le canal le plus utilisé localement. L'aperçu qui s'affiche chez le
 * destinataire vient des balises Open Graph écrites par le serveur (App\Support\Seo).
 */
export default function ShareButton({ title, className = '' }: { title: string; className?: string }) {
    const share = async () => {
        const url = window.location.href.split('#')[0];

        haptic();

        try {
            if (typeof navigator.share === 'function') {
                await navigator.share({ title, url });

                return;
            }
        } catch (error) {
            // L'utilisateur a fermé la feuille de partage : rien à faire.
            if ((error as Error).name === 'AbortError') return;
        }

        window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <button
            type="button"
            onClick={share}
            aria-label={`Partager : ${title}`}
            className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-full px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${className}`}
        >
            <Share2 className="h-4 w-4" />
            Partager
        </button>
    );
}
