import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { InternshipOffer, Paginated } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router } from '@inertiajs/react';
import { Inbox, Pencil, Trash2 } from 'lucide-react';

export default function Index({ offers }: { offers: Paginated<InternshipOffer> }) {
    const destroy = async (offer: InternshipOffer) => {
        if (await confirmAction(`Supprimer l'offre de stage "${offer.title}" ?`)) {
            router.delete(route('admin.internship-offers.destroy', offer.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Offres de stage" />
            <PageHeader
                title="Offres de stage"
                subtitle="Gérez les offres de stage proposées par les entreprises partenaires."
                action={{ label: 'Nouvelle offre', href: route('admin.internship-offers.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Offre</th>
                                <th className="px-5 py-3">Partenaire</th>
                                <th className="px-5 py-3">Places</th>
                                <th className="px-5 py-3">Stages liés</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {offers.data.map((o) => (
                                <tr key={o.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{o.title}</p>
                                        <p className="text-xs text-ink-500">{o.formation?.name ?? 'Toutes formations'}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{o.partner?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">{o.positions_available}</td>
                                    <td className="px-5 py-3 text-ink-600">{o.internships_count ?? 0}</td>
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
                                            <IconLink href={route('admin.internship-offers.edit', o.id)} label="Modifier">
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton onClick={() => destroy(o)} label="Supprimer" tone="danger">
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {offers.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune offre de stage enregistrée.</p>
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
