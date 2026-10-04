import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { ContactMessage } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Mail, Trash2 } from 'lucide-react';

export default function Show({ contactMessage }: { contactMessage: ContactMessage }) {
    const destroy = async () => {
        if (await confirmAction(`Supprimer le message de "${contactMessage.name}" ? Cette action est irréversible.`)) {
            router.delete(route('admin.messages.destroy', contactMessage.id), {
                onSuccess: () => router.visit(route('admin.messages.index')),
            });
        }
    };

    return (
        <AdminLayout>
            <Head title={`Message de ${contactMessage.name}`} />
            <PageHeader
                title="Détail du message"
                subtitle="Message reçu via le formulaire de contact du site public."
            >
                <Link
                    href={route('admin.messages.index')}
                    className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                </Link>
            </PageHeader>

            <Card className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 pb-5">
                    <div>
                        <p className="font-serif text-xl font-bold text-ink-900">
                            {contactMessage.subject ?? 'Sans sujet'}
                        </p>
                        <p className="mt-1 text-sm text-ink-500">
                            De <span className="font-medium text-ink-700">{contactMessage.name}</span> ·{' '}
                            {contactMessage.email}
                            {contactMessage.phone && <> · {contactMessage.phone}</>}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                            Reçu le{' '}
                            {new Date(contactMessage.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href={`mailto:${contactMessage.email}${
                                contactMessage.subject
                                    ? `?subject=${encodeURIComponent('Re: ' + contactMessage.subject)}`
                                    : ''
                            }`}
                            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                        >
                            <Mail className="h-4 w-4" />
                            Répondre par e-mail
                        </a>
                        <button
                            onClick={destroy}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                        </button>
                    </div>
                </div>

                <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                    {contactMessage.message}
                </p>
            </Card>
        </AdminLayout>
    );
}
