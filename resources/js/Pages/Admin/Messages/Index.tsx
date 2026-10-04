import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { IconButton } from '@/Components/Admin/IconButton';
import { ContactMessage, Paginated } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox, Trash2 } from 'lucide-react';

export default function Index({ messages }: { messages: Paginated<ContactMessage> }) {
    const destroy = async (message: ContactMessage) => {
        if (await confirmAction(`Supprimer le message de "${message.name}" ? Cette action est irréversible.`)) {
            router.delete(route('admin.messages.destroy', message.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Messages" />
            <PageHeader
                title="Messages"
                subtitle="Consultez les messages envoyés via le formulaire de contact."
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3"></th>
                                <th className="px-5 py-3">Expéditeur</th>
                                <th className="px-5 py-3">Sujet</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {messages.data.map((m) => (
                                <tr
                                    key={m.id}
                                    className={`transition-colors duration-150 hover:bg-ink-50/60 ${!m.is_read ? 'bg-gold-50/40' : ''}`}
                                >
                                    <td className="px-5 py-3">
                                        {!m.is_read && (
                                            <span className="block h-2 w-2 rounded-full bg-gold-500" title="Non lu" />
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <Link
                                            href={route('admin.messages.show', m.id)}
                                            className="block"
                                        >
                                            <p className={`text-ink-900 ${!m.is_read ? 'font-semibold' : 'font-medium'}`}>
                                                {m.name}
                                            </p>
                                            <p className="text-xs text-ink-500">{m.email}</p>
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3">
                                        <Link href={route('admin.messages.show', m.id)} className="text-ink-600">
                                            {m.subject ?? '—'}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {new Date(m.created_at).toLocaleDateString('fr-FR', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <IconButton
                                                onClick={() => destroy(m)}
                                                label="Supprimer"
                                                tone="danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {messages.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun message reçu pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={messages} />
            </Card>
        </AdminLayout>
    );
}
