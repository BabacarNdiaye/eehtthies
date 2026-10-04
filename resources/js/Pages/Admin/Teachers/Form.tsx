import AdminLayout from '@/Layouts/AdminLayout';
import AttachmentsPanel from '@/Components/Admin/AttachmentsPanel';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import {
    Checkbox,
    Field,
    Select,
    Textarea,
    TextInput,
} from '@/Components/Admin/Field';
import FormActions from '@/Components/Admin/FormActions';
import { Teacher } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { KeyRound, Printer } from 'lucide-react';

interface SalaryPaymentRow {
    id: number;
    period_year: number;
    period_month: number;
    amount: number;
    hours_worked: number | null;
    paid_at: string;
    payment_method: string;
}

interface Props {
    teacher?: Teacher & { subjects?: { id: number; name: string }[] };
    subjects: { id: number; name: string }[];
    salaryPayments: SalaryPaymentRow[];
    monthLabels: Record<string, string>;
    paymentMethods: Record<string, string>;
}

function formatFcfa(amount: number) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

const statusOptions: { value: Teacher['status']; label: string }[] = [
    { value: 'actif', label: 'Actif' },
    { value: 'inactif', label: 'Inactif' },
    { value: 'suspendu', label: 'Suspendu' },
];

export default function Form({ teacher, subjects, salaryPayments, monthLabels, paymentMethods }: Props) {
    const isEdit = !!teacher;

    const { data, setData, post, put, processing, errors } = useForm({
        matricule: teacher?.matricule ?? '',
        first_name: teacher?.first_name ?? '',
        last_name: teacher?.last_name ?? '',
        phone: teacher?.phone ?? '',
        email: teacher?.email ?? '',
        address: teacher?.address ?? '',
        specialty: teacher?.specialty ?? '',
        diplomas: teacher?.diplomas ?? '',
        experience_years: teacher?.experience_years ?? '',
        status: teacher?.status ?? 'actif',
        payment_type: teacher?.payment_type ?? 'fixe',
        monthly_salary: teacher?.monthly_salary ?? '',
        hourly_rate: teacher?.hourly_rate ?? '',
        subject_ids: teacher?.subjects?.map((s) => s.id) ?? ([] as number[]),
    });

    const toggleSubject = (id: number) => {
        if (data.subject_ids.includes(id)) {
            setData(
                'subject_ids',
                data.subject_ids.filter((s) => s !== id),
            );
        } else {
            setData('subject_ids', [...data.subject_ids, id]);
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.teachers.update', teacher!.id));
        } else {
            post(route('admin.teachers.store'));
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? "Modifier l'enseignant" : 'Nouvel enseignant'} />
            <PageHeader
                title={isEdit ? "Modifier l'enseignant" : 'Nouvel enseignant'}
                subtitle="Renseignez les informations de l'enseignant."
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
                                    e.target.value as Teacher['status'],
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
                        <Field label="E-mail professionnel" hint="Généré automatiquement, utilisé pour l'accès à l'espace enseignant.">
                            <TextInput type="email" value={teacher?.professional_email ?? ''} disabled className="bg-ink-50 text-ink-500" />
                        </Field>
                    )}
                    <Field label="Spécialité" error={errors.specialty}>
                        <TextInput
                            value={data.specialty ?? ''}
                            onChange={(e) =>
                                setData('specialty', e.target.value)
                            }
                        />
                    </Field>
                    <Field
                        label="Années d'expérience"
                        error={errors.experience_years}
                    >
                        <TextInput
                            type="number"
                            min={0}
                            value={data.experience_years ?? ''}
                            onChange={(e) =>
                                setData('experience_years', e.target.value)
                            }
                        />
                    </Field>
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
                    <div className="sm:col-span-2">
                        <Field label="Diplômes" error={errors.diplomas}>
                            <Textarea
                                rows={3}
                                value={data.diplomas ?? ''}
                                onChange={(e) =>
                                    setData('diplomas', e.target.value)
                                }
                            />
                        </Field>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">Rémunération</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Type de rémunération" required error={errors.payment_type}>
                            <Select
                                value={data.payment_type}
                                onChange={(e) => setData('payment_type', e.target.value as 'fixe' | 'horaire')}
                            >
                                <option value="fixe">Salaire fixe</option>
                                <option value="horaire">Taux horaire</option>
                            </Select>
                        </Field>
                        {data.payment_type === 'fixe' ? (
                            <Field label="Salaire mensuel (FCFA)" error={errors.monthly_salary}>
                                <TextInput
                                    type="number"
                                    min={0}
                                    value={data.monthly_salary ?? ''}
                                    onChange={(e) => setData('monthly_salary', e.target.value)}
                                />
                            </Field>
                        ) : (
                            <Field label="Taux horaire (FCFA / heure)" error={errors.hourly_rate}>
                                <TextInput
                                    type="number"
                                    min={0}
                                    value={data.hourly_rate ?? ''}
                                    onChange={(e) => setData('hourly_rate', e.target.value)}
                                />
                            </Field>
                        )}
                    </div>
                </Card>

                {isEdit && (
                    <Card className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-serif text-lg font-bold text-ink-900">Historique des paiements</h2>
                            <a
                                href={route('admin.salaries.index')}
                                className="text-sm font-medium text-gold-700 hover:underline"
                            >
                                Gérer les salaires →
                            </a>
                        </div>
                        {salaryPayments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs uppercase tracking-wide text-ink-500">
                                        <tr>
                                            <th className="px-3 py-2">Période</th>
                                            <th className="px-3 py-2 text-right">Montant</th>
                                            <th className="px-3 py-2 text-right">Heures</th>
                                            <th className="px-3 py-2">Date de paiement</th>
                                            <th className="px-3 py-2">Mode</th>
                                            <th className="px-3 py-2">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-ink-100">
                                        {salaryPayments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td className="px-3 py-2 font-medium text-ink-900">
                                                    {monthLabels[payment.period_month]} {payment.period_year}
                                                </td>
                                                <td className="px-3 py-2 text-right">{formatFcfa(payment.amount)}</td>
                                                <td className="px-3 py-2 text-right text-ink-500">
                                                    {payment.hours_worked != null ? `${payment.hours_worked}h` : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-ink-500">
                                                    {new Date(payment.paid_at).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-3 py-2 text-ink-500">
                                                    {paymentMethods[payment.payment_method] ?? payment.payment_method}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <a
                                                        href={route('admin.salaries.payslip.teacher', payment.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-gold-700 hover:underline"
                                                    >
                                                        <Printer className="h-3 w-3" /> Bulletin
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-ink-500">Aucun paiement enregistré pour le moment.</p>
                        )}
                    </Card>
                )}

                <Card className="p-6">
                    <h2 className="mb-4 font-serif text-lg font-bold text-ink-900">
                        Matières enseignées
                    </h2>
                    {subjects.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {subjects.map((subject) => (
                                <label
                                    key={subject.id}
                                    className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
                                >
                                    <Checkbox
                                        checked={data.subject_ids.includes(
                                            subject.id,
                                        )}
                                        onChange={() =>
                                            toggleSubject(subject.id)
                                        }
                                    />
                                    {subject.name}
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-ink-500">
                            Aucune matière disponible.
                        </p>
                    )}
                </Card>

                {isEdit && (
                    <Card className="p-6">
                        <h2 className="mb-1 font-serif text-base font-bold text-ink-900">Accès à l'espace enseignant</h2>
                        <p className="mb-4 text-sm text-ink-500">
                            Générez les identifiants de connexion de l'enseignant. Un mot de passe temporaire sera
                            affiché après la création.
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                router.post(route('admin.teachers.access', teacher!.id), {}, { preserveScroll: true })
                            }
                            disabled={!data.email}
                            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <KeyRound className="h-4 w-4" /> Générer l'accès
                            {teacher?.user_id ? ' (réinitialiser)' : ''}
                        </button>
                        {!data.email && (
                            <p className="mt-2 text-xs text-ink-500">
                                Renseignez l'e-mail de l'enseignant ci-dessus pour activer son accès.
                            </p>
                        )}
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
                            : "Créer l'enseignant"}
                    </button>
                </FormActions>
            </form>
            {teacher && (
                <AttachmentsPanel target="teacher" targetId={teacher.id} attachments={teacher.attachments} title="Dossier de l'enseignant" hint="Contrat, CV, diplômes, pièce d'identité (PDF, JPG, PNG, DOC, 5 Mo maximum)." />
            )}
        </AdminLayout>
    );
}
