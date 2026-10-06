import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Paginated, PracticalSession } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router } from '@inertiajs/react';
import { Inbox, Pencil, Trash2 } from 'lucide-react';

export default function Index({ sessions }: { sessions: Paginated<PracticalSession & { items_count: number }> }) {
    const destroy = async (session: PracticalSession) => {
        if (await confirmAction(`Supprimer la séance "${session.title}" ?`)) {
            router.delete(route('admin.practical-sessions.destroy', session.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Ateliers pratiques" />
            <PageHeader
                title="Ateliers pratiques"
                subtitle="Suivez les séances pratiques et le coût des produits consommés."
                action={{ label: 'Nouvelle séance', href: route('admin.practical-sessions.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Séance</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Produits</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {sessions.data.map((s) => (
                                <tr key={s.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{s.title}</td>
                                    <td className="px-5 py-3 text-ink-600">{s.school_class?.name}</td>
                                    <td className="px-5 py-3 text-ink-600">{s.subject?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">{new Date(s.session_date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-5 py-3 text-ink-600">{s.items_count}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconLink href={route('admin.practical-sessions.edit', s.id)} label="Modifier">
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton onClick={() => destroy(s)} label="Supprimer" tone="danger">
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sessions.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune séance enregistrée.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={sessions} />
            </Card>
        </AdminLayout>
    );
}
