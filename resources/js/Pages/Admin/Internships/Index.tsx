import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import StatusBadge from '@/Components/Admin/StatusBadge';
import { Select } from '@/Components/Admin/Field';
import { IconButton, IconLink } from '@/Components/Admin/IconButton';
import { Internship, Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Download, Inbox, Pencil, Trash2 } from 'lucide-react';

interface Props {
    internships: Paginated<Internship>;
    statuses: Record<string, string>;
    filters: { status?: string };
}

export default function Index({ internships, statuses, filters }: Props) {
    const applyFilters = (overrides: Record<string, string>) => {
        router.get(route('admin.internships.index'), { status: filters.status ?? '', ...overrides }, { preserveState: true, replace: true });
    };

    const destroy = (internship: Internship) => {
        if (confirm(`Supprimer le stage "${internship.title}" ?`)) {
            router.delete(route('admin.internships.destroy', internship.id));
        }
    };

    return (
        <AdminLayout>
            <Head title="Stages des élèves" />
            <PageHeader title="Stages des élèves" subtitle="Suivez les placements en stage et leur évaluation." action={{ label: 'Nouveau stage', href: route('admin.internships.create') }} />

            <Card className="mb-6 p-4">
                <Select aria-label="Filtrer par statut" value={filters.status ?? ''} onChange={(e) => applyFilters({ status: e.target.value })} className="sm:w-56">
                    <option value="">Tous les statuts</option>
                    {Object.entries(statuses).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </Select>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Entreprise</th>
                                <th className="px-5 py-3">Période</th>
                                <th className="px-5 py-3">Évaluation</th>
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {internships.data.map((i) => (
                                <tr key={i.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">
                                            {i.student?.first_name} {i.student?.last_name}
                                        </p>
                                        <p className="text-xs text-ink-500">{i.title}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{i.partner?.name}</td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {new Date(i.start_date).toLocaleDateString('fr-FR')}
                                        {i.end_date ? ` → ${new Date(i.end_date).toLocaleDateString('fr-FR')}` : ''}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{i.evaluation_score != null ? `${i.evaluation_score}/20` : '—'}</td>
                                    <td className="px-5 py-3">
                                        <StatusBadge status={i.status} label={statuses[i.status]} />
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-2">
                                            {i.status === 'termine' && (
                                                <a
                                                    href={route('admin.internships.attestation', i.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-lg p-2 text-ink-500 transition-colors duration-150 hover:bg-ink-100"
                                                    title="Télécharger l'attestation"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            )}
                                            <IconLink href={route('admin.internships.edit', i.id)} label="Modifier">
                                                <Pencil className="h-4 w-4" />
                                            </IconLink>
                                            <IconButton onClick={() => destroy(i)} label="Supprimer" tone="danger">
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {internships.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Inbox className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun stage enregistré.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={internships} />
            </Card>
        </AdminLayout>
    );
}
