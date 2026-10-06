import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { NewsArticle, Paginated } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router } from '@inertiajs/react';
import { Inbox, Pencil, Star, Trash2 } from 'lucide-react';

export default function Index({ articles }: { articles: Paginated<NewsArticle> }) {
    const destroy = async (article: NewsArticle) => {
        if (
            await confirmAction(
                `Supprimer l'article "${article.title}" ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.news.destroy', article.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Actualités" />
            <PageHeader
                title="Actualités"
                subtitle="Gérez les articles publiés sur le site public."
                action={{ label: 'Nouvel article', href: route('admin.news.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Article</th>
                                <th className="px-5 py-3">Catégorie</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3">Publication</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {articles.data.map((a) => (
                                <tr key={a.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            {a.is_featured && (
                                                <Star className="h-4 w-4 shrink-0 fill-gold-500 text-gold-500" />
                                            )}
                                            <p className="font-medium text-ink-900">{a.title}</p>
                                        </div>
                                        <p className="text-xs text-ink-500">
                                            {a.source === 'facebook' ? 'Importé de Facebook' : 'Saisie manuelle'}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{a.category ?? '—'}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                a.is_published
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {a.is_published ? 'Publié' : 'Brouillon'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {a.published_at
                                            ? new Date(a.published_at).toLocaleDateString('fr-FR', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                              })
                                            : '—'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconLink
                                                href={route('admin.news.edit', a.id)}
                                                label="Modifier"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton
                                                onClick={() => destroy(a)}
                                                label="Supprimer"
                                                tone="danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {articles.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun article publié pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={articles} />
            </Card>
        </AdminLayout>
    );
}
