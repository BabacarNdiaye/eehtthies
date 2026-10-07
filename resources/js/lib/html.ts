/**
 * Les libellés de pagination de Laravel portent des entités HTML (« &laquo; Précédent ») : on les décode en texte, sans
 * jamais injecter de HTML dans la page.
 */
export function decodeEntities(label: string): string {
    const box = document.createElement('textarea');
    box.innerHTML = label;

    return box.value;
}
