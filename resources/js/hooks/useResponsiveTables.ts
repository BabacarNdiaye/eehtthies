import { RefObject, useLayoutEffect, useState } from 'react';

const CARDS_QUERY = '(max-width: 767px)';

/** Au-delà de ce nombre de caractères, un libellé de colonne ne tient plus sur une ligne dans la marge de la carte. */
const LONG_LABEL = 13;

/** Le texte d'en-tête qui désigne la colonne des boutons d'une ligne (modifier, supprimer…). */
const isActionsLabel = (label: string) => /^actions$/i.test(label);

function setAttr(element: Element, name: string, value: string) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function removeAttr(element: Element, name: string) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
}

/** Un tableau « matrice » (balance, grand livre, mensualités…) se garde en tableau : `data-table="scroll"`. */
function isOptedOut(table: HTMLTableElement): boolean {
    return table.dataset.table === 'scroll' || table.closest('[data-table="scroll"]') !== null;
}

/**
 * Un tableau « matrice » défile en largeur sur téléphone. S'il ne contient rien de focalisable (un relevé de notes),
 * le clavier ne peut pas le faire défiler : son conteneur reçoit donc le focus et un nom — le titre de la carte qui
 * l'entoure, sinon celui de la page.
 */
function makeScrollerFocusable(table: HTMLTableElement) {
    const scroller = table.parentElement;

    if (!scroller?.classList.contains('overflow-x-auto')) return;

    setAttr(scroller, 'tabindex', '0');
    setAttr(scroller, 'role', 'region');

    if (!scroller.hasAttribute('aria-label')) {
        const heading = scroller.parentElement?.querySelector('h2, h3') ?? document.querySelector('main h1');

        setAttr(scroller, 'aria-label', heading?.textContent?.replace(/\s+/g, ' ').trim() || 'Tableau');
    }
}

/**
 * Prépare un tableau à devenir une liste de cartes sous 768 px : chaque cellule reçoit le libellé de sa colonne
 * (`data-label`), la cellule titre (`data-title`) et la cellule des boutons (`data-actions`) sont repérées. Seuls des
 * attributs sont posés — jamais de nœud ajouté ni déplacé — pour ne pas gêner React ; le CSS fait le reste.
 */
function enhance(table: HTMLTableElement, cardMode: boolean) {
    if (isOptedOut(table)) {
        makeScrollerFocusable(table);

        return;
    }

    const headRow = table.tHead?.rows[0];

    if (!headRow) return;

    const labels: string[] = [];
    const hiddenColumns = new Set<number>();
    let titleColumn = -1;
    let firstNamedColumn = -1;

    for (const cell of Array.from(headRow.cells)) {
        const text = (cell.textContent ?? '').replace(/\s+/g, ' ').trim();

        for (let index = 0; index < cell.colSpan; index++) {
            const column = labels.length;

            labels.push(index === 0 ? text : '');

            // `data-card-hide` sur un <th> : cette colonne n'a pas de sens sur une carte (un code QR, par exemple).
            if (cell.hasAttribute('data-card-hide')) hiddenColumns.add(column);
            if (index === 0 && cell.hasAttribute('data-card-title') && titleColumn < 0) titleColumn = column;
            if (index === 0 && text !== '' && !isActionsLabel(text) && firstNamedColumn < 0) firstNamedColumn = column;
        }
    }

    // Par défaut le titre de la carte est la première colonne qui porte un nom (une colonne sans nom en tête — un
    // point « non lu », une case — n'est pas un titre) ; une colonne d'en-tête `data-card-title` l'emporte.
    if (titleColumn < 0) titleColumn = firstNamedColumn;

    setAttr(table, 'data-cards', '');
    cardMode ? setAttr(table, 'data-cards-on', '') : removeAttr(table, 'data-cards-on');

    if (cardMode) {
        setAttr(table, 'role', 'table');
        setAttr(table.tHead!, 'role', 'rowgroup');
        setAttr(headRow, 'role', 'row');
        Array.from(headRow.cells).forEach((cell) => setAttr(cell, 'role', 'columnheader'));
    } else {
        [table, table.tHead!, headRow, ...Array.from(headRow.cells)].forEach((element) => removeAttr(element, 'role'));
    }

    for (const body of Array.from(table.tBodies)) {
        cardMode ? setAttr(body, 'role', 'rowgroup') : removeAttr(body, 'role');

        for (const row of Array.from(body.rows)) {
            cardMode ? setAttr(row, 'role', 'row') : removeAttr(row, 'role');

            const cells = Array.from(row.cells);
            // Une ligne dont l'unique cellule s'étend sur tout le tableau est un intitulé de section ou un message
            // (« Aucun élève ») : ce n'est pas une carte.
            const single = cells.length === 1 && cells[0].colSpan > 1;

            single ? setAttr(row, 'data-single', '') : removeAttr(row, 'data-single');

            let column = 0;
            let hasActions = false;

            for (const cell of cells) {
                cardMode ? setAttr(cell, 'role', 'cell') : removeAttr(cell, 'role');

                if (cell.colSpan > 1) {
                    column += cell.colSpan;

                    continue;
                }

                const label = labels[column] ?? '';
                const isActions = isActionsLabel(label) || (label === '' && column === labels.length - 1 && column > 0 && column !== titleColumn);

                setAttr(cell, 'data-label', isActions ? '' : label);

                // Un libellé long passe sur deux lignes dans la marge de la carte : la cellule garde la place.
                label.length > LONG_LABEL && !isActions && column !== titleColumn
                    ? setAttr(cell, 'data-long-label', '')
                    : removeAttr(cell, 'data-long-label');

                if (isActions) {
                    setAttr(cell, 'data-actions', '');
                    hasActions = true;
                } else {
                    removeAttr(cell, 'data-actions');
                }

                column === titleColumn ? setAttr(cell, 'data-title', '') : removeAttr(cell, 'data-title');
                hiddenColumns.has(column) ? setAttr(cell, 'data-hide', '') : removeAttr(cell, 'data-hide');
                column++;
            }

            hasActions ? setAttr(row, 'data-has-actions', '') : removeAttr(row, 'data-has-actions');
        }
    }
}

/**
 * Tableaux d'administration : sous 768 px, chaque ligne devient une carte (le CSS de `app.css` s'en charge, ce hook
 * ne fournit que les libellés). Le balisage des 66 pages à tableaux est le même (`<table>` + `<thead>`), d'où cette
 * amélioration progressive plutôt qu'une réécriture page par page. Un `MutationObserver` rattrape les lignes que
 * React ajoute après coup (filtre, page suivante) avant la peinture suivante.
 */
export default function useResponsiveTables(rootRef: RefObject<HTMLElement>, grid = false): boolean {
    const [hasTables, setHasTables] = useState(false);

    useLayoutEffect(() => {
        const root = rootRef.current;

        if (!root) return;

        const media = window.matchMedia(CARDS_QUERY);
        const run = () => {
            const tables = Array.from(root.querySelectorAll('table'));

            tables.forEach((table) => enhance(table, media.matches || (grid && !table.hasAttribute('data-own-view'))));
            // Le bouton Liste / Grille n'a de sens que si la page porte au moins un tableau convertible.
            setHasTables(tables.some((table) => !isOptedOut(table) && !table.hasAttribute('data-own-view') && !!table.tHead?.rows[0]));
        };

        run();

        const observer = new MutationObserver(run);

        observer.observe(root, { childList: true, subtree: true });
        media.addEventListener('change', run);

        return () => {
            observer.disconnect();
            media.removeEventListener('change', run);
        };
    }, [rootRef, grid]);

    return hasTables;
}
