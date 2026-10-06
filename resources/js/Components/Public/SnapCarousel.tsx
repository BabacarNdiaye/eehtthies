import { Children, PropsWithChildren } from 'react';

interface Props {
    /** Nom de la liste pour les lecteurs d'écran. */
    label: string;
    /** Disposition en grille à partir de `sm` (classes `sm:` / `lg:`), p. ex. « sm:grid sm:grid-cols-2 lg:grid-cols-3 ». */
    gridClassName: string;
    /**
     * Rend la rangée accessible au clavier (flèches). Inutile quand les cartes contiennent des liens : le navigateur
     * fait défiler jusqu'au lien qui prend le focus. À activer pour des cartes sans lien (témoignages).
     */
    focusable?: boolean;
}

/**
 * Liste de cartes. Sur téléphone : une rangée qui se balaie au doigt (CSS scroll-snap), la carte suivante dépasse
 * pour montrer qu'il y en a d'autres. Dès `sm` : une grille.
 */
export default function SnapCarousel({ label, gridClassName, focusable = false, children }: PropsWithChildren<Props>) {
    return (
        <div
            role="group"
            aria-label={label}
            tabIndex={focusable ? 0 : undefined}
            className={`scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-gold-500 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 ${gridClassName}`}
        >
            {Children.map(children, (child) => (
                <div className="w-[84%] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">{child}</div>
            ))}
        </div>
    );
}
