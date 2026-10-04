import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Gallery, Paginated } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router } from '@inertiajs/react';
import { Images, Pencil, Trash2 } from 'lucide-react';

type GalleryRow = Gallery & { media_count: number };

export default function Index({ galleries }: { galleries: Paginated<GalleryRow> }) {
    const destroy = async (gallery: GalleryRow) => {
        if (
            await confirmAction(
                `Supprimer l'album "${gallery.title}" ainsi que tous ses médias ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.galleries.destroy', gallery.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Galerie" />
            <PageHeader
                title="Galerie"
                subtitle="Gérez les albums photos et vidéos de l'école."
                action={{ label: 'Nouvel album', href: route('admin.galleries.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Album</th>
                                <th className="px-5 py-3">Catégorie</th>
                                <th className="px-5 py-3">Médias</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {galleries.data.map((g) => (
                                <tr key={g.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{g.title}</td>
                                    <td className="px-5 py-3 text-ink-600">{g.category ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Images className="h-4 w-4 text-ink-400" />
                                            {g.media_count ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                g.is_published
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {g.is_published ? 'Publié' : 'Brouillon'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconLink
                                                href={route('admin.galleries.edit', g.id)}
                                                label="Modifier"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton
                                                onClick={() => destroy(g)}
                                                label="Supprimer"
                                                tone="danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {galleries.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Images className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun album créé pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={galleries} />
            </Card>
        </AdminLayout>
    );
}
