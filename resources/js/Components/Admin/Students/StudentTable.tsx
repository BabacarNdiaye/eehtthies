import Card from '@/Components/Admin/Card';
import StatusBadge from '@/Components/Admin/StatusBadge';
import { ContactActions, DossierMeter, StudentAvatar, StudentMenu, StudentPermissions } from '@/Components/Admin/Students/StudentParts';
import { fcfa } from '@/lib/money';
import { fullName, Section, statusLabels, studentCount, StudentRow } from '@/lib/students';
import { Fragment, MouseEvent } from 'react';

interface Props {
    sections: Section[];
    classCounts: Record<string, number>;
    /** Un en-tête par classe : la classe n'a alors pas à être répétée sur chaque ligne. */
    grouped: boolean;
    /** Écrire la classe sous le nom (une liste qui mêle plusieurs classes sans les séparer). */
    showClass: boolean;
    /** Écrire le statut d'un élève qui n'est pas « actif » : seulement quand la liste mêle plusieurs statuts. */
    showStatus: boolean;
    flashId: number | null;
    can: StudentPermissions;
    onOpen: (student: StudentRow) => void;
    onDelete: (student: StudentRow) => void;
}

const COLUMNS = 4;

/**
 * Le mode « Liste » : une ligne par élève, pour parcourir vite une promotion nombreuse. Quatre colonnes seulement (élève,
 * contact, dossier, actions) pour tenir sans défilement dans la colonne de la page, à côté du plan des promotions : la
 * classe, le statut, le redoublement et le solde se glissent sous le nom plutôt que de prendre chacun une colonne.
 * Réservé aux écrans à partir de lg ; en dessous, la liste est toujours en cartes.
 */
export default function StudentTable({ sections, classCounts, grouped, showClass, showStatus, flashId, can, onOpen, onDelete }: Props) {
    return (
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table data-own-view className="w-full text-left text-sm">
                    <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                        <tr>
                            <th className="px-3 py-3 sm:px-4">Élève</th>
                            <th className="px-3 py-3">Contact</th>
                            <th className="px-3 py-3">Dossier</th>
                            <th className="px-2 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {sections.map((section) => (
                            <Fragment key={section.key}>
                                {grouped && (
                                    <tr className="bg-ink-50/70">
                                        <th colSpan={COLUMNS} scope="colgroup" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-600 sm:px-4">
                                            {section.class?.name ?? 'À affecter'}
                                            <span className="ml-2 font-normal normal-case text-ink-500">{studentCount(classCounts[section.key] ?? section.students.length)}</span>
                                        </th>
                                    </tr>
                                )}
                                {section.students.map((student) => (
                                    <Row key={student.id} student={student} showClass={showClass} showStatus={showStatus} flash={student.id === flashId} can={can} onOpen={onOpen} onDelete={onDelete} />
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

const badge = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset';

function Row({
    student,
    showClass,
    showStatus,
    flash,
    can,
    onOpen,
    onDelete,
}: {
    student: StudentRow;
    showClass: boolean;
    showStatus: boolean;
    flash: boolean;
    can: StudentPermissions;
    onOpen: Props['onOpen'];
    onDelete: Props['onDelete'];
}) {
    const owing = student.balance !== undefined && student.balance > 0;
    const unassigned = showClass && !student.school_class;
    const open = (event: MouseEvent<HTMLElement>) => {
        if (!(event.target as HTMLElement).closest('a, button')) onOpen(student);
    };

    return (
        <tr id={`student-${student.id}`} onClick={open} className={`scroll-mt-28 cursor-pointer transition-colors duration-300 hover:bg-ink-50/60 ${flash ? 'bg-gold-50' : ''}`}>
            <td className="px-3 py-3 sm:px-4">
                <button
                    type="button"
                    onClick={() => onOpen(student)}
                    aria-haspopup="dialog"
                    className="flex items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                    <StudentAvatar student={student} size="sm" />
                    <span className="min-w-0">
                        <span className="block font-medium text-ink-900">{fullName(student)}</span>
                        <span className="block text-xs text-ink-500">
                            <span className="whitespace-nowrap">{student.matricule}</span>
                            {/* Le nom de la classe peut passer à la ligne : insécable, il élargirait la colonne au-delà de la place disponible. */}
                            {showClass && student.school_class ? <span> · {student.school_class.name}</span> : null}
                        </span>
                    </span>
                </button>
                {(showStatus && student.status !== 'actif') || student.is_repeating || unassigned || owing ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-12">
                        {showStatus && student.status !== 'actif' && <StatusBadge status={student.status} label={statusLabels[student.status] ?? student.status} />}
                        {student.is_repeating && <span className={`${badge} bg-amber-100 text-amber-800 ring-amber-600/20`}>Redoublant</span>}
                        {unassigned && <span className={`${badge} bg-ink-100 text-ink-700 ring-ink-500/20`}>À affecter</span>}
                        {owing && (
                            <span className={`${badge} font-semibold ${student.late ? 'bg-red-100 text-red-800 ring-red-600/20' : 'bg-amber-100 text-amber-800 ring-amber-600/20'}`}>
                                {student.late ? 'En retard · ' : 'Solde · '}
                                {fcfa(student.balance ?? 0)}
                            </span>
                        )}
                    </div>
                ) : null}
            </td>
            <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                    <span className="min-w-0">
                        <span className="block whitespace-nowrap text-ink-700">{student.contact.display ?? <span className="text-ink-500">Aucun numéro</span>}</span>
                        {/* Sur sa propre ligne : collé au numéro, il élargirait la colonne au-delà de la place disponible. */}
                        {student.contact.owner === 'guardian' && <span className="block text-xs text-ink-500">Numéro du tuteur</span>}
                    </span>
                    <ContactActions student={student} withEmail={false} />
                </div>
            </td>
            <td className="px-3 py-3">
                <DossierMeter dossier={student.dossier} compact />
            </td>
            <td className="px-2 py-3 text-right">
                <div className="flex justify-end">
                    <StudentMenu student={student} can={can} onDelete={onDelete} />
                </div>
            </td>
        </tr>
    );
}
