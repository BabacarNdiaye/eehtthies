import useDialogFocus from '@/hooks/useDialogFocus';
import { haptic } from '@/lib/portal';
import { PointerEvent, PropsWithChildren, useRef, useState } from 'react';

interface Props {
    open: boolean;
    /** Doit être stable (useCallback) : le piège de focus s'y accroche. */
    onClose: () => void;
    /** Nom accessible de la boîte de dialogue. */
    label: string;
}

/**
 * Feuille qui monte du bas de l'écran (téléphone et tablette). Se ferme au toucher du fond, par la touche Échap
 * ou en la glissant vers le bas ; le focus y reste enfermé tant qu'elle est ouverte. Partagée par la feuille Menu
 * des espaces et par celle du site public.
 */
export default function BottomSheet({ open, onClose, label, children }: PropsWithChildren<Props>) {
    const panelRef = useRef<HTMLDivElement>(null);
    const startY = useRef<number | null>(null);
    const [dragY, setDragY] = useState(0);

    useDialogFocus(open, panelRef, onClose);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        startY.current = event.clientY;
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (startY.current !== null) setDragY(Math.max(0, event.clientY - startY.current));
    };
    const onPointerUp = () => {
        if (dragY > 90) {
            haptic();
            onClose();
        }
        startY.current = null;
        setDragY(0);
    };

    const dragging = startY.current !== null;

    return (
        <div
            className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`}
            aria-hidden={!open}
            // Fermée, la feuille est retirée de l'arbre d'accessibilité et du parcours clavier, mais seulement une
            // fois l'animation de descente terminée (300 ms).
            style={{ visibility: open ? 'visible' : 'hidden', transition: `visibility 0s linear ${open ? 0 : 300}ms` }}
        >
            <div
                className={`absolute inset-0 bg-ink-950/50 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${
                    open ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={onClose}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                className={`absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] bg-white outline-none motion-reduce:transition-none ${
                    dragging ? '' : 'transition-transform duration-300 ease-fluid'
                }`}
                style={{
                    transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
                    paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
                }}
            >
                <div
                    className="flex cursor-grab touch-none justify-center pb-2 pt-3 active:cursor-grabbing"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    <span className="h-1.5 w-12 rounded-full bg-ink-200" />
                </div>

                {children}
            </div>
        </div>
    );
}
