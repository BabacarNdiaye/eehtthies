import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Conserve l'événement « beforeinstallprompt » dès le chargement de l'application — même si la bannière
 * d'installation a été fermée — pour que la feuille Menu des espaces puisse proposer « Installer l'application ».
 */
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferred = event as BeforeInstallPromptEvent;
        emit();
    });

    window.addEventListener('appinstalled', () => {
        deferred = null;
        emit();
    });
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Vrai tant que le navigateur propose l'installation (jamais dans l'application déjà installée). */
export function useCanInstall(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => deferred !== null,
        () => false,
    );
}

/** Ouvre l'invite d'installation du navigateur ; renvoie vrai si l'utilisateur accepte. */
export async function promptInstall(): Promise<boolean> {
    if (!deferred) return false;

    const event = deferred;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null;
    emit();

    return outcome === 'accepted';
}
