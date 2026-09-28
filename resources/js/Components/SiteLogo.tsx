import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

/**
 * Renders the school's uploaded logo when one has been set in Admin ▸ Paramètres,
 * falling back to the styled monogram badge used throughout the app otherwise.
 */
export default function SiteLogo({
    size = 40,
    tone = 'dark',
    className = '',
}: {
    size?: number;
    tone?: 'dark' | 'gold';
    className?: string;
}) {
    const { props } = usePage<PageProps>();
    const logo = props.siteSettings?.site_logo;

    if (logo) {
        return (
            <span
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ${className}`}
                style={{ width: size, height: size }}
            >
                <img src={`/storage/${logo}`} alt={props.siteSettings.site_short_name} className="h-full w-full object-contain" />
            </span>
        );
    }

    const toneClasses = tone === 'gold' ? 'bg-gold-500 text-ink-900' : 'bg-ink-900 text-gold-400';

    return (
        <span
            className={`flex shrink-0 items-center justify-center rounded-full font-serif font-bold ${toneClasses} ${className}`}
            style={{ width: size, height: size, fontSize: size * 0.45 }}
        >
            E
        </span>
    );
}
