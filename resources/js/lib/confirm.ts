/**
 * Boîtes de confirmation de l'application, à la place de `confirm()` et `alert()` du navigateur (qui s'affichent
 * « 127.0.0.1 indique… », ne se stylent pas et se comportent mal dans une application installée sur téléphone).
 *
 *     if (await confirmAction('Supprimer cet élève ?')) router.delete(...);
 *
 * Le composant ConfirmHost (monté une fois dans app.tsx) affiche la boîte ; tant qu'il n'est pas monté (tests,
 * pages hors Inertia), on retombe sur la boîte native.
 */
export interface DialogOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** `danger` met le bouton de validation en rouge ; déduit du texte quand il n'est pas donné. */
    tone?: 'danger' | 'default';
}

export interface DialogRequest extends DialogOptions {
    kind: 'confirm' | 'alert';
    tone: 'danger' | 'default';
    title: string;
    confirmLabel: string;
    cancelLabel: string;
    resolve: (accepted: boolean) => void;
}

type Host = (request: DialogRequest) => void;

let host: Host | null = null;

/** Appelé par ConfirmHost à son montage ; renvoie la fonction qui le désinscrit. */
export function registerDialogHost(handler: Host): () => void {
    host = handler;

    return () => {
        if (host === handler) host = null;
    };
}

const DANGER = /supprim|retir|effac|irréversible|définitiv|réinitialis|abandon|exclu/i;

/** Complète les options : ton, titre et libellés se déduisent du texte (« Supprimer … ? » → bouton rouge « Supprimer »). */
function complete(input: string | DialogOptions, kind: DialogRequest['kind']): Omit<DialogRequest, 'resolve'> {
    const options = typeof input === 'string' ? { message: input } : input;
    const tone = options.tone ?? (kind === 'confirm' && DANGER.test(options.message) ? 'danger' : 'default');
    const verb = /^(Supprimer|Retirer|Effacer)\b/i.exec(options.message)?.[1];

    return {
        kind,
        tone,
        message: options.message,
        title: options.title ?? (kind === 'alert' ? 'Information' : tone === 'danger' ? 'Confirmer cette action' : 'Confirmation'),
        confirmLabel: options.confirmLabel ?? (kind === 'alert' ? 'Compris' : verb ? verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase() : 'Confirmer'),
        cancelLabel: options.cancelLabel ?? 'Annuler',
    };
}

/** Demande une confirmation : vrai si l'utilisateur valide, faux s'il annule, ferme la boîte ou appuie sur Échap. */
export function confirmAction(input: string | DialogOptions): Promise<boolean> {
    const request = complete(input, 'confirm');

    if (!host) return Promise.resolve(window.confirm(request.message));

    return new Promise((resolve) => host!({ ...request, resolve }));
}

/** Affiche une information que l'utilisateur doit lire avant de continuer (remplace `alert()`). */
export function alertAction(input: string | DialogOptions): Promise<void> {
    const request = complete(input, 'alert');

    if (!host) {
        window.alert(request.message);

        return Promise.resolve();
    }

    return new Promise((resolve) => host!({ ...request, resolve: () => resolve() }));
}
