import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { confirmAction } from '@/lib/confirm';
import { fcfa } from '@/lib/money';
import { Invoice, PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BellRing, Eye, HandCoins, Inbox } from 'lucide-react';

type OverdueInvoice = Invoice & {
    student: { id: number; first_name: string; last_name: string; matricule: string; phone?: string | null; email?: string | null };
    computed_balance: number;
    /** Jours depuis l'échéance : négatif avant, null sans échéance. */
    days_past_due: number | null;
    reminders_count: number;
    last_reminder_at: string | null;
};

interface Props {
    invoices: OverdueInvoice[];
    totalOutstanding: number;
    totalOverdue: number;
    familiesOverdue: number;
}

/** Ancienneté d'une facture à régler : en retard (rouge), échue aujourd'hui, à venir ou sans échéance. */
function Age({ days }: { days: number | null }) {
    const pill = 'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium';

    if (days === null) return <span className="text-xs text-ink-500">Sans échéance</span>;
    if (days > 0) return <span className={`${pill} bg-red-100 text-red-700`}>En retard de {days} j</span>;
    if (days === 0) return <span className={`${pill} bg-amber-100 text-amber-800`}>Échéance aujourd'hui</span>;

    return <span className={`${pill} bg-sky-100 text-sky-700`}>Dans {-days} j</span>;
}

export default function Overdue({ invoices, totalOutstanding, totalOverdue, familiesOverdue }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canCollect = permissions.includes('ajouter_comptabilite');
    const canRemind = permissions.includes('modifier_comptabilite');

    const remind = async (invoice: OverdueInvoice) => {
        const name = `${invoice.student.first_name} ${invoice.student.last_name}`;
        const confirmed = await confirmAction({
            title: 'Relancer la famille',
            message: `Envoyer une relance à la famille de ${name} pour ses factures en retard ? Le message part par e-mail, notification et EEHT Connect, selon ses contacts.`,
            confirmLabel: 'Envoyer la relance',
        });

        if (confirmed) {
            router.post(route('admin.invoices.remind'), { student_id: invoice.student.id }, { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Impayés" />
            <PageHeader title="Situation des impayés" subtitle="Factures avec un solde restant à percevoir, leur ancienneté et la dernière relance envoyée." />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="p-5">
                    <p className="text-sm text-ink-500">Total des impayés</p>
                    <p className="font-serif text-3xl font-bold text-ink-900">{fcfa(totalOutstanding)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-ink-500">Dont en retard</p>
                    <p className={`font-serif text-3xl font-bold ${totalOverdue > 0 ? 'text-red-600' : 'text-ink-900'}`}>{fcfa(totalOverdue)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-ink-500">Familles en retard</p>
                    <p className={`font-serif text-3xl font-bold ${familiesOverdue > 0 ? 'text-red-600' : 'text-ink-900'}`}>{familiesOverdue}</p>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Référence</th>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Contact</th>
                                <th className="px-5 py-3">Échéance</th>
                                <th className="px-5 py-3">Solde dû</th>
                                <th className="px-5 py-3">Relances</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{inv.reference}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {inv.student.first_name} {inv.student.last_name}
                                        <p className="text-xs text-ink-500">{inv.student.matricule}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-500">
                                        {inv.student.phone ?? inv.student.email ?? '—'}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
                                        <div className="mt-1">
                                            <Age days={inv.days_past_due} />
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 font-semibold text-red-600">{fcfa(inv.computed_balance)}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {inv.reminders_count > 0 ? (
                                            <>
                                                {inv.reminders_count} envoyée{inv.reminders_count > 1 ? 's' : ''}
                                                {inv.last_reminder_at && (
                                                    <p className="text-xs text-ink-500">dernière le {new Date(inv.last_reminder_at).toLocaleDateString('fr-FR')}</p>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-ink-500">Aucune</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-1">
                                            <IconLink href={route('admin.invoices.show', inv.id)} label="Consulter">
                                                <Eye className="h-4 w-4" />
                                            </IconLink>
                                            {canCollect && (
                                                <IconLink
                                                    href={route('admin.cashier.create', { student: inv.student.id, invoice: inv.id })}
                                                    label={`Encaisser pour ${inv.student.first_name} ${inv.student.last_name}`}
                                                >
                                                    <HandCoins className="h-4 w-4" />
                                                </IconLink>
                                            )}
                                            {canRemind && (inv.days_past_due ?? 0) > 0 && (
                                                <IconButton onClick={() => remind(inv)} label={`Relancer la famille de ${inv.student.first_name} ${inv.student.last_name}`}>
                                                    <BellRing className="h-4 w-4" />
                                                </IconButton>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun impayé — toutes les factures sont réglées.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
