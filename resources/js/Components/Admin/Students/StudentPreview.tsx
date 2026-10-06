import Drawer from '@/Components/Admin/Drawer';
import StatusBadge from '@/Components/Admin/StatusBadge';
import { DossierMeter, StudentAvatar } from '@/Components/Admin/Students/StudentParts';
import { fcfa } from '@/lib/money';
import { ageFrom, fullName, longDate, statusLabels, StudentRow } from '@/lib/students';
import { Link } from '@inertiajs/react';
import { Check, HandCoins, IdCard, Mail, MessageCircle, Pencil, Phone, X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';

interface Props {
    student: StudentRow | null;
    onClose: () => void;
    can: { edit: boolean; card: boolean; collect: boolean };
}

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500';

/** Un bloc de l'aperçu : un titre et une liste de définitions (ou, pour la liste de contrôle du dossier, un contenu libre). */
function Section({ title, definitions = true, children }: { title: string; definitions?: boolean; children: ReactNode }) {
    const Body = definitions ? 'dl' : 'div';

    return (
        <section className="mt-4 border-t border-ink-100 pt-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</h3>
            <Body className="divide-y divide-ink-100">{children}</Body>
        </section>
    );
}

function Row({ label, children }: { label: string; children?: ReactNode }) {
    return (
        <div className="flex gap-3 py-2 text-sm">
            <dt className="w-28 shrink-0 text-ink-500">{label}</dt>
            <dd className="min-w-0 flex-1 break-words text-ink-900">{children || <span className="text-ink-500">Non renseigné</span>}</dd>
        </div>
    );
}

/**
 * L'aperçu du dossier d'un élève, en lecture seule, par-dessus la liste : on lit un numéro, une adresse, ce qui manque au
 * dossier, on appelle le tuteur, sans ouvrir le long formulaire de modification. Aucune donnée de santé n'y figure.
 */
export default function StudentPreview({ student, onClose, can }: Props) {
    // On garde la dernière fiche affichée pendant que le volet se referme : sans cela, son contenu disparaîtrait avant la fin de l'animation.
    const [last, setLast] = useState<StudentRow | null>(student);

    useEffect(() => {
        if (student) setLast(student);
    }, [student]);

    const s = student ?? last;

    if (!s) return null;

    const name = fullName(s);
    const age = ageFrom(s.birth_date);
    const birth = longDate(s.birth_date);
    const owing = s.balance !== undefined && s.balance > 0;
    const { tel, whatsapp, email } = s.contact;

    return (
        <Drawer
            open={student !== null}
            onClose={onClose}
            title={name}
            subtitle={[s.matricule, s.school_class?.name].filter(Boolean).join(' · ')}
            lead={<StudentAvatar student={s} size="lg" />}
            footer={
                // Un rôle en lecture seule n'a aucune action : pas de pied de volet vide.
                (can.edit || can.card || (owing && can.collect)) && (
                <div className="flex flex-wrap gap-2">
                    {can.edit && (
                        <Link href={route('admin.students.edit', s.id)} className={`${button} flex-1 bg-ink-900 text-white hover:bg-ink-800`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Modifier le dossier
                        </Link>
                    )}
                    {owing && can.collect && (
                        <Link href={route('admin.cashier.create', { student: s.id })} className={`${button} flex-1 border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                            <HandCoins className="h-4 w-4" aria-hidden="true" />
                            Encaisser
                        </Link>
                    )}
                    {can.card && (
                        <a href={route('admin.students.card', s.id)} target="_blank" rel="noopener noreferrer" className={`${button} border border-ink-200 bg-white text-ink-700 hover:bg-ink-50`}>
                            <IdCard className="h-4 w-4" aria-hidden="true" />
                            Carte d'élève
                        </a>
                    )}
                </div>
                )
            }
        >
            <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={s.status} label={statusLabels[s.status] ?? s.status} />
                {s.is_repeating && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">Redoublant</span>
                )}
                <DossierMeter dossier={s.dossier} />
            </div>

            {(tel || whatsapp || email) && (
                <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
                    {tel && (
                        <a href={`tel:${tel}`} aria-label={`Appeler ${name}`} className={`${button} flex-col gap-1 bg-emerald-700 !px-2 text-white hover:bg-emerald-800`}>
                            <Phone className="h-5 w-5" aria-hidden="true" />
                            Appeler
                        </a>
                    )}
                    {whatsapp && (
                        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp : écrire à ${name}`} className={`${button} flex-col gap-1 bg-ink-100 !px-2 text-ink-800 hover:bg-ink-200`}>
                            <MessageCircle className="h-5 w-5" aria-hidden="true" />
                            WhatsApp
                        </a>
                    )}
                    {email && (
                        <a href={`mailto:${email}`} aria-label={`E-mail : écrire à ${name}`} className={`${button} flex-col gap-1 bg-ink-100 !px-2 text-ink-800 hover:bg-ink-200`}>
                            <Mail className="h-5 w-5" aria-hidden="true" />
                            E-mail
                        </a>
                    )}
                </div>
            )}

            <Section title="Scolarité">
                <Row label="Formation">{s.formation?.name}</Row>
                <Row label="Classe">{[s.school_class?.name, s.level].filter(Boolean).join(' · ')}</Row>
                <Row label="Année">{s.year}</Row>
            </Section>

            <Section title="Contact">
                <Row label="Téléphone">{s.phone_display}</Row>
                <Row label="E-mail">{s.email}</Row>
                <Row label="E-mail EEHT">{s.professional_email}</Row>
                <Row label="Adresse">{s.address}</Row>
            </Section>

            <Section title="Tuteur et urgence">
                <Row label="Tuteur">{s.guardian.name}</Row>
                <Row label="Téléphone">{s.guardian.phone}</Row>
                <Row label="E-mail">{s.guardian.email}</Row>
                <Row label="À prévenir">{s.emergency_contact}</Row>
            </Section>

            <Section title="Naissance">
                <Row label="Né(e) le">{birth ? `${birth}${age !== null ? ` (${age} ans)` : ''}` : null}</Row>
                <Row label="Lieu">{s.birth_place}</Row>
            </Section>

            <Section title="Dossier" definitions={false}>
                <ul className="grid gap-1.5 py-2 text-sm">
                    {s.dossier.items.map((item) => (
                        <li key={item.key} className="flex items-center gap-2">
                            {item.ok ? (
                                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                            ) : (
                                <X className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                            )}
                            <span className={item.ok ? 'text-ink-700' : 'font-medium text-ink-900'}>{item.label}</span>
                            <span className="sr-only">{item.ok ? ' : renseigné' : ' : manquant'}</span>
                        </li>
                    ))}
                </ul>
            </Section>

            {s.balance !== undefined && (
                <Section title="Finances">
                    <Row label="Solde dû">
                        <span className="font-semibold">{fcfa(s.balance)}</span>
                        {s.late && <span className="ml-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">En retard</span>}
                    </Row>
                </Section>
            )}
        </Drawer>
    );
}
