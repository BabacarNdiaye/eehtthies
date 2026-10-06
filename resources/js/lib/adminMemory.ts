/**
 * Petites mémoires de l'administration. Chaque page rend son propre AdminLayout : la coque est donc remontée à
 * chaque navigation, et ce qui doit survivre d'une page à l'autre vit ici.
 */

const RECENTS_KEY = 'eeht:admin-recents';
const LIST_PREFIX = 'eeht:admin-list:';
const MAX_RECENTS = 5;

/** État de la barre latérale d'ordinateur : défilement et groupe ouvert, conservés entre deux pages. */
export const sidebarMemory: { scrollTop: number; group: string | null | undefined } = {
    scrollTop: 0,
    group: undefined,
};

/** Noms des dernières rubriques visitées (la plus récente d'abord), pour la palette de recherche. */
export function readRecents(): string[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');

        return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === 'string') : [];
    } catch {
        return [];
    }
}

export function rememberRecent(routeName: string): void {
    try {
        const next = [routeName, ...readRecents().filter((name) => name !== routeName)].slice(0, MAX_RECENTS);

        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
        // Stockage indisponible (navigation privée…) : la palette se passera de l'historique.
    }
}

/** Retient l'adresse exacte d'une liste (filtres et page compris) pour que « Retour » depuis une fiche y ramène. */
export function rememberListUrl(routeName: string, url: string): void {
    try {
        sessionStorage.setItem(LIST_PREFIX + routeName, url);
    } catch {
        // Sans conséquence : le retour se fera vers la liste sans filtre.
    }
}

export function recallListUrl(routeName: string): string | null {
    try {
        return sessionStorage.getItem(LIST_PREFIX + routeName);
    } catch {
        return null;
    }
}
