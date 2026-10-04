import { PropsWithChildren } from 'react';

/**
 * Rangée d'enregistrement d'un formulaire. Ordinateur (≥ lg) : alignée à droite sous le formulaire, comme avant.
 * Téléphone et tablette : barre collée au bas de l'écran (le formulaire peut faire plusieurs écrans), boutons
 * en pleine largeur. Pour coller, elle doit avoir pour parent direct le <form> (ou le bloc qui contient toute
 * la page) : un `position: sticky` ne sort jamais de son parent.
 */
export default function FormActions({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
    return (
        <div
            className={`sticky bottom-0 z-20 -mx-4 flex items-center justify-end gap-3 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur max-lg:[&>*]:flex-1 max-lg:[&>*]:text-center sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none ${className}`}
        >
            {children}
        </div>
    );
}
