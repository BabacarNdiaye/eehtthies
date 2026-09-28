import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import StatusBadge from '@/Components/Admin/StatusBadge';
import { Field, Select, Textarea, TextInput } from '@/Components/Admin/Field';
import { Candidature } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Download, FileText, UserPlus } from 'lucide-react';

interface CandidatureDetail extends Candidature {
    academicYear?: { id: number; label: string } | null;
    student_count: number;
}

interface Document {
    id: number;
    name: string;
    url: string;
    size: string;
}

interface Props {
    candidature: CandidatureDetail;
    documents: Document[];
    statuses: Record<string, string>;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-ink-400">
                {label}
            </dt>
            <dd className="mt-0.5 text-sm text-ink-800">{value ?? '—'}</dd>
        </div>
    );
}

export default function Show({ candidature, documents, statuses }: Props) {
    const { data, setData, patch, processing, errors } = useForm({
        status: candidature.status,
        admin_notes: candidature.admin_notes ?? '',
        interview_at: candidature.interview_at
            ? candidature.interview_at.slice(0, 16)
            : '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('admin.candidatures.updateStatus', candidature.id));
    };

    const canConvert =
        candidature.status === 'acceptee' && candidature.student_count === 0;

    const convert = () => {
        if (
            confirm(
                `Transformer ${candidature.first_name} ${candidature.last_name} en élève ? Cette action créera un dossier élève à partir de cette candidature.`,
            )
        ) {
            router.post(route('admin.candidatures.convert', candidature.id));
        }
    };

    return (
        <AdminLayout>
            <Head
                title={`Candidature ${candidature.reference}`}
            />
            <div className="mb-4">
                <Link
                    href={route('admin.candidatures.index')}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour aux candidatures
                </Link>
            </div>
            <PageHeader
                title={`${candidature.first_name} ${candidature.last_name}`}
                subtitle={`Référence ${candidature.reference} — ${candidature.formation?.name ?? 'Formation non renseignée'}`}
            >
                <StatusBadge
                    status={candidature.status}
                    label={statuses[candidature.status]}
                />
            </PageHeader>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-6">
                        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
                            Informations personnelles
                        </h2>
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InfoRow
                                label="Nom complet"
                                value={`${candidature.first_name} ${candidature.last_name}`}
                            />
                            <InfoRow
                                label="Date de naissance"
                                value={
                                    candidature.birth_date
                                        ? new Date(
                                              candidature.birth_date,
                                          ).toLocaleDateString('fr-FR')
                                        : undefined
                                }
                            />
                            <InfoRow
                                label="Genre"
                                value={
                                    candidature.gender === 'M'
                                        ? 'Masculin'
                                        : candidature.gender === 'F'
                                          ? 'Féminin'
                                          : undefined
                                }
                            />
                            <InfoRow label="Téléphone" value={candidature.phone} />
                            <InfoRow label="E-mail" value={candidature.email} />
                            <InfoRow label="Adresse" value={candidature.address} />
                            <InfoRow
                                label="Formation demandée"
                                value={candidature.formation?.name}
                            />
                            <InfoRow
                                label="Année académique"
                                value={candidature.academicYear?.label}
                            />
                            <InfoRow
                                label="Source"
                                value={candidature.source}
                            />
                            <InfoRow
                                label="Soumise le"
                                value={
                                    candidature.submitted_at
                                        ? new Date(
                                              candidature.submitted_at,
                                          ).toLocaleDateString('fr-FR')
                                        : new Date(
                                              candidature.created_at,
                                          ).toLocaleDateString('fr-FR')
                                }
                            />
                        </dl>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
                            Tuteur / responsable
                        </h2>
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InfoRow
                                label="Nom du tuteur"
                                value={candidature.guardian_name}
                            />
                            <InfoRow
                                label="Téléphone du tuteur"
                                value={candidature.guardian_phone}
                            />
                        </dl>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
                            Parcours scolaire
                        </h2>
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InfoRow
                                label="Dernier établissement"
                                value={candidature.last_school}
                            />
                            <InfoRow
                                label="Dernier diplôme"
                                value={candidature.last_diploma}
                            />
                        </dl>
                        {candidature.motivation && (
                            <div className="mt-4">
                                <dt className="text-xs uppercase tracking-wide text-ink-400">
                                    Lettre de motivation
                                </dt>
                                <dd className="mt-1 whitespace-pre-line rounded-lg bg-ink-50 p-4 text-sm text-ink-700">
                                    {candidature.motivation}
                                </dd>
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
                            Documents joints
                        </h2>
                        {documents.length > 0 ? (
                            <ul className="divide-y divide-ink-100">
                                {documents.map((doc) => (
                                    <li
                                        key={doc.id}
                                        className="flex items-center justify-between gap-3 py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 shrink-0 text-ink-400" />
                                            <div>
                                                <p className="text-sm font-medium text-ink-800">
                                                    {doc.name}
                                                </p>
                                                <p className="text-xs text-ink-400">
                                                    {doc.size}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Télécharger
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-ink-400">
                                Aucun document joint à cette candidature.
                            </p>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
                            Gestion du statut
                        </h2>
                        <form onSubmit={submit} className="space-y-4">
                            <Field label="Statut" required error={errors.status}>
                                <Select
                                    value={data.status}
                                    onChange={(e) =>
                                        setData('status', e.target.value)
                                    }
                                >
                                    {Object.entries(statuses).map(
                                        ([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </Select>
                            </Field>
                            <Field
                                label="Entretien programmé le"
                                error={errors.interview_at}
                            >
                                <TextInput
                                    type="datetime-local"
                                    value={data.interview_at}
                                    onChange={(e) =>
                                        setData('interview_at', e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label="Notes internes"
                                error={errors.admin_notes}
                                hint="Notes visibles uniquement par l'administration."
                            >
                                <Textarea
                                    rows={4}
                                    value={data.admin_notes}
                                    onChange={(e) =>
                                        setData('admin_notes', e.target.value)
                                    }
                                />
                            </Field>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                            >
                                Mettre à jour le statut
                            </button>
                        </form>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-2 font-serif text-lg font-bold text-ink-900">
                            Inscription
                        </h2>
                        <p className="mb-4 text-sm text-ink-500">
                            Transformez cette candidature en dossier élève une
                            fois qu'elle est acceptée.
                        </p>
                        {candidature.student_count > 0 ? (
                            <p className="rounded-lg bg-gold-50 px-3 py-2 text-xs font-medium text-gold-800">
                                Cette candidature a déjà été transformée en
                                élève.
                            </p>
                        ) : candidature.status !== 'acceptee' ? (
                            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
                                Le statut doit être « Acceptée » pour pouvoir
                                inscrire le candidat.
                            </p>
                        ) : null}
                        <button
                            type="button"
                            onClick={convert}
                            disabled={!canConvert}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors duration-150 hover:bg-gold-400 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400"
                        >
                            <UserPlus className="h-4 w-4" />
                            Transformer en élève
                        </button>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
