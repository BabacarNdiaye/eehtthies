import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'eeht-pwa-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isDismissed(): boolean {
    try {
        return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
        return false;
    }
}

function dismiss() {
    try {
        localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
        // ignore — banner will just show again next visit, harmless
    }
}

function isStandalone(): boolean {
    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
}

function isIos(): boolean {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PwaInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showIosHint, setShowIosHint] = useState(false);
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        if (isStandalone() || isDismissed()) {
            return;
        }
        setDismissed(false);

        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', onBeforeInstall);

        if (isIos()) {
            setShowIosHint(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    }, []);

    if (dismissed || (!deferredPrompt && !showIosHint)) {
        return null;
    }

    const close = () => {
        dismiss();
        setDismissed(true);
    };

    const install = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        close();
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
            <div className="w-full max-w-md rounded-xl border border-ink-100 bg-white p-4 shadow-lg">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white">
                        {showIosHint && !deferredPrompt ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 text-sm">
                        {deferredPrompt ? (
                            <>
                                <p className="font-semibold text-ink-900">Installer l'application EEHT</p>
                                <p className="text-ink-500">Accès rapide depuis votre écran d'accueil, comme une vraie application.</p>
                            </>
                        ) : (
                            <>
                                <p className="font-semibold text-ink-900">Installer sur votre iPhone</p>
                                <p className="text-ink-500">
                                    Appuyez sur <Share className="inline h-3.5 w-3.5" /> puis « Sur l'écran d'accueil ».
                                </p>
                            </>
                        )}
                    </div>
                    <button onClick={close} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-50" title="Fermer">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {deferredPrompt && (
                    <button
                        onClick={install}
                        className="mt-3 w-full rounded-lg bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800"
                    >
                        Installer
                    </button>
                )}
            </div>
        </div>
    );
}
