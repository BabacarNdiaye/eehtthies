import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Repli élégant utilisé partout où une image téléversée (formation, diaporama, photo d'enseignant, média de
 * galerie, logo de partenaire, photo de témoignage, image d'actualité ou d'événement...) pourrait manquer.
 * Affiche un bloc dégradé chaud encre/or avec soit une grande initiale, soit une icône lucide centrée, au
 * lieu d'une <img> cassée ou d'une boîte grise générique.
 */
export default function ImagePlaceholder({
    label,
    icon: Icon,
    className = '',
    tone = 'ink',
}: {
    label?: string;
    icon?: LucideIcon;
    className?: string;
    tone?: 'ink' | 'gold';
}) {
    const gradient =
        tone === 'gold'
            ? 'from-gold-200 via-gold-100 to-white'
            : 'from-ink-900 via-ink-800 to-ink-700';

    const textColor = tone === 'gold' ? 'text-gold-600' : 'text-gold-400';

    return (
        <div
            className={`flex items-center justify-center overflow-hidden bg-gradient-to-br ${gradient} ${className}`}
        >
            {Icon ? (
                <Icon className={`h-8 w-8 ${textColor} opacity-90`} strokeWidth={1.5} />
            ) : (
                <span className={`font-serif text-3xl font-bold ${textColor}`}>
                    {label ?? 'E'}
                </span>
            )}
        </div>
    );
}

export function PatternOverlay(): ReactNode {
    return (
        <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
                backgroundImage:
                    'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '22px 22px',
            }}
        />
    );
}
