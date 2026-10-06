import { IconButton } from '@/Components/Admin/IconButton';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';
import { Fragment, PropsWithChildren, ReactNode } from 'react';

interface Props {
    open: boolean;
    onClose: () => void;
    /** Nom de la fenêtre, pour tout le monde et pour les lecteurs d'écran. */
    title: string;
    /** Sous le titre : un matricule, une promotion… */
    subtitle?: ReactNode;
    /** Avant le titre, dans l'en-tête : un avatar. */
    lead?: ReactNode;
    /** Pied collé en bas, hors de la zone qui défile : les actions principales. */
    footer?: ReactNode;
}

/**
 * Volet qui s'ouvre sans quitter la page : feuille qui monte du bas sur téléphone (le pouce l'atteint, on la referme
 * en touchant le fond), panneau à droite à partir de sm (la liste reste visible à côté). Le focus y reste enfermé, Échap
 * le ferme, la page derrière ne défile plus : ce sont les réglages de Headless UI, comme pour `Modal`.
 */
export default function Drawer({ open, onClose, title, subtitle, lead, footer, children }: PropsWithChildren<Props>) {
    return (
        <Transition show={open} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-[60]">
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-ink-950/50 backdrop-blur-sm" aria-hidden="true" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-end justify-center sm:items-stretch sm:justify-end">
                    <TransitionChild
                        as={Fragment}
                        enter="transition duration-300 ease-fluid motion-reduce:transition-none"
                        enterFrom="translate-y-full sm:translate-y-0 sm:translate-x-full"
                        enterTo="translate-y-0 sm:translate-x-0"
                        leave="transition duration-200 ease-in motion-reduce:transition-none"
                        leaveFrom="translate-y-0 sm:translate-x-0"
                        leaveTo="translate-y-full sm:translate-y-0 sm:translate-x-full"
                    >
                        <DialogPanel className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-elevated outline-none sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-3xl">
                            {/* Des blocs, pas des <header> et <footer> : dans une boîte de dialogue ils compteraient comme des repères « bandeau » et « pied de page » de plus. */}
                            <div className="flex items-start gap-3 border-b border-ink-100 px-5 pb-4 pt-5">
                                {lead}
                                <div className="min-w-0 flex-1">
                                    <DialogTitle as="h2" className="font-serif text-lg font-bold leading-snug text-ink-900">
                                        {title}
                                    </DialogTitle>
                                    {subtitle && <div className="mt-0.5 text-sm text-ink-500">{subtitle}</div>}
                                </div>
                                <IconButton label="Fermer" onClick={onClose}>
                                    <X className="h-5 w-5" aria-hidden="true" />
                                </IconButton>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

                            {footer && (
                                <div className="border-t border-ink-100 bg-white px-5 pt-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                                    {footer}
                                </div>
                            )}
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
}
