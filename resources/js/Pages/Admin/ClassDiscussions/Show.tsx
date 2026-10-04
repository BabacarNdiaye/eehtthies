import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { IconButton } from '@/Components/Admin/IconButton';
import { Head, router } from '@inertiajs/react';
import { Inbox, Trash2 } from 'lucide-react';

type ClassMessage = {
    id: number;
    body: string | null;
    attachment_name: string | null;
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
                                {m.body && <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{m.body}</p>}
                                {m.attachment_name && <p className="mt-1 text-sm text-ink-500">📎 {m.attachment_name}</p>}
                                <p className="mt-1 text-xs text-ink-500">{new Date(m.created_at).toLocaleString('fr-FR')}</p>
                            </div>
                            <IconButton
                                onClick={() => destroy(m)}
                                label="Supprimer"
                                tone="danger"
                            >
                                <Trash2 className="h-4 w-4" />
                            </IconButton>
                        </div>
                    ))}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-ink-500">
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
