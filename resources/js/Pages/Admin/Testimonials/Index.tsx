import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Paginated, Testimonial } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router } from '@inertiajs/react';
import { Pencil, Star, Trash2 } from 'lucide-react';

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                        i < rating ? 'fill-gold-500 text-gold-500' : 'text-ink-200'
                    }`}
                />
            ))}
        </div>
    );
}

export default function Index({ testimonials }: { testimonials: Paginated<Testimonial> }) {
    const destroy = async (testimonial: Testimonial) => {
        if (
            await confirmAction(
                `Supprimer le témoignage de "${testimonial.name}" ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.testimonials.destroy', testimonial.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Témoignages" />
            <PageHeader
                title="Témoignages"
                subtitle="Gérez les témoignages affichés sur le site public."
                action={{ label: 'Nouveau témoignage', href: route('admin.testimonials.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Auteur</th>
                                <th className="px-5 py-3">Formation</th>
                                <th className="px-5 py-3">Note</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {testimonials.data.map((t) => (
                                <tr key={t.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{t.name}</p>
                                        <p className="text-xs text-ink-500">{t.role ?? '—'}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{t.formation?.name ?? '—'}</td>
                                    <td className="px-5 py-3">
                                        <Stars rating={t.rating} />
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                t.is_published
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {t.is_published ? 'Publié' : 'Brouillon'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconLink
                                                href={route('admin.testimonials.edit', t.id)}
                                                label="Modifier"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton
                                                onClick={() => destroy(t)}
                                                label="Supprimer"
                                                tone="danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {testimonials.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Star className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun témoignage enregistré pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={testimonials} />
            </Card>
        </AdminLayout>
    );
}
