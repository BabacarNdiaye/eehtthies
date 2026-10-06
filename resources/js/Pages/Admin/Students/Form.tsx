import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Checkbox, Field, Select, TextInput, Textarea } from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { ReportCard, Student, StudentDocument } from '@/types';
import { confirmAction } from '@/lib/confirm';
import { Head, router, useForm } from '@inertiajs/react';
import { Archive, Download, FileCheck, GraduationCap, IdCard, KeyRound, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

type ArchivedReportCard = ReportCard & {
    academic_year?: { id: number; label: string } | null;
    decision: string | null;
    is_published: boolean;
    generated_at: string | null;
};

interface Props {
    student?: Student;
    /** Formation, classe et année proposées à un nouvel élève ajouté depuis une promotion (vide sinon). */
    defaults?: { formation_id?: number; school_class_id?: number; academic_year_id?: number };
    formations: { id: number; name: string }[];
    schoolClasses: { id: number; name: string; formation_id: number | null }[];
    academicYears: { id: number; label: string }[];
    documentTypes: Record<string, string>;
    reportCards: ArchivedReportCard[];
}

const statusOptions: { value: Student['status']; label: string }[] = [
    { value: 'actif', label: 'Actif' },
    { value: 'suspendu', label: 'Suspendu' },
    { value: 'abandon', label: 'Abandon' },
    { value: 'diplome', label: 'Diplômé' },
    { value: 'transfere', label: 'Transféré' },
    { value: 'exclu', label: 'Exclu' },
];

export default function Form({
    student,
    defaults,
    formations,
    schoolClasses,
    academicYears,
    documentTypes,
    reportCards,
}: Props) {
    const isEdit = !!student;

    const { data, setData, post, put, processing, errors } = useForm({
        matricule: student?.matricule ?? '',
        first_name: student?.first_name ?? '',
        last_name: student?.last_name ?? '',
        birth_date: student?.birth_date ?? '',
        birth_place: student?.birth_place ?? '',
        gender: student?.gender ?? '',
        address: student?.address ?? '',
        phone: student?.phone ?? '',
        email: student?.email ?? '',
        formation_id: student?.formation_id ?? defaults?.formation_id ?? '',
        school_class_id: student?.school_class_id ?? defaults?.school_class_id ?? '',
        academic_year_id: student?.academic_year_id ?? defaults?.academic_year_id ?? '',
        guardian_name: student?.guardian_name ?? '',
        guardian_phone: student?.guardian_phone ?? '',
        guardian_email: student?.guardian_email ?? '',
        emergency_contact: student?.emergency_contact ?? '',
        blood_group: student?.blood_group ?? '',
        allergies: student?.allergies ?? '',
        chronic_conditions: student?.chronic_conditions ?? '',
        current_medication: student?.current_medication ?? '',
        health_insurance: student?.health_insurance ?? '',
        doctor_name: student?.doctor_name ?? '',
        doctor_phone: student?.doctor_phone ?? '',
        health_notes: student?.health_notes ?? '',
        status: student?.status ?? 'actif',
        is_repeating: student?.is_repeating ?? false,
        graduation_year: student?.graduation_year ?? '',
        current_position: student?.current_position ?? '',
        current_employer: student?.current_employer ?? '',
        linkedin_url: student?.linkedin_url ?? '',
        alumni_bio: student?.alumni_bio ?? '',
        is_alumni_public: student?.is_alumni_public ?? false,
    });

    const filteredClasses = useMemo(() => {
        if (!data.formation_id) return schoolClasses;
        return schoolClasses.filter(
            (c) => c.formation_id === Number(data.formation_id),
        );
    }, [schoolClasses, data.formation_id]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.students.update', student!.id));
        } else {
            post(route('admin.students.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? "Modifier l'élève" : 'Nouvel élève'} />
            <PageHeader
                title={isEdit ? "Modifier l'élève" : 'Nouvel élève'}
                subtitle="Renseignez les informations du dossier de l'élève."
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Matricule" required error={errors.matricule}>
                        <TextInput
                            value={data.matricule}
                            onChange={(e) =>
                                setData('matricule', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Statut" required error={errors.status}>
                        <Select
                            value={data.status}
                            onChange={(e) =>
                                setData(
                                    'status',
                                    e.target.value as Student['status'],
                                )
                            }
                        >
                            {statusOptions.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-700">
                        <input
                            type="checkbox"
                            checked={data.is_repeating}
                            onChange={(e) => setData('is_repeating', e.target.checked)}
                            className="rounded border-ink-300 text-gold-700 focus:ring-gold-500"
                        />
                        Élève redoublant(e) cette année
                    </label>
                    <Field label="Prénom" required error={errors.first_name}>
                        <TextInput
                            value={data.first_name}
                            onChange={(e) =>
                                setData('first_name', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Nom" required error={errors.last_name}>
                        <TextInput
                            value={data.last_name}
                            onChange={(e) =>
                                setData('last_name', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Date de naissance" error={errors.birth_date}>
                        <TextInput
                            type="date"
                            value={data.birth_date ?? ''}
                            onChange={(e) =>
                                setData('birth_date', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Lieu de naissance" error={errors.birth_place}>
                        <TextInput
                            value={data.birth_place ?? ''}
                            onChange={(e) =>
                                setData('birth_place', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Genre" error={errors.gender}>
                        <Select
                            value={data.gender ?? ''}
                            onChange={(e) =>
                                setData(
                                    'gender',
                                    e.target.value as 'M' | 'F' | '',
                                )
                            }
                        >
                            <option value="">Non renseigné</option>
                            <option value="M">Masculin</option>
                            <option value="F">Féminin</option>
                        </Select>
                    </Field>
                    <Field label="Téléphone" error={errors.phone}>
                        <TextInput
                            value={data.phone ?? ''}
                            onChange={(e) => setData('phone', e.target.value)}
                        />
                    </Field>
                    <Field label="E-mail personnel" error={errors.email}>
                        <TextInput
                            type="email"
                            value={data.email ?? ''}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </Field>
                    {isEdit && (
                        <Field label="E-mail professionnel" hint="Généré automatiquement, utilisé pour l'accès à l'espace élève.">
                            <TextInput type="email" value={student?.professional_email ?? ''} disabled className="bg-ink-50 text-ink-500" />
                        </Field>
                    )}
                    <div className="sm:col-span-2">
                        <Field label="Adresse" error={errors.address}>
                            <Textarea
                                rows={2}
                                value={data.address ?? ''}
                                onChange={(e) =>
                                    setData('address', e.target.value)
                                }
                            />
                        </Field>
                    </div>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field label="Formation" error={errors.formation_id}>
                        <Select
                            value={data.formation_id ?? ''}
                            onChange={(e) => {
                                setData('formation_id', e.target.value);
                                setData('school_class_id', '');
                            }}
                        >
                            <option value="">Aucune</option>
                            {formations.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Classe" error={errors.school_class_id}>
                        <Select
                            value={data.school_class_id ?? ''}
                            onChange={(e) =>
                                setData('school_class_id', e.target.value)
                            }
                        >
                            <option value="">Aucune</option>
                            {filteredClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field
                        label="Année académique"
                        error={errors.academic_year_id}
                    >
                        <Select
                            value={data.academic_year_id ?? ''}
                            onChange={(e) =>
                                setData('academic_year_id', e.target.value)
                            }
                        >
                            <option value="">Aucune</option>
                            {academicYears.map((y) => (
                                <option key={y.id} value={y.id}>
                                    {y.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <Field
                        label="Nom du tuteur"
                        error={errors.guardian_name}
                    >
                        <TextInput
                            value={data.guardian_name ?? ''}
                            onChange={(e) =>
                                setData('guardian_name', e.target.value)
                            }
                        />
                    </Field>
                    <Field
                        label="Téléphone du tuteur"
                        error={errors.guardian_phone}
                    >
                        <TextInput
                            value={data.guardian_phone ?? ''}
                            onChange={(e) =>
                                setData('guardian_phone', e.target.value)
                            }
                        />
                    </Field>
                    <Field
                        label="E-mail du tuteur"
                        error={errors.guardian_email}
                        hint="Utilisé pour créer l'accès à l'espace parent"
                    >
                        <TextInput
                            type="email"
                            value={data.guardian_email ?? ''}
                            onChange={(e) =>
                                setData('guardian_email', e.target.value)
                            }
                        />
                    </Field>
                    <Field
                        label="Contact d'urgence"
                        error={errors.emergency_contact}
                    >
                        <TextInput
                            value={data.emergency_contact ?? ''}
                            onChange={(e) =>
                                setData('emergency_contact', e.target.value)
                            }
                        />
                    </Field>
                </Card>

                <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                    <h2 className="font-serif text-base font-bold text-ink-900 sm:col-span-2">
                        Santé de l'élève
                    </h2>
                    <Field label="Groupe sanguin" error={errors.blood_group}>
                        <TextInput
                            value={data.blood_group ?? ''}
                            onChange={(e) => setData('blood_group', e.target.value)}
                            placeholder="Ex : O+"
                        />
                    </Field>
                    <Field label="Assurance / mutuelle santé" error={errors.health_insurance}>
                        <TextInput
                            value={data.health_insurance ?? ''}
                            onChange={(e) => setData('health_insurance', e.target.value)}
                        />
                    </Field>
                    <Field label="Médecin traitant" error={errors.doctor_name}>
                        <TextInput
                            value={data.doctor_name ?? ''}
                            onChange={(e) => setData('doctor_name', e.target.value)}
                        />
                    </Field>
                    <Field label="Téléphone du médecin" error={errors.doctor_phone}>
                        <TextInput
                            value={data.doctor_phone ?? ''}
                            onChange={(e) => setData('doctor_phone', e.target.value)}
                        />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Allergies" error={errors.allergies}>
                            <Textarea
                                rows={2}
                                value={data.allergies ?? ''}
                                onChange={(e) => setData('allergies', e.target.value)}
                                placeholder="Allergies alimentaires, médicamenteuses..."
                            />
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="Maladies chroniques / antécédents" error={errors.chronic_conditions}>
                            <Textarea
                                rows={2}
                                value={data.chronic_conditions ?? ''}
                                onChange={(e) => setData('chronic_conditions', e.target.value)}
                            />
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="Traitement en cours" error={errors.current_medication}>
                            <Textarea
                                rows={2}
                                value={data.current_medication ?? ''}
                                onChange={(e) => setData('current_medication', e.target.value)}
                            />
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="Autres observations médicales" error={errors.health_notes}>
                            <Textarea
                                rows={2}
                                value={data.health_notes ?? ''}
                                onChange={(e) => setData('health_notes', e.target.value)}
                            />
                        </Field>
                    </div>
                </Card>

                {data.status === 'diplome' && (
                    <Card className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                        <h2 className="font-serif text-base font-bold text-ink-900 sm:col-span-2">Profil ancien élève / alumni</h2>
                        <Field label="Année de sortie" error={errors.graduation_year}>
                            <TextInput
                                type="number"
                                value={data.graduation_year}
                                onChange={(e) => setData('graduation_year', e.target.value ? Number(e.target.value) : '')}
                            />
                        </Field>
                        <Field label="Poste actuel" error={errors.current_position}>
                            <TextInput value={data.current_position} onChange={(e) => setData('current_position', e.target.value)} />
                        </Field>
                        <Field label="Employeur actuel" error={errors.current_employer}>
                            <TextInput value={data.current_employer} onChange={(e) => setData('current_employer', e.target.value)} />
                        </Field>
                        <Field label="Profil LinkedIn" error={errors.linkedin_url}>
                            <TextInput value={data.linkedin_url} onChange={(e) => setData('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Témoignage / parcours" error={errors.alumni_bio}>
                                <Textarea rows={3} value={data.alumni_bio} onChange={(e) => setData('alumni_bio', e.target.value)} />
                            </Field>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
                            <Checkbox checked={data.is_alumni_public} onChange={(e) => setData('is_alumni_public', e.target.checked)} />
                            Afficher dans l'annuaire public des anciens élèves
                        </label>
                    </Card>
                )}

                <FormActions>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50"
                    >
                        {isEdit
                            ? 'Enregistrer les modifications'
                            : "Créer l'élève"}
                    </button>
                </FormActions>
            </form>

            {isEdit && (
                <Card className="mt-6 p-6">
                    <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Accès aux espaces en ligne</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Générez les identifiants de connexion de l'élève et de son tuteur. Un mot de passe temporaire
                        sera affiché après la création.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() =>
                                router.post(route('admin.students.access', student!.id), {}, { preserveScroll: true })
                            }
                            disabled={!data.email}
                            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <KeyRound className="h-4 w-4" /> Générer l'accès élève
                            {student?.user_id ? ' (réinitialiser)' : ''}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    route('admin.students.parentAccess', student!.id),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            disabled={!data.guardian_email}
                            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <KeyRound className="h-4 w-4" /> Générer l'accès parent
                            {student?.parent_user_id ? ' (lier / réinitialiser)' : ''}
                        </button>
                    </div>
                    {!data.email && (
                        <p className="mt-2 text-xs text-ink-500">
                            Renseignez l'e-mail de l'élève ci-dessus pour activer son accès.
                        </p>
                    )}
                </Card>
            )}

            {isEdit && data.status === 'diplome' && (
                <Card className="mt-6 p-6">
                    <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Diplôme</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Génère le diplôme de fin de formation de l'élève au format PDF, prêt à imprimer.
                        {student?.diploma_number && ` N° ${student.diploma_number}.`}
                    </p>
                    <a
                        href={route('admin.students.diploma', student!.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    >
                        <GraduationCap className="h-4 w-4" /> Télécharger le diplôme
                    </a>
                </Card>
            )}

            {isEdit && (
                <Card className="mt-6 p-6">
                    <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Attestation de formation</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Génère une attestation de suivi de formation au format PDF, disponible pour tout élève.
                        {student?.training_attestation_number && ` N° ${student.training_attestation_number}.`}
                    </p>
                    <a
                        href={route('admin.students.attestation', student!.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                    >
                        <FileCheck className="h-4 w-4" /> Télécharger l'attestation
                    </a>
                </Card>
            )}

            {isEdit && reportCards.length > 0 && (
                <Card className="mt-6 p-6">
                    <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Historique des bulletins</h2>
                    <p className="mb-4 text-sm text-ink-500">
                        Tous les bulletins de l'élève, année par année — conservés automatiquement lors d'une
                        passation de classe. Les années précédant l'année académique actuelle de l'élève sont
                        archivées.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                                <tr>
                                    <th className="px-4 py-2">Année académique</th>
                                    <th className="px-4 py-2">Trimestre</th>
                                    <th className="px-4 py-2">Moyenne</th>
                                    <th className="px-4 py-2">Statut</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {reportCards.map((rc) => {
                                    const isArchived = rc.academic_year_id !== student?.academic_year_id;
                                    return (
                                        <tr key={rc.id} className="hover:bg-ink-50/60">
                                            <td className="px-4 py-2 font-medium text-ink-900">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {isArchived && <Archive className="h-3.5 w-3.5 text-ink-400" />}
                                                    {rc.academic_year?.label ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-ink-600">{rc.term}</td>
                                            <td className="px-4 py-2 text-ink-600">{rc.average ?? '—'} / 20</td>
                                            <td className="px-4 py-2 text-ink-600">
                                                {rc.is_published ? 'Publié' : 'Brouillon'}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <a
                                                    href={route('admin.report-cards.pdf', rc.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700 hover:text-gold-700"
                                                >
                                                    <Download className="h-3.5 w-3.5" /> PDF
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {isEdit && (
                <IdCardCard student={student!} />
            )}

            {isEdit && (
                <DocumentsCard student={student!} documentTypes={documentTypes} />
            )}
        </AdminLayout>
    );
}

function IdCardCard({ student }: { student: Student }) {
    const photoForm = useForm({
        photo: null as File | null,
    });

    const submitPhoto = (e: React.FormEvent) => {
        e.preventDefault();
        if (!photoForm.data.photo) return;

        photoForm.post(route('admin.students.photo', student.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => photoForm.reset('photo'),
        });
    };

    return (
        <Card className="mt-6 p-6">
            <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Carte d'étudiant</h2>
            <p className="mb-4 text-sm text-ink-500">
                Photo utilisée sur la carte d'étudiant (badge avec QR code à présenter à l'entrée de l'établissement).
            </p>

            <div className="flex flex-wrap items-start gap-6">
                <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
                    {student.photo ? (
                        <img src={`/storage/${student.photo}`} alt="Photo de l'élève" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-xs text-ink-500">Aucune photo</div>
                    )}
                </div>

                <form onSubmit={submitPhoto} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <Field label="Photo" error={photoForm.errors.photo}>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp"
                                onChange={(e) => photoForm.setData('photo', e.target.files?.[0] ?? null)}
                                className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                            />
                        </Field>
                    </div>
                    <button
                        type="submit"
                        disabled={photoForm.processing || !photoForm.data.photo}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Enregistrer la photo
                    </button>
                </form>
            </div>

            <a
                href={route('admin.students.card', student.id)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
                <IdCard className="h-4 w-4" /> Télécharger la carte
            </a>
        </Card>
    );
}

function DocumentsCard({
    student,
    documentTypes,
}: {
    student: Student;
    documentTypes: Record<string, string>;
}) {
    const upload = useForm({
        type: Object.keys(documentTypes)[0] ?? '',
        title: '',
        file: null as File | null,
    });

    const submitUpload = (e: React.FormEvent) => {
        e.preventDefault();
        upload.post(route('admin.students.documents.store', student.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => upload.reset('title', 'file'),
        });
    };

    const documents = student.documents ?? [];

    return (
        <Card className="mt-6 p-6">
            <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Documents administratifs</h2>
            <p className="mb-4 text-sm text-ink-500">
                Acte de naissance, pièce d'identité, certificat médical, diplômes... (PDF, JPG ou PNG, 5 Mo maximum)
            </p>

            <form onSubmit={submitUpload} className="mb-5 grid grid-cols-1 gap-4 rounded-lg bg-ink-50 p-4 sm:grid-cols-4">
                <Field label="Type" error={upload.errors.type}>
                    <Select value={upload.data.type} onChange={(e) => upload.setData('type', e.target.value)}>
                        {Object.entries(documentTypes).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Titre" error={upload.errors.title}>
                    <TextInput
                        value={upload.data.title}
                        onChange={(e) => upload.setData('title', e.target.value)}
                        placeholder="Ex : Acte de naissance"
                    />
                </Field>
                <Field label="Fichier" error={upload.errors.file}>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => upload.setData('file', e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
                    />
                </Field>
                <div className="flex items-end">
                    <button
                        type="submit"
                        disabled={upload.processing || !upload.data.file || !upload.data.title}
                        className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Ajouter
                    </button>
                </div>
            </form>

            {documents.length === 0 ? (
                <p className="text-sm text-ink-500">Aucun document enregistré pour cet élève.</p>
            ) : (
                <ul className="divide-y divide-ink-100">
                    {documents.map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between py-3">
                            <div>
                                <p className="text-sm font-medium text-ink-800">{doc.title}</p>
                                <p className="text-xs text-ink-500">
                                    {documentTypes[doc.type] ?? doc.type}
                                    {doc.uploader ? ` · Ajouté par ${doc.uploader.name}` : ''}
                                    {' · '}
                                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={route('admin.students.documents.show', [student.id, doc.id])}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                                >
                                    <Download className="h-3.5 w-3.5" /> Ouvrir
                                </a>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (await confirmAction('Supprimer ce document ?')) {
                                            router.delete(
                                                route('admin.students.documents.destroy', [student.id, doc.id]),
                                                { preserveScroll: true },
                                            );
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
