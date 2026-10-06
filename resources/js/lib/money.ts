const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/**
 * Montant en francs CFA : « 1 247 500 FCFA ». Les milliers sont séparés par une espace insécable ordinaire et non par
 * l'espace fine du format français, presque invisible dans la police à empattement des titres (« 1247500 »). La devise
 * reste collée au nombre : un montant ne se coupe jamais en fin de ligne.
 */
export function fcfa(value: number | string): string {
    return `${formatter.format(Math.round(Number(value))).replace(/ /g, ' ')} FCFA`;
}
