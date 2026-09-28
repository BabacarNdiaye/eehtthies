import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Head, router } from '@inertiajs/react';
import { Inbox, Trash2 } from 'lucide-react';

type ClassMessage = {
    id: number;
    body: string;
    created_at: string;
    user: { id: number; name: string } | null;
};

export default function Show({ schoolClass, messages }: { schoolClass: { id: number; name: string }; messages: ClassMessage[] }) {
    const destroy = (message: ClassMessage) => {
        if (confirm('Supprimer ce message ? Cette action est irréversible.')) {
            router.delete(route('admin.class-discussions.destroy', message.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title={`Discussion — ${schoolClass.name}`} />
            <PageHeader title={`Discussion — ${schoolClass.name}`} subtitle="Modération du fil de discussion de cette classe." />

            <Card className="overflow-hidden">
                <div className="divide-y divide-ink-100">
                    {messages.map((m) => (
                        <div key={m.id} className="flex items-start justify-between gap-4 px-5 py-4">
                            <div>
                                <p className="text-sm font-semibold text-ink-900">{m.user?.name ?? 'Utilisateur'}</p>
                                <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{m.body}</p>
                                <p className="mt-1 text-xs text-ink-400">{new Date(m.created_at).toLocaleString('fr-FR')}</p>
                            </div>
                            <button
                                onClick={() => destroy(m)}
                                className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                aria-label="Supprimer"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-ink-400">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                <Inbox className="h-6 w-6" />
                            </span>
                            <p className="text-sm">Aucun message dans cette discussion.</p>
                        </div>
                    )}
                </div>
            </Card>
        </AdminLayout>
    );
}
