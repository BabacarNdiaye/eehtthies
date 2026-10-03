import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Field, Select, Textarea } from '@/Components/Admin/Field';
import { ReportCard, SubjectBreakdown } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Download, ExternalLink, Inbox, Trash2 } from 'lucide-react';

interface Props {
    reportCard: ReportCard;
    subjects: SubjectBreakdown[];
    decisions: Record<string, string>;
    mentions: Record<string, string>;
}

const fmt = (v: number | string | null | undefined) => (v != null ? Number(v).toFixed(2) : '—');

export default function Show({ reportCard, subjects, decisions, mentions }: Props) {
    const { data, setData, patch, processing, errors } = useForm({
        decision: reportCard.decision,
        mention: reportCard.mention ?? '',
        general_appreciation: reportCard.general_appreciation ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('admin.report-cards.update', reportCard.id), { preserveScroll: true });
    };

    const togglePublish = () => {
        router.patch(route('admin.report-cards.publish', reportCard.id), {}, { preserveScroll: true });
    };

    const destroy = () => {
        if (confirm(`Supprimer le bulletin de ${reportCard.student?.first_name} ${reportCard.student?.last_name} (${reportCard.term}) ? Cette action est irréversible.`)) {
            router.delete(route('admin.report-cards.destroy', reportCard.id));
        }
    };

    const verifyUrl = route('bulletins.verify', reportCard.qr_token);

    return (
        <AdminLayout>
            <Head title={`Bulletin — ${reportCard.student?.first_name} ${reportCard.student?.last_name}`} />
            <PageHeader
                title={`Bulletin de ${reportCard.student?.first_name} ${reportCard.student?.last_name}`}
                subtitle={`${reportCard.school_class?.name ?? ''} · ${reportCard.academic_year?.label ?? ''} · ${reportCard.term}`}
            >
                <a
                    href={route('admin.report-cards.pdf', reportCard.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                    <Download className="h-4 w-4" /> Télécharger le PDF
                </a>
                <button
                    onClick={destroy}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4" /> Supprimer
                </button>
            </PageHeader>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="overflow-hidden">
                        <div className="border-b border-ink-100 p-5">
                            <h2 className="font-serif text-lg font-semibold text-ink-900">Relevé de notes par matière</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                    <tr>
                                        <th className="px-4 py-3">Matière</th>
                                        <th className="px-3 py-3 text-center">Devoir</th>
                                        <th className="px-3 py-3 text-center">Comp.</th>
                                        <th className="px-3 py-3 text-center">Moy/20</th>
                                        <th className="px-3 py-3 text-center">Coef</th>
                                        <th className="px-3 py-3 text-center">Moy X</th>
                                        <th className="px-3 py-3 text-center">Rang</th>
                                        <th className="px-4 py-3">Appréciation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {subjects.map((s) => (
                                        <tr key={s.subject_id}>
                                            <td className="px-4 py-2.5 font-medium text-ink-900">{s.subject}</td>
                                            <td className="px-3 py-2.5 text-center text-ink-600">{fmt(s.devoir)}</td>
                                            <td className="px-3 py-2.5 text-center text-ink-600">{fmt(s.composition)}</td>
                                            <td className="px-3 py-2.5 text-center font-semibold text-ink-900">{fmt(s.moy20)}</td>
                                            <td className="px-3 py-2.5 text-center text-ink-600">{s.coefficient}</td>
                                            <td className="px-3 py-2.5 text-center text-ink-600">{fmt(s.moyx)}</td>
                                            <td className="px-3 py-2.5 text-center text-ink-600">
                                                {s.rank ? `${s.rank}/${s.class_size}` : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-ink-500">{s.appreciation ?? '—'}</td>
                                        </tr>
                                    ))}
                                    {subjects.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-8 text-center">
                                                <div className="flex flex-col items-center gap-3 text-ink-400">
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                                                        <Inbox className="h-6 w-6" />
                                                    </span>
                                                    <p className="text-sm">Aucune note publiée pour cette période.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 font-serif text-lg font-semibold text-ink-900">Décision & mention</h2>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Décision" required error={errors.decision}>
                                    <Select
                                        value={data.decision}
                                        onChange={(e) => setData('decision', e.target.value as typeof data.decision)}
                                    >
                                        {Object.entries(decisions).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field label="Mention du conseil de classe" error={errors.mention}>
                                    <Select value={data.mention} onChange={(e) => setData('mention', e.target.value)}>
                                        <option value="">Aucune</option>
                                        {Object.entries(mentions).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            </div>
                            <Field label="Observations du conseil des professeurs" error={errors.general_appreciation}>
                                <Textarea
                                    rows={3}
                                    value={data.general_appreciation}
                                    onChange={(e) => setData('general_appreciation', e.target.value)}
                                />
                            </Field>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                            >
                                Enregistrer
                            </button>
                        </form>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 text-center">
                        <p className="text-xs uppercase tracking-wide text-ink-400">Moyenne générale</p>
                        <p className="mt-1 font-serif text-4xl font-bold text-ink-900">{fmt(reportCard.average)}</p>
                        <p className="mt-4 text-xs uppercase tracking-wide text-ink-400">Rang</p>
                        <p className="mt-1 text-lg font-semibold text-ink-700">
                            {reportCard.rank ? `${reportCard.rank} / ${reportCard.class_size}` : '—'}
                        </p>
                        <p className="mt-4 text-xs uppercase tracking-wide text-ink-400">Moyenne de la classe</p>
                        <p className="mt-1 text-sm text-ink-600">{fmt(reportCard.class_average)}</p>
                    </Card>

                    {(reportCard.previous_term_average != null || reportCard.annual_average != null) && (
                        <Card className="p-6">
                            <h3 className="mb-3 font-serif text-base font-bold text-ink-900">Comparaison des semestres</h3>
                            <dl className="space-y-2 text-sm">
                                {reportCard.previous_term_average != null && (
                                    <div className="flex justify-between">
                                        <dt className="text-ink-500">Moyenne 1er semestre</dt>
                                        <dd className="font-medium text-ink-900">{fmt(reportCard.previous_term_average)}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <dt className="text-ink-500">Moyenne 2ème semestre</dt>
                                    <dd className="font-medium text-ink-900">{fmt(reportCard.average)}</dd>
                                </div>
                                {reportCard.annual_average != null && (
                                    <>
                                        <div className="flex justify-between border-t border-ink-100 pt-2">
                                            <dt className="text-ink-500">Moyenne annuelle</dt>
                                            <dd className="font-semibold text-ink-900">{fmt(reportCard.annual_average)}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-ink-500">Rang annuel</dt>
                                            <dd className="font-medium text-ink-900">
                                                {reportCard.annual_rank ? `${reportCard.annual_rank} / ${reportCard.class_size}` : '—'}
                                            </dd>
                                        </div>
                                    </>
                                )}
                            </dl>
                        </Card>
                    )}

                    <Card className="p-6">
                        <h3 className="mb-3 font-serif text-base font-bold text-ink-900">Assiduité</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-ink-500">Retards</dt>
                                <dd className="font-medium text-ink-900">{reportCard.retard_count ?? 0}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-ink-500">Absences</dt>
                                <dd className="font-medium text-ink-900">{reportCard.absence_count ?? 0}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-ink-500">Dont non justifiées</dt>
                                <dd className="font-medium text-ink-900">{reportCard.unjustified_absence_count ?? 0}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card className="p-6">
                        <h3 className="mb-3 font-serif text-base font-bold text-ink-900">Publication</h3>
                        <p className="mb-4 text-sm text-ink-500">
                            {reportCard.is_published
                                ? 'Ce bulletin est publié et vérifiable via son QR code.'
                                : "Ce bulletin n'est pas encore publié."}
                        </p>
                        <button
                            onClick={togglePublish}
                            className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${
                                reportCard.is_published
                                    ? 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                                    : 'bg-gold-500 text-ink-900 hover:bg-gold-400'
                            }`}
                        >
                            {reportCard.is_published ? 'Dépublier' : 'Publier le bulletin'}
                        </button>
                        {reportCard.is_published && (
                            <a
                                href={verifyUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold-700 hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" /> Voir la page de vérification
                            </a>
                        )}
                    </Card>

                    <Card className="p-6">
                        <Link
                            href={route('admin.report-cards.index')}
                            className="text-sm font-medium text-ink-500 hover:text-ink-800"
                        >
                            ← Retour à la liste des bulletins
                        </Link>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
