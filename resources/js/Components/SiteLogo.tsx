import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PageProps } from '@/types';

/** Logo EEHT d'origine, livré avec l'application : il s'affiche même sans lien public/storage. */
export const DEFAULT_LOGO = '/images/logo-eeht.png';

/**
 * Affiche le logo téléversé dans Admin ▸ Paramètres ; si aucun n'est défini (ou s'il est introuvable sur le serveur),
 * affiche le logo EEHT d'origine.
 */
export default function SiteLogo({
    size = 40,
    className = '',
}: {
    size?: number;
    /** Conservé pour compatibilité : le logo d'origine n'a pas de variante claire/foncée. */
    tone?: 'dark' | 'gold';
    className?: string;
}) {
    const { props } = usePage<PageProps>();
    const uploaded = props.siteSettings?.site_logo;
    const [broken, setBroken] = useState(false);
    const src = uploaded && !broken ? `/storage/${uploaded.replace(/^\/+/, '')}` : DEFAULT_LOGO;

    return (
        <span
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ${className}`}
            style={{ width: size, height: size }}
        >
            <img
                src={src}
                alt={props.siteSettings?.site_short_name ?? 'EEHT'}
                className="h-full w-full object-contain"
                onError={() => setBroken(true)}
            />
        </span>
    );
}
