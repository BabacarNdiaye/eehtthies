export const MONTH_LABELS: Record<number, string> = {
    1: 'Janvier',
    2: 'Février',
    3: 'Mars',
    4: 'Avril',
    5: 'Mai',
    6: 'Juin',
    7: 'Juillet',
    8: 'Août',
    9: 'Septembre',
    10: 'Octobre',
    11: 'Novembre',
    12: 'Décembre',
};

/** Default school-year month sequence (Sept → June), mirrors Invoice::SCHOOL_MONTHS in PHP. */
export const SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
