import { exportQuery, Filters } from '@/lib/students';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDown, FileSpreadsheet, FileText, IdCard, Mail, MoreHorizontal, Upload } from 'lucide-react';

interface Props {
    filters: Filters;
    can: { export: boolean; import: boolean; edit: boolean };
    /** La classe de la portée, pour imprimer ses cartes d'élève ; null hors d'une classe. */
    classId: number | null;
    onImport: () => void;
    onGenerateEmails: () => void;
}

const item =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-700 outline-none data-[focus]:bg-ink-50 max-md:min-h-11';

/**
 * Les actions de la page, rangées derrière un seul bouton : exporter ce que la page montre (année, statut, portée et
 * recherche en cours, pas toute l'école), imprimer les cartes de la classe, importer une liste, générer les e-mails
 * manquants. Chaque action n'est proposée qu'à qui en a le droit ; sans aucun droit, le bouton disparaît.
 */
export default function ActionsMenu({ filters, can, classId, onImport, onGenerateEmails }: Props) {
    if (!can.export && !can.import && !can.edit) return null;

    const query = exportQuery(filters);

    return (
        <Menu as="div" className="relative">
            <MenuButton className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 outline-none transition-colors hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-gold-500 data-[open]:bg-ink-50">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                Actions
                <ChevronDown className="h-4 w-4 text-ink-400" aria-hidden="true" />
            </MenuButton>
            <MenuItems anchor="bottom end" className="z-[70] w-72 rounded-xl border border-ink-100 bg-white p-1 shadow-elevated outline-none [--anchor-gap:0.25rem]">
                {can.export && (
                    <>
                        <MenuItem>
                            <a href={route('admin.students.export.csv', query)} className={item}>
                                <FileSpreadsheet className="h-4 w-4 text-ink-500" aria-hidden="true" />
                                Exporter cette vue (Excel)
                            </a>
                        </MenuItem>
                        <MenuItem>
                            <a href={route('admin.students.export.pdf', query)} target="_blank" rel="noopener noreferrer" className={item}>
                                <FileText className="h-4 w-4 text-ink-500" aria-hidden="true" />
                                Exporter cette vue (PDF)
                            </a>
                        </MenuItem>
                        {classId !== null && (
                            <MenuItem>
                                <a href={route('admin.students.cards.export', { school_class_id: classId })} target="_blank" rel="noopener noreferrer" className={item}>
                                    <IdCard className="h-4 w-4 text-ink-500" aria-hidden="true" />
                                    Cartes d'élève de la classe
                                </a>
                            </MenuItem>
                        )}
                    </>
                )}
                {(can.import || can.edit) && can.export && <div className="my-1 border-t border-ink-100" role="separator" />}
                {can.import && (
                    <MenuItem>
                        <button type="button" onClick={onImport} className={item}>
                            <Upload className="h-4 w-4 text-ink-500" aria-hidden="true" />
                            Importer des élèves
                        </button>
                    </MenuItem>
                )}
                {can.edit && (
                    <MenuItem>
                        <button type="button" onClick={onGenerateEmails} className={item}>
                            <Mail className="h-4 w-4 text-ink-500" aria-hidden="true" />
                            Générer les e-mails manquants
                        </button>
                    </MenuItem>
                )}
            </MenuItems>
        </Menu>
    );
}
