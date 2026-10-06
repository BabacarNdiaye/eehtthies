import Modal from '@/Components/Modal';
import { DialogRequest, registerDialogHost } from '@/lib/confirm';
import { AlertTriangle, Info } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Affiche les boîtes demandées par confirmAction() et alertAction() (lib/confirm.ts) : feuille basse sur téléphone,
 * carte centrée ensuite. À monter une seule fois, dans app.tsx. Échap, le fond et « Annuler » répondent « non » ;
 * pour une suppression, le focus commence sur « Annuler » (un Entrée distrait ne supprime rien).
 */
export default function ConfirmHost() {
    const [request, setRequest] = useState<DialogRequest | null>(null);
    const [open, setOpen] = useState(false);
    const current = useRef<DialogRequest | null>(null);
    const safeRef = useRef<HTMLButtonElement>(null);

    useEffect(
        () =>
            registerDialogHost((next) => {
                // Une seconde demande pendant qu'une boîte est ouverte : la première est refusée.
                current.current?.resolve(false);
                current.current = next;
                setRequest(next);
                setOpen(true);
            }),
        [],
    );

    const answer = useCallback((accepted: boolean) => {
        current.current?.resolve(accepted);
        current.current = null;
        setOpen(false);
    }, []);

    // Le focus va au bouton le plus sûr : « Annuler » pour une suppression, « Valider » sinon. headlessui place d'abord
    // le focus sur la fenêtre elle-même ; on attend qu'il ait fini (80 ms), au risque sinon de se le faire reprendre.
    useEffect(() => {
        if (!open) return;

        const timer = window.setTimeout(() => safeRef.current?.focus(), 80);

        return () => window.clearTimeout(timer);
    }, [open, request]);

    const danger = request?.tone === 'danger';
    const Icon = danger ? AlertTriangle : Info;

    return (
        <Modal show={open} onClose={() => answer(false)} maxWidth="sm">
            {request && (
                <div className="p-6">
                    <div className="flex gap-4">
                        <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-100 text-red-700' : 'bg-gold-100 text-gold-800'}`}
                        >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="font-serif text-lg font-bold text-ink-900">{request.title}</h2>
                            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-600">{request.message}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {request.kind === 'confirm' && (
                            <button
                                ref={danger ? safeRef : undefined}
                                type="button"
                                onClick={() => answer(false)}
                                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink-200 px-5 text-sm font-semibold text-ink-700 outline-none transition-colors hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500"
                            >
                                {request.cancelLabel}
                            </button>
                        )}
                        <button
                            ref={danger ? undefined : safeRef}
                            type="button"
                            onClick={() => answer(true)}
                            className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                danger ? 'bg-red-700 hover:bg-red-800 focus-visible:ring-red-600' : 'bg-ink-900 hover:bg-ink-800 focus-visible:ring-gold-500'
                            }`}
                        >
                            {request.confirmLabel}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
