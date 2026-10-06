import { IconAnchor } from '@/Components/Admin/IconButton';
import { avatarTone, fullName, initialsOf, StudentRow } from '@/lib/students';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { IdCard, Mail, MessageCircle, MoreVertical, Pencil, Phone, Trash2 } from 'lucide-react';
import { useState } from 'react';

const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-lg' } as const;

/**
 * Photo de l'élève, ou ses initiales sur une teinte qui ne change jamais pour un même élève. Décoratif : le nom est
 * toujours écrit à côté, un `alt` le ferait lire deux fois. Une photo introuvable (fichier supprimé) retombe sur les initiales.
 */
export function StudentAvatar({ student, size = 'md' }: { student: Pick<StudentRow, 'id' | 'first_name' | 'last_name' | 'photo_url'>; size?: keyof typeof sizes }) {
    const [broken, setBroken] = useState(false);

    return (
        <span className={`inline-flex shrink-0 ${sizes[size]}`} aria-hidden="true">
            {student.photo_url && !broken ? (
                <img
                    src={student.photo_url}
                    alt=""
                    loading="lazy"
                    onError={() => setBroken(true)}
                    className="h-full w-full rounded-full object-cover ring-2 ring-white"
                />
            ) : (
                <span className={`flex h-full w-full items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${avatarTone(student)}`}>
                    {initialsOf(student)}
                </span>
            )}
        </span>
    );
}

/**
 * Complétude du dossier : cinq segments et un texte (« Dossier 4/5 »), jamais la couleur seule ; l'infobulle dit ce qui
 * manque. Vert quand tout y est, ambre à une pièce près, rouge au-delà.
 */
export function DossierMeter({ dossier, compact = false }: { dossier: StudentRow['dossier']; compact?: boolean }) {
    const complete = dossier.done === dossier.total;
    const almost = dossier.done >= dossier.total - 1;
    const bar = complete ? 'bg-emerald-500' : almost ? 'bg-amber-500' : 'bg-red-500';
    const text = complete ? 'text-emerald-700' : almost ? 'text-amber-700' : 'text-red-700';

    return (
        <span className="inline-flex items-center gap-2 whitespace-nowrap" title={complete ? 'Dossier complet' : `À compléter : ${dossier.missing.join(', ')}`}>
            <span className="flex gap-0.5" aria-hidden="true">
                {Array.from({ length: dossier.total }, (_, index) => (
                    <span key={index} className={`h-1.5 w-3.5 rounded-full ${index < dossier.done ? bar : 'bg-ink-200'}`} />
                ))}
            </span>
            {/* Dans un tableau, l'en-tête de colonne dit déjà « Dossier » : le texte se réduit à la fraction. */}
            <span className={`text-xs font-semibold tabular-nums ${text}`}>
                {complete ? (compact ? 'Complet' : 'Dossier complet') : compact ? `${dossier.done}/${dossier.total}` : `Dossier ${dossier.done}/${dossier.total}`}
            </span>
            {compact && <span className="sr-only">{complete ? ' : dossier complet' : ` : dossier à compléter, il manque ${dossier.missing.join(', ')}`}</span>}
        </span>
    );
}

/**
 * Appeler, écrire sur WhatsApp, envoyer un e-mail : seulement ce que la fiche permet (le serveur ne donne un lien que
 * pour un vrai numéro). `callOnly` ne garde que l'appel : la ligne compacte du téléphone n'a de place que pour lui ;
 * `withEmail={false}` retire l'e-mail, que le tableau laisse à l'aperçu du dossier pour tenir dans sa colonne.
 */
export function ContactActions({
    student,
    className = '',
    callOnly = false,
    withEmail = true,
}: {
    student: StudentRow;
    className?: string;
    callOnly?: boolean;
    withEmail?: boolean;
}) {
    const { tel, whatsapp, email, owner, display } = student.contact;
    const who = owner === 'guardian' ? `le tuteur de ${fullName(student)}` : fullName(student);
    const tone = 'bg-ink-50 text-ink-700 hover:bg-ink-100';
    const mail = withEmail && !callOnly ? email : null;

    if (!tel && (callOnly || (!whatsapp && !mail))) return null;

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {tel && (
                <IconAnchor href={`tel:${tel}`} label={`Appeler ${who}${display ? ` (${display})` : ''}`} className={tone}>
                    <Phone className="h-4 w-4" aria-hidden="true" />
                </IconAnchor>
            )}
            {!callOnly && whatsapp && (
                <IconAnchor href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" label={`Écrire à ${who} sur WhatsApp`} className={tone}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </IconAnchor>
            )}
            {mail && (
                <IconAnchor href={`mailto:${mail}`} label={`Écrire un e-mail à ${who}`} className={tone}>
                    <Mail className="h-4 w-4" aria-hidden="true" />
                </IconAnchor>
            )}
        </div>
    );
}

/** Ce que l'utilisateur a le droit de faire sur une fiche : les actions qu'il n'a pas ne s'affichent pas. */
export interface StudentPermissions {
    edit: boolean;
    delete: boolean;
    card: boolean;
}

/** Menu « ⋮ » d'une fiche : modifier le dossier, imprimer la carte, supprimer. Sans aucun droit, rien ne s'affiche. */
export function StudentMenu({ student, can, onDelete }: { student: StudentRow; can: StudentPermissions; onDelete: (student: StudentRow) => void }) {
    if (!can.edit && !can.card && !can.delete) return null;

    const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-700 outline-none data-[focus]:bg-ink-50 max-md:min-h-11';

    return (
        <Menu as="div" className="relative shrink-0">
            <MenuButton
                aria-label={`Actions pour ${fullName(student)}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 outline-none transition-colors hover:bg-ink-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-gold-500 data-[open]:bg-ink-100 max-md:h-11 max-md:w-11"
            >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </MenuButton>
            <MenuItems anchor="bottom end" className="z-[70] w-56 rounded-xl border border-ink-100 bg-white p-1 shadow-elevated outline-none [--anchor-gap:0.25rem]">
                {can.edit && (
                    <MenuItem>
                        <Link href={route('admin.students.edit', student.id)} className={item}>
                            <Pencil className="h-4 w-4 text-ink-500" aria-hidden="true" />
                            Modifier le dossier
                        </Link>
                    </MenuItem>
                )}
                {can.card && (
                    <MenuItem>
                        <a href={route('admin.students.card', student.id)} target="_blank" rel="noopener noreferrer" className={item}>
                            <IdCard className="h-4 w-4 text-ink-500" aria-hidden="true" />
                            Carte d'élève (PDF)
                        </a>
                    </MenuItem>
                )}
                {can.delete && (
                    <MenuItem>
                        <button type="button" onClick={() => onDelete(student)} className={`${item} !text-red-600 data-[focus]:bg-red-50`}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Supprimer
                        </button>
                    </MenuItem>
                )}
            </MenuItems>
        </Menu>
    );
}
