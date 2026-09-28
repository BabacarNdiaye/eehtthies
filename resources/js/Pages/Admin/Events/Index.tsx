import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { EventItem, Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox, Pencil, Trash2 } from 'lucide-react';

export default function Index({ events }: { events: Paginated<EventItem> }) {
    const destroy = (event: EventItem) => {
        if (
            confirm(
                `Supprimer l'événement "${event.title}" ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.events.destroy', event.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Événements" />
            <PageHeader
                title="Événements"
                subtitle="Gérez les événements affichés sur le site public."
                action={{ label: 'Nouvel événement', href: route('admin.events.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Événement</th>
                                <th className="px-5 py-3">Lieu</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {events.data.map((e) => (
                                <tr key={e.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{e.title}</td>
                                    <td className="px-5 py-3 text-ink-600">{e.location ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {new Date(e.start_at).toLocaleDateString('fr-FR', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                e.is_published
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {e.is_published ? 'Publié' : 'Brouillon'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={route('admin.events.edit', e.id)}
                                                className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => destroy(e)}
                                                className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {events.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun événement enregistré pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={events} />
            </Card>
        </AdminLayout>
    );
}
