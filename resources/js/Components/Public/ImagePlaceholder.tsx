import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Elegant fallback used everywhere an uploaded image (formation, slider,
 * teacher photo, gallery media, partner logo, testimonial photo, news/event
 * image...) might be missing. Renders a warm ink/gold gradient block with
 * either a big initial letter or a centered lucide icon, instead of a
 * broken <img> or a generic gray box.
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
