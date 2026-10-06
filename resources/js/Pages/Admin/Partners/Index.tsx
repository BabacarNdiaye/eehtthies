import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Paginated, Partner } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router } from '@inertiajs/react';
import { ExternalLink, Inbox, Pencil, Trash2 } from 'lucide-react';

export default function Index({ partners }: { partners: Paginated<Partner> }) {
    const destroy = async (partner: Partner) => {
        if (
            await confirmAction(
                `Supprimer le partenaire "${partner.name}" ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.partners.destroy', partner.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Partenaires" />
            <PageHeader
                title="Partenaires"
                subtitle="Gérez les partenaires institutionnels et professionnels de l'école."
                action={{ label: 'Nouveau partenaire', href: route('admin.partners.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Partenaire</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">Site web</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {partners.data.map((p) => (
                                <tr key={p.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{p.name}</td>
                                    <td className="px-5 py-3 text-ink-600">{p.type ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {p.website ? (
                                            <a
                                                href={p.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-gold-700 hover:underline"
                                            >
                                                Voir <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                p.is_published
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {p.is_published ? 'Publié' : 'Brouillon'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconLink
                                                href={route('admin.partners.edit', p.id)}
                                                label="Modifier"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton
                                                onClick={() => destroy(p)}
                                                label="Supprimer"
                                                tone="danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {partners.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun partenaire enregistré pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={partners} />
            </Card>
        </AdminLayout>
    );
}
