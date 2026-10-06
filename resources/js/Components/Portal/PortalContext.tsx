import { createContext, useContext } from 'react';

export interface PortalContextValue {
    /** Messages et annonces non lus d'EEHT Connect (0 tant que la première interrogation n'est pas revenue). */
    unread: number;
    openMenu: () => void;
    /** Ouvre la carte d'étudiant plein écran (espace élève seulement). */
    openCard: () => void;
}

/** Données partagées entre la coque des espaces (PortalLayout) et les écrans d'accueil qu'elle contient. */
export const PortalContext = createContext<PortalContextValue>({ unread: 0, openMenu: () => undefined, openCard: () => undefined });

export const usePortal = () => useContext(PortalContext);
