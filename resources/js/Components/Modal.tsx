import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { PropsWithChildren, useCallback, useState } from 'react';

/**
 * Fenêtre modale. À partir de sm : carte centrée. Sur téléphone : feuille qui monte du bas de l'écran, pleine
 * largeur, avec une poignée — le pouce l'atteint sans lâcher le téléphone, et le clavier virtuel ne la masque pas.
 * Son nom pour les lecteurs d'écran est `label` s'il est donné, sinon le premier titre qu'elle affiche.
 */
export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => {},
    label,
}: PropsWithChildren<{
    show: boolean;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    closeable?: boolean;
    onClose: CallableFunction;
    label?: string;
}>) {
    const [heading, setHeading] = useState<string>();

    // Les neuf fenêtres de l'application s'ouvrent sur un <h2> : son texte nomme la boîte sans que chacune ait à le
    // répéter. (Headless UI pose lui-même `aria-labelledby` et écraserait le nôtre : on passe par `aria-label`.)
    const panelRef = useCallback((panel: HTMLDivElement | null) => {
        const title = panel?.querySelector<HTMLElement>('h1, h2, h3')?.textContent?.trim();

        if (title) setHeading(title);
    }, []);

    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];

    return (
        <Transition show={show} leave="duration-200">
            <Dialog
                as="div"
                id="modal"
                className="fixed inset-0 z-[60] flex transform items-end overflow-y-auto transition-all sm:items-center sm:px-0 sm:py-6"
                onClose={close}
                aria-label={label ?? heading}
            >
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" />
                </TransitionChild>

                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
                >
                    <DialogPanel
                        ref={panelRef}
                        className={`relative w-full transform overflow-hidden rounded-t-3xl bg-white shadow-elevated transition-all max-sm:max-h-[92vh] max-sm:overflow-y-auto sm:mx-auto sm:mb-6 sm:rounded-xl ${maxWidthClass}`}
                        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                    >
                        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
                            <span className="h-1.5 w-12 rounded-full bg-ink-200" />
                        </div>
                        {children}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
