import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import Pagination from '@/Components/Admin/Pagination';
import { Field, Select } from '@/Components/Admin/Field';
import { IconLink } from '@/Components/Admin/IconButton';
import { Paginated, ReportCard, SchoolClass } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Award, CheckSquare, Download, Eye, Square, Trash2 } from 'lucide-react';

interface Props {
    reportCards: Paginated<ReportCard>;
    schoolClasses: SchoolClass[];
    academicYears: { id: number; label: string }[];
    terms: string[];
    decisions: Record<string, string>;
    filters: { school_class_id?: string | number; term?: string };
}

const decisionStyles: Record<string, string> = {
    admis: 'bg-emerald-100 text-emerald-700',
    redouble: 'bg-red-100 text-red-700',
    exclu: 'bg-red-200 text-red-800',
    rattrapage: 'bg-purple-100 text-purple-700',
    non_defini: 'bg-ink-100 text-ink-500',
};

export default function Index({ reportCards, schoolClasses, academicYears, terms, decisions, filters }: Props) {
    const generateForm = useForm({
        school_class_id: '' as number | '',
        academic_year_id: '' as number | '',
        term: terms[0] ?? '',
    });

    const applyFilters = (overrides: Record<string, string>) => {
        router.get(
            route('admin.report-cards.index'),
            { school_class_id: filters.school_class_id ?? '', term: filters.term ?? '', ...overrides },
            { preserveState: true, replace: true },
        );
    };

    const submitGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        generateForm.post(route('admin.report-cards.generate'), { preserveScroll: true });
    };

    const togglePublish = (reportCard: ReportCard) => {
        router.patch(route('admin.report-cards.publish', reportCard.id), {}, { preserveScroll: true });
    };

    const destroy = (reportCard: ReportCard) => {
        if (confirm(`Supprimer le bulletin de ${reportCard.student?.first_name} ${reportCard.student?.last_name} (${reportCard.term}) ? Cette action est irréversible.`)) {
            router.delete(route('admin.report-cards.destroy', reportCard.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Bulletins" />
            <PageHeader
                title="Bulletins"
                subtitle="Générez les bulletins de notes par classe et par période, avec calcul automatique des moyennes et du rang."
            />

            <Card className="mb-6 p-6">
                <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Générer les bulletins d'une classe</h2>
                <form onSubmit={submitGenerate} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
                    <Field label="Classe" required error={generateForm.errors.school_class_id}>
                        <Select
                            value={generateForm.data.school_class_id}
                            onChange={(e) =>
                                generateForm.setData(
                                    'school_class_id',
                                    e.target.value ? Number(e.target.value) : '',
                                )
                            }
                        >
                            <option value="">Sélectionner...</option>
                            {schoolClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Année académique" required error={generateForm.errors.academic_year_id}>
                        <Select
                            value={generateForm.data.academic_year_id}
                            onChange={(e) =>
                                generateForm.setData(
                                    'academic_year_id',
                                    e.target.value ? Number(e.target.value) : '',
                                )
                            }
                        >
                            <option value="">Sélectionner...</option>
                            {academicYears.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {y.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Période" required error={generateForm.errors.term}>
                        <Select value={generateForm.data.term} onChange={(e) => generateForm.setData('term', e.target.value)}>
                            {terms.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <button
                        type="submit"
                        disabled={generateForm.processing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-gold-400 disabled:opacity-50"
                    >
                        <Award className="h-4 w-4" /> Générer
                    </button>
                </form>
                <p className="mt-3 text-xs text-ink-500">
                    Le calcul se base sur les notes des épreuves publiées pour la classe, l'année et la période sélectionnées.
                    Relancer la génération met à jour les bulletins existants.
                </p>
            </Card>

            <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Select
                    aria-label="Filtrer par classe"
                    value={filters.school_class_id ?? ''}
                    onChange={(e) => applyFilters({ school_class_id: e.target.value })}
                    className="sm:w-64"
                >
                    <option value="">Toutes les classes</option>
                    {schoolClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </Select>
                <Select
                    aria-label="Filtrer par période"
                    value={filters.term ?? ''}
                    onChange={(e) => applyFilters({ term: e.target.value })}
                    className="sm:w-56"
                >
                    <option value="">Toutes les périodes</option>
                    {terms.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </Select>
                {filters.school_class_id && filters.term ? (
                    <a
                        href={route('admin.report-cards.export-zip', { school_class_id: filters.school_class_id, term: filters.term })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 sm:ml-auto"
                    >
                        <Download className="h-4 w-4" /> Télécharger tout (ZIP)
                    </a>
                ) : (
                    <span className="text-xs text-ink-500 sm:ml-auto">
                        Sélectionnez une classe et une période pour télécharger tous les bulletins publiés en une fois.
                    </span>
                )}
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                            <tr>
                                <th className="px-5 py-3">Élève</th>
                                <th className="px-5 py-3">Classe</th>
                                <th className="px-5 py-3">Période</th>
                                <th className="px-5 py-3">Moyenne</th>
                                <th className="px-5 py-3">Rang</th>
                                <th className="px-5 py-3">Décision</th>
                                <th className="px-5 py-3">Publié</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {reportCards.data.map((rc) => (
                                <tr key={rc.id} className="transition-colors duration-150 hover:bg-ink-50/60">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">
                                            {rc.student?.first_name} {rc.student?.last_name}
                                        </p>
                                        <p className="text-xs text-ink-500">{rc.student?.matricule}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">{rc.school_class?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-ink-600">{rc.term}</td>
                                    <td className="px-5 py-3 font-medium text-ink-900">
                                        {rc.average != null ? Number(rc.average).toFixed(2) : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-ink-600">
                                        {rc.rank ? `${rc.rank}/${rc.class_size}` : '—'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${decisionStyles[rc.decision]}`}
                                        >
                                            {decisions[rc.decision]}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <button
                                            onClick={() => togglePublish(rc)}
                                            title={rc.is_published ? 'Dépublier' : 'Publier'}
                                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                                rc.is_published ? 'text-emerald-600' : 'text-ink-400'
                                            }`}
                                        >
                                            {rc.is_published ? (
                                                <CheckSquare className="h-4 w-4" />
                                            ) : (
                                                <Square className="h-4 w-4" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex justify-end gap-1">
                                            <IconLink
                                                href={route('admin.report-cards.show', rc.id)}
                                                label="Consulter"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </IconLink>
                                            <button
                                                onClick={() => destroy(rc)}
                                                title="Supprimer"
                                                className="rounded-lg p-2 text-red-500 transition-colors duration-150 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reportCards.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-3 text-ink-500">
                                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                <Award className="h-6 w-6" />
                                            </span>
                                            <p className="text-sm">Aucun bulletin généré pour le moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination data={reportCards} />
            </Card>
        </AdminLayout>
    );
}
