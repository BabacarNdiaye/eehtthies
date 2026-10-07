import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FinanceTabs from '@/Components/Admin/FinanceTabs';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { IconAnchor, IconLink } from '@/Components/Admin/IconButton';
import { fcfa } from '@/lib/money';
import { PageProps, Paginated } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Eye, FileText, FlaskConical, Inbox, PlugZap, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Attempt {
    id: number;
    reference: string;
    student_id: number;
    student_name: string;
    matricule: string;
    amount: number;
    channel_label: string;
    status: 'initiated' | 'pending' | 'succeeded' | 'failed' | 'expired' | 'anomaly';
    status_label: string;
    note: string | null;
    created_at: string;
    settled_at: string | null;
    receipt_url: string | null;
    status_url: string;
}

interface Props {
    driver: { name: string; active: boolean; simulation: boolean; refusal: string | null };
    attempts: Paginated<Attempt>;
    counts: { succeeded: number; pending: number; anomaly: number; failed: number };
}

const TONES: Record<Attempt['status'], string> = {
    succeeded: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-sky-100 text-sky-700',
    initiated: 'bg-sky-100 text-sky-700',
    failed: 'bg-ink-100 text-ink-700',
    expired: 'bg-ink-100 text-ink-700',
    anomaly: 'bg-red-100 text-red-700',
};

const dateTime = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Où en est le pilote de paiement : actif, en simulation (aucun argent réel), refusé ou absent. */
function DriverBanner({ driver }: { driver: Props['driver'] }) {
    if (driver.refusal) {
        return (
            <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm">
                    <strong>Paiement en ligne désactivé.</strong> {driver.refusal}
                </p>
            </div>
        );
    }

    if (!driver.active) {
        return (
            <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4 text-ink-800">
                <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" aria-hidden="true" />
                <p className="text-sm">
                    <strong>Aucun pilote de paiement actif.</strong> Le bouton « Payer en ligne » n’apparaît pas dans les espaces élève et parent. Le pilote se choisit
                    dans la configuration du serveur (PAYMENTS_DRIVER) : voir DEPLOIEMENT.md.
                </p>
            </div>
        );
    }

    return driver.simulation ? (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm">
                <strong>Mode simulation.</strong> Les élèves et les parents peuvent essayer le parcours de paiement, mais aucun argent réel ne circule : les paiements
                simulés créent bien de vrais encaissements dans la comptabilité, à réserver aux essais.
            </p>
        </div>
    ) : (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm">
                <strong>Pilote actif : {driver.name}.</strong> Le bouton « Payer en ligne » est proposé dans les espaces élève et parent.
            </p>
        </div>
    );
}

export default function Index({ driver, attempts, counts }: Props) {
    const permissions = usePage<PageProps>().props.auth.permissions;
    const canReconcile = permissions.includes('modifier_comptabilite');
    const [working, setWorking] = useState(false);

    const reconcile = () => {
        setWorking(true);
        router.post(route('admin.online-payments.reconcile'), {}, { preserveScroll: true, onFinish: () => setWorking(false) });
    };

    return (
        <AdminLayout>
            <Head title="Paiements en ligne" />
            <PageHeader title="Paiements en ligne" subtitle="Les paiements démarrés par les élèves et les parents, et ceux qui demandent une vérification.">
                {canReconcile && (
                    <button
                        type="button"
                        onClick={reconcile}
                        disabled={working}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${working ? 'animate-spin' : ''}`} aria-hidden="true" /> Réconcilier
                    </button>
                )}
            </PageHeader>
            <FinanceTabs current="online" />

            <DriverBanner driver={driver} />

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="p-4">
                    <p className="text-xs text-ink-500">Payés</p>
                    <p className="font-serif text-2xl font-bold text-emerald-700">{counts.succeeded}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-ink-500">En attente</p>
                    <p className="font-serif text-2xl font-bold text-ink-900">{counts.pending}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-ink-500">À vérifier</p>
                    <p className={`font-serif text-2xl font-bold ${counts.anomaly > 0 ? 'text-red-600' : 'text-ink-900'}`}>{counts.anomaly}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-ink-500">Échoués ou expirés</p>
                    <p className="font-serif text-2xl font-bold text-ink-900">{counts.failed}</p>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Référence</th>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3 text-right">Montant</th>
                                <th className="px-5 py-3">Mode</th>
                                <th className="px-5 py-3">État</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {attempts.data.map((attempt) => (
                                <tr key={attempt.id} className="align-top transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="whitespace-nowrap px-5 py-3 font-medium text-ink-900">{attempt.reference}</td>
                                    <td className="px-5 py-3">
                                        <p className="whitespace-nowrap font-medium text-ink-900">{attempt.student_name}</p>
                                        <p className="text-xs text-ink-500">{attempt.matricule}</p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-ink-900">{fcfa(attempt.amount)}</td>
                                    <td className="px-5 py-3 text-ink-700">{attempt.channel_label}</td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${TONES[attempt.status]}`}>{attempt.status_label}</span>
                                        {attempt.note && <p className="mt-1.5 max-w-xs text-xs text-ink-600">{attempt.note}</p>}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3 text-ink-700">{dateTime(attempt.settled_at ?? attempt.created_at)}</td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <IconLink href={attempt.status_url} label={`Voir le paiement ${attempt.reference}`}>
                                                <Eye className="h-4 w-4" />
                                            </IconLink>
                                            {attempt.receipt_url && (
                                                <IconAnchor href={attempt.receipt_url} target="_blank" rel="noopener noreferrer" label={`Reçu du paiement ${attempt.reference}`}>
                                                    <FileText className="h-4 w-4" />
                                                </IconAnchor>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {attempts.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun paiement en ligne pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Pagination data={attempts} />
        </AdminLayout>
    );
}
