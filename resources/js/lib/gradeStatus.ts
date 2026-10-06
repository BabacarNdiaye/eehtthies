import { Grade, GradeStatus } from '@/types';

/** Le statut d'une note, avec repli sur l'ancienne case « absent » pour une réponse qui n'en porte pas. */
export function gradeStatusOf(grade?: Pick<Grade, 'status' | 'is_absent'> | null): GradeStatus {
    return grade?.status ?? (grade?.is_absent ? 'absent_non_justifie' : 'present');
}

/**
 * Ce que voit l'élève ou le parent à la place de la note : « Absent(e) » quand l'absence n'est pas justifiée (la note
 * vaut 0 au bulletin) ou « Absent(e) justifié(e) » (l'épreuve est ignorée). Null si l'élève était présent.
 */
export function absenceLabel(status: GradeStatus): string | null {
    if (status === 'absent_justifie') return 'Absent(e) justifié(e)';
    if (status === 'absent_non_justifie') return 'Absent(e)';

    return null;
}

/** Rappel affiché sous les feuilles de notes : ce que vaut chaque statut, et une note laissée vide. */
export const gradeStatusHint =
    "Absent(e) non justifié(e) : la note vaut 0 et compte dans la moyenne. Absent(e) justifié(e) : l'épreuve est ignorée. Une note laissée vide compte aussi 0.";
