import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { JobOffer, Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox, Pencil, Trash2 } from 'lucide-react';

interface Props {
    offers: Paginated<JobOffer>;
    contractTypes: Record<string, string>;
}

export default function Index({ offers, contractTypes }: Props) {
    const destroy = (offer: JobOffer) => {
        if (confirm(`Supprimer l'offre "${offer.title}" ?`)) {
            router.delete(route('admin.job-offers.destroy', offer.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Offres d'emploi" />
            <PageHeader
                title="Offres d'emploi"
                subtitle="Gérez les offres d'emploi publiées par les entreprises partenaires."
                action={{ label: 'Nouvelle offre', href: route('admin.job-offers.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Poste</th>
                                <th className="px-5 py-3">Entreprise</th>
                                <th className="px-5 py-3">Contrat</th>
                                <th className="px-5 py-3">Lieu</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {offers.data.map((o) => (
                                <tr key={o.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{o.title}</td>
                                    <td className="px-5 py-3 text-ink-600">{o.partner?.name}</td>
                                    <td className="px-5 py-3 text-ink-600">{contractTypes[o.contract_type]}</td>
                                    <td className="px-5 py-3 text-ink-600">{o.location ?? '—'}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                o.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {o.is_published ? 'Publiée' : 'Non publiée'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link href={route('admin.job-offers.edit', o.id)} className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100">
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button onClick={() => destroy(o)} className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {offers.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune offre d'emploi enregistrée.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={offers} />
            </Card>
        </AdminLayout>
    );
}
