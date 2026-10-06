import StatusBadge from '@/Components/Admin/StatusBadge';
import { ContactActions, DossierMeter, StudentAvatar, StudentMenu, StudentPermissions } from '@/Components/Admin/Students/StudentParts';
import { fcfa } from '@/lib/money';
import { fullName, statusLabels, StudentRow } from '@/lib/students';
import { MouseEvent } from 'react';

interface Props {
    student: StudentRow;
    /** Écrire la classe sur la carte : inutile sous un en-tête de classe. */
    showClass: boolean;
    /** Écrire le statut d'un élève qui n'est pas « actif » : seulement quand la liste mêle plusieurs statuts. */
    showStatus: boolean;
    /** La fiche qu'on vient d'enregistrer : un liseré doré la signale un instant. */
    flash: boolean;
    can: StudentPermissions;
    onOpen: (student: StudentRow) => void;
    onDelete: (student: StudentRow) => void;
}

/**
 * Un élève en carte : qui il est, où il en est (statut seulement quand il sort de l'ordinaire, redoublement, dossier,
 * solde pour qui voit la comptabilité) et comment le joindre en un geste. Toute la carte ouvre l'aperçu du dossier ;
 * le nom est un vrai bouton pour le clavier et les lecteurs d'écran. Sur téléphone la carte devient une ligne compacte :
 * le bouton d'appel passe à droite du nom, le reste (WhatsApp, e-mail) est dans l'aperçu.
 */
export default function StudentCard({ student, showClass, showStatus, flash, can, onOpen, onDelete }: Props) {
    const name = fullName(student);
    const owing = student.balance !== undefined && student.balance > 0;
    const unassigned = showClass && !student.school_class;
    const statusBadge = showStatus && student.status !== 'actif';

    const open = (event: MouseEvent<HTMLElement>) => {
        // Toute la carte ouvre le dossier, sauf ses propres liens et boutons.
        if (!(event.target as HTMLElement).closest('a, button')) onOpen(student);
    };

    return (
        <article
            id={`student-${student.id}`}
            onClick={open}
            className={`flex scroll-mt-28 cursor-pointer flex-col gap-3 rounded-xl border bg-white p-4 shadow-soft transition duration-300 hover:shadow-elevated max-sm:gap-2 max-sm:p-3 ${
                flash ? 'border-gold-400 ring-2 ring-gold-400' : 'border-ink-100'
            }`}
        >
            <div className="flex items-start gap-2 max-sm:items-center">
                <button
                    type="button"
                    onClick={() => onOpen(student)}
                    aria-haspopup="dialog"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    <StudentAvatar student={student} />
                    <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink-900">{name}</span>
                        <span className="block truncate text-xs text-ink-500">
                            {student.matricule}
                            {showClass && student.school_class ? ` · ${student.school_class.name}` : ''}
                        </span>
                        {/* Sur téléphone, la complétude du dossier se glisse sous le matricule : une ligne de moins par élève. */}
                        <span className="mt-1 hidden max-sm:block">
                            <DossierMeter dossier={student.dossier} compact />
                        </span>
                    </span>
                </button>
                <ContactActions student={student} callOnly className="sm:hidden" />
                <StudentMenu student={student} can={can} onDelete={onDelete} />
            </div>

            {(statusBadge || student.is_repeating || unassigned || owing) && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {statusBadge && <StatusBadge status={student.status} label={statusLabels[student.status] ?? student.status} />}
                    {student.is_repeating && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                            Redoublant
                        </span>
                    )}
                    {unassigned && (
                        <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-500/20">À affecter</span>
                    )}
                    {owing && (
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                student.late ? 'bg-red-100 text-red-800 ring-red-600/20' : 'bg-amber-100 text-amber-800 ring-amber-600/20'
                            }`}
                        >
                            {student.late ? 'En retard · ' : 'Solde · '}
                            {fcfa(student.balance ?? 0)}
                        </span>
                    )}
                </div>
            )}

            <div className="max-sm:hidden">
                <DossierMeter dossier={student.dossier} />
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-3 max-sm:hidden">
                {student.contact.display ? (
                    <span className="min-w-0 truncate text-sm text-ink-700">
                        {student.contact.display}
                        {student.contact.owner === 'guardian' && <span className="text-ink-500"> · tuteur</span>}
                    </span>
                ) : (
                    <span className="text-sm text-ink-500">Aucun numéro</span>
                )}
                <ContactActions student={student} />
            </div>
        </article>
    );
}
