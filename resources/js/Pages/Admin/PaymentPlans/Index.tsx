import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import FinanceTabs from '@/Components/Admin/FinanceTabs';
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

const fcfa = (v: number | string) => `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(v)))} FCFA`;
const initials = (plan: PlanRow) => `${plan.student?.first_name?.[0] ?? ''}${plan.student?.last_name?.[0] ?? ''}`.toUpperCase() || '—';

function Status({ plan }: { plan: PlanRow }) {
    const done = plan.computed_progress >= 100 || plan.computed_balance <= 0;

    return (
        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {done ? 'Soldé' : 'En cours'}
        </span>
    );
}

export default function Index({ plans }: Props) {
    return (
        <AdminLayout>
            <Head title="Échéanciers de paiement" />
            <PageHeader
                title="Échéanciers de paiement"
                subtitle="Étalez les frais de scolarité en tranches et suivez l'avancement du règlement de chaque famille."
                action={{ label: 'Nouvel échéancier', href: route('admin.payment-plans.create') }}
            />
            <FinanceTabs current="plans" />

            <Card className="overflow-hidden">
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Échéancier</th>
                                <th className="px-5 py-3">Avancement</th>
                                <th className="px-5 py-3 text-right">Reste à payer</th>
                                <th className="px-5 py-3">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {plans.data.map((plan) => (
                                <tr key={plan.id} className="transition-colors hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <Link href={route('admin.payment-plans.show', plan.id)} className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 font-serif text-xs font-bold text-gold-300">{initials(plan)}</span>
                                            <span>
                                                <span className="block font-medium text-ink-900">{plan.student ? `${plan.student.first_name} ${plan.student.last_name}` : '—'}</span>
                                                <span className="block text-xs text-ink-500">{plan.student?.matricule}</span>
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="block text-ink-800">{plan.label}</span>
                                        <span className="text-xs text-ink-500">{plan.installments_count} tranche(s) · {fcfa(plan.total_amount)}</span>
                                    </td>
                                    <td className="min-w-[11rem] px-5 py-3">
                                        <div className="flex items-baseline justify-between text-xs text-ink-500">
                                            <span className="tabular-nums">{fcfa(plan.computed_paid)}</span>
                                            <span className="font-semibold tabular-nums text-ink-700">{plan.computed_progress} %</span>
                                        </div>
                                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                                            <div className={`h-full rounded-full ${plan.computed_progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-gold-500 to-gold-300'}`} style={{ width: `${Math.min(100, plan.computed_progress)}%` }} />
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-900">{fcfa(plan.computed_balance)}</td>
                                    <td className="px-5 py-3">
                                        <Status plan={plan} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <ul className="divide-y divide-ink-100 md:hidden">
                    {plans.data.map((plan) => (
                        <li key={plan.id}>
                            <Link href={route('admin.payment-plans.show', plan.id)} className="block px-4 py-3.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-ink-900">{plan.student ? `${plan.student.first_name} ${plan.student.last_name}` : '—'}</p>
                                        <p className="truncate text-xs text-ink-500">{plan.label} · {plan.installments_count} tranche(s)</p>
                                    </div>
                                    <Status plan={plan} />
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                                    <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300" style={{ width: `${Math.min(100, plan.computed_progress)}%` }} />
                                </div>
                                <p className="mt-1.5 flex justify-between text-xs text-ink-500">
                                    <span>{plan.computed_progress} % payé</span>
                                    <span className="font-semibold text-ink-800">Reste {fcfa(plan.computed_balance)}</span>
                                </p>
                            </Link>
                        </li>
                    ))}
                </ul>

                {plans.data.length === 0 && (
                    <div className="flex flex-col items-center gap-3 px-5 py-12 text-ink-500">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                            <Inbox className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <p className="text-sm">Aucun échéancier créé.</p>
                    </div>
                )}
                <Pagination data={plans} />
            </Card>
        </AdminLayout>
    );
}
