import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Faq } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';

export default function Index({ faqs }: { faqs: Faq[] }) {
    const destroy = async (faq: Faq) => {
        if (await confirmAction('Supprimer cette question ? Cette action est irréversible.')) {
            router.delete(route('admin.faqs.destroy', faq.id));
        }
    };

    const groups = faqs.reduce<Record<string, Faq[]>>((acc, faq) => {
        const key = faq.category ?? 'Sans catégorie';
        acc[key] = acc[key] ?? [];
        acc[key].push(faq);
        return acc;
    }, {});
    const categories = Object.keys(groups);

    return (
        <AdminLayout>
            <Head title="FAQ" />
            <PageHeader
                title="Foire aux questions"
                subtitle="Gérez les questions fréquentes affichées sur le site public."
                action={{ label: 'Nouvelle question', href: route('admin.faqs.create') }}
            />

            {categories.length === 0 && (
                <Card className="p-10 text-center text-ink-500">
                    Aucune question enregistrée pour le moment.
                </Card>
            )}

            <div className="space-y-6">
                {categories.map((category) => (
                    <Card key={category} className="overflow-hidden">
                        <div className="border-b border-ink-100 bg-ink-50 px-5 py-3">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
                                {category}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-5 py-2.5">Question</th>
                                        <th className="px-5 py-2.5">Ordre</th>
                                        <th className="px-5 py-2.5">Statut</th>
                                        <th className="px-5 py-2.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {groups[category].map((faq) => (
                                        <tr key={faq.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                            <td className="max-w-md px-5 py-3 font-medium text-ink-900">
                                                <p className="truncate">{faq.question}</p>
                                            </td>
                                            <td className="px-5 py-3 text-ink-600">{faq.order}</td>
                                            <td className="px-5 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        faq.is_published
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-ink-100 text-ink-500'
                                                    }`}
                                                >
                                                    {faq.is_published ? 'Publié' : 'Brouillon'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <IconLink
                                                        href={route('admin.faqs.edit', faq.id)}
                                                        label="Modifier"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </IconLink>
                                                    <IconButton
                                                        onClick={() => destroy(faq)}
                                                        label="Supprimer"
                                                        tone="danger"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </IconButton>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ))}
            </div>
        </AdminLayout>
    );
}
