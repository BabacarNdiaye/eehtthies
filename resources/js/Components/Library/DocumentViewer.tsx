import { extensionOf } from '@/Components/Library/BookCover';
import { LibraryResourceRow } from '@/Components/Library/LibraryBrowser';
import PdfPages from '@/Components/Library/PdfPages';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Download, ExternalLink, FileWarning, X } from 'lucide-react';
import { Fragment } from 'react';

const IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export const fileUrl = (r: LibraryResourceRow) => `/storage/${(r.file_path ?? '').replace(/^\/+/, '')}`;

/** Un document s'ouvre dans la page quand le navigateur sait l'afficher (PDF, images) ; les autres se téléchargent. */
export const isViewable = (r: LibraryResourceRow) => r.type === 'document' && !!r.file_path;

/**
 * Lecteur de document : le fichier s'ouvre sur le même écran, dans une fenêtre qui couvre la page, avec une croix pour
 * fermer (Échap et le clic hors du lecteur aussi). Les PDF (lus par pdfjs, donc aussi sur téléphone) et les images s'affichent directement ; les formats Office
 * (Word, Excel, PowerPoint) ne peuvent pas être lus par le navigateur : le lecteur propose alors de les télécharger.
 */
export default function DocumentViewer({ resource, onClose }: { resource: LibraryResourceRow | null; onClose: () => void }) {
    const ext = resource ? extensionOf(resource.file_path) : '';
    const url = resource ? fileUrl(resource) : '';
    const isPdf = ext === 'pdf';
    const isImage = IMAGES.includes(ext);

    return (
        <Transition show={resource !== null} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-[70]">
                <TransitionChild as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-ink-950/70 backdrop-blur-sm" aria-hidden="true" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-stretch justify-center p-0 sm:p-4">
                    <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-[0.98]" enterTo="opacity-100 scale-100" leave="ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-[0.98]">
                        <DialogPanel className="flex w-full max-w-6xl flex-col overflow-hidden bg-white shadow-elevated outline-none sm:rounded-2xl">
                            <header className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-3">
                                <DialogTitle className="min-w-0 flex-1 truncate font-serif text-base font-bold text-ink-900 sm:text-lg">{resource?.title}</DialogTitle>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hidden items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-700 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500 sm:inline-flex"
                                >
                                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Nouvel onglet
                                </a>
                                <a
                                    href={url}
                                    download
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-700 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                                >
                                    <Download className="h-4 w-4" aria-hidden="true" />
                                    <span className="max-sm:sr-only">Télécharger</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Fermer le document"
                                    title="Fermer"
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-white outline-none transition hover:bg-ink-700 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                                >
                                    <X className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </header>

                            <div className="min-h-0 flex-1 overflow-y-auto bg-ink-100">
                                {resource && isPdf && <PdfPages key={url} url={url} />}
                                {resource && isImage && (
                                    <div className="flex h-full items-center justify-center overflow-auto p-4">
                                        <img src={url} alt={resource.title} className="max-h-full max-w-full rounded-lg object-contain shadow-soft" />
                                    </div>
                                )}
                                {resource && !isPdf && !isImage && (
                                    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink-400 shadow-soft">
                                            <FileWarning className="h-8 w-8" aria-hidden="true" />
                                        </span>
                                        <div>
                                            <p className="font-semibold text-ink-900">Ce document ne peut pas s'afficher ici</p>
                                            <p className="mt-1 max-w-md text-sm text-ink-500">Les fichiers {ext ? ext.toUpperCase() : 'de ce type'} (Word, Excel, PowerPoint…) s'ouvrent dans leur application : téléchargez-le pour le lire.</p>
                                        </div>
                                        <a href={url} download className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
                                            <Download className="h-4 w-4" aria-hidden="true" /> Télécharger le document
                                        </a>
                                    </div>
                                )}
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
}
