import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Head, Link } from '@inertiajs/react';
import { Inbox, MessageSquare } from 'lucide-react';

type Row = {
    id: number;
    name: string;
    formation: { id: number; name: string } | null;
    messages_count: number;
};

export default function Index({ schoolClasses }: { schoolClasses: Row[] }) {
    return (
        <AdminLayout>
            <Head title="Discussions de classe" />
            <PageHeader
                title="Discussions de classe"
                subtitle="Consultez et modérez les fils de discussion internes à chaque classe (élèves et enseignants)."
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Formation</th>
                                <th className="px-5 py-3">Messages</th>
                                <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {schoolClasses.map((c) => (
                                <tr key={c.id} className="hover:bg-ink-50/60">
                                    <td className="px-5 py-3 font-medium text-ink-900">{c.name}</td>
                                    <td className="px-5 py-3 text-ink-600">{c.formation?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">{c.messages_count}</td>
                                    <td className="px-5 py-3 text-right">
                                        <Link
                                            href={route('admin.class-discussions.show', c.id)}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700 hover:text-gold-700"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5" /> Voir le fil
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {schoolClasses.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune classe.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
