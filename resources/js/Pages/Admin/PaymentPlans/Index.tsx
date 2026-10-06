import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Paginated } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Inbox } from 'lucide-react';

type PlanRow = {
    id: number;
    label: string;
    total_amount: string | number;
    installments_count: number;
    computed_paid: number;
    computed_balance: number;
    computed_progress: number;
    student?: { id: number; first_name: string; last_name: string; matricule: string } | null;
};

interface Props {
    plans: Paginated<PlanRow>;
}

export default function Index({ plans }: Props) {
    return (
        <AdminLayout>
            <Head title="Échéanciers de paiement" />
            <PageHeader
                title="Échéanciers de paiement"
                subtitle="Étalez le paiement de frais de scolarité sur plusieurs tranches."
                action={{ label: 'Nouvel échéancier', href: route('admin.payment-plans.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Libellé</th>
                                <th className="px-5 py-3">Tranches</th>
                                <th className="px-5 py-3">Montant total</th>
                                <th className="px-5 py-3">Progression</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {plans.data.map((plan) => (
                                <tr key={plan.id} className="cursor-pointer hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <Link href={route('admin.payment-plans.show', plan.id)} className="font-medium text-ink-900 hover:underline">
                                            {plan.student ? `${plan.student.first_name} ${plan.student.last_name}` : '—'}
                                        </Link>
                                        <p className="text-xs text-ink-500">{plan.student?.matricule}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-700">{plan.label}</td>
                                    <td className="px-5 py-3 text-ink-700">{plan.installments_count}</td>
                                    <td className="px-5 py-3 text-ink-700">{Number(plan.total_amount).toLocaleString('fr-FR')} FCFA</td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-24 overflow-hidden rounded-full bg-ink-100">
                                                <div className="h-full rounded-full bg-gold-500" style={{ width: `${plan.computed_progress}%` }} />
                                            </div>
                                            <span className="text-xs text-ink-500">{plan.computed_progress}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {plans.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun échéancier créé.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={plans} />
            </Card>
        </AdminLayout>
    );
}
