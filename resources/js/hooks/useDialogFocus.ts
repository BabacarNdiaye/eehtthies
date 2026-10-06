import { RefObject, useEffect, useRef } from 'react';

/**
 * Comportement commun des fenêtres modales (feuille Menu, carte plein écran) : le focus entre dans la fenêtre,
 * la touche Échap la ferme, Tab reste à l'intérieur, la page derrière ne défile plus, et le focus est rendu à
 * l'élément qui l'avait ouverte. `onClose` doit être stable (useCallback).
 */
export default function useDialogFocus(open: boolean, panelRef: RefObject<HTMLElement>, onClose: () => void) {
    const opener = useRef<Element | null>(null);

    useEffect(() => {
        if (!open) return;

        opener.current = document.activeElement;
        panelRef.current?.focus();

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();

                return;
            }

            if (event.key === 'Tab' && panelRef.current) {
                const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };

        document.addEventListener('keydown', onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
            (opener.current as HTMLElement | null)?.focus?.();
        };
    }, [open, onClose, panelRef]);
}
