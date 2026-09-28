import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Formation } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Inbox, Pencil, Trash2 } from 'lucide-react';

export default function Index({ formations }: { formations: Formation[] }) {
    const destroy = (formation: Formation) => {
        if (
            confirm(
                `Supprimer la formation "${formation.name}" ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.formations.destroy', formation.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Formations" />
            <PageHeader
                title="Formations"
                subtitle="Gérez l'offre de formation de l'école."
                action={{ label: 'Nouvelle formation', href: route('admin.formations.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Formation</th>
                                <th className="px-5 py-3">Diplôme</th>
                                <th className="px-5 py-3">Durée</th>
                                <th className="px-5 py-3">Élèves</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {formations.map((f) => (
                                <tr key={f.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{f.name}</p>
                                        <p className="text-xs text-ink-500">{f.code}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{f.diploma ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">{f.duration ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">{f.students_count ?? 0}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                f.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {f.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={route('admin.formations.edit', f.id)}
                                                className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => destroy(f)}
                                                className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {formations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune formation enregistrée.</p>
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
