import useMediaQuery from '@/hooks/useMediaQuery';

/**
 * Vrai sur téléphone (< 640 px) : les graphiques y ont besoin d'axes plus étroits et de libellés plus courts, faute de
 * quoi la zone de tracé ne laisse presque rien à la courbe.
 */
export default function useCompactChart(): boolean {
    return !useMediaQuery('(min-width: 640px)');
}

/** Raccourcit un libellé d'axe sur téléphone (« Certificat de Spécialité — Cuisine » → « Certificat de… »). */
export function axisLabel(text: string | number, compact: boolean, max = 14): string {
    const value = String(text);

    return compact && value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
