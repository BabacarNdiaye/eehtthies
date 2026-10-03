import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Slider } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ImageOff, Pencil, Trash2 } from 'lucide-react';

export default function Index({ sliders }: { sliders: Slider[] }) {
    const destroy = (slider: Slider) => {
        if (
            confirm(
                `Supprimer la slide "${slider.title}" ? Cette action est irréversible.`,
            )
        ) {
            router.delete(route('admin.sliders.destroy', slider.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Diaporama d'accueil" />
            <PageHeader
                title="Diaporama d'accueil"
                subtitle="Gérez les visuels défilants affichés en page d'accueil."
                action={{ label: 'Nouvelle slide', href: route('admin.sliders.create') }}
            />

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Visuel</th>
                                <th className="px-5 py-3">Titre</th>
                                <th className="px-5 py-3">Ordre</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {sliders.map((s) => (
                                <tr key={s.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        {s.image ? (
                                            <img
                                                src={`/storage/${s.image}`}
                                                alt={s.title}
                                                className="h-12 w-20 rounded-md object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-12 w-20 items-center justify-center rounded-md bg-ink-100 text-ink-300">
                                                <ImageOff className="h-5 w-5" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 font-medium text-ink-900">{s.title}</td>
                                    <td className="px-5 py-3 text-ink-600">{s.order}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                s.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-ink-100 text-ink-500'
                                            }`}
                                        >
                                            {s.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={route('admin.sliders.edit', s.id)}
                                                className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => destroy(s)}
                                                className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sliders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-400">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <ImageOff className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucune slide enregistrée pour le moment.</p>
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
